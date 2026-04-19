import type { Dirent } from 'node:fs';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { analyzeScanWithModel } from '../analysis/analyze-scan.ts';
import { getSkillLocalPriority } from '../analysis/local-priority.ts';
import type { AppConfig, AppLocale, ConflictRecord, ResolutionChain, RootCandidate, ScanRecord, ScanSummary, SkillRecord, SkillRisk } from '../types.ts';
import { exists, safeRead } from '../storage/fs-utils.ts';
import { discoverRoots } from './discover-roots.ts';

export async function buildScan(input: { projectDir: string; homeDir: string; config: AppConfig; scannerVersion?: string; analysisLanguage?: AppLocale }): Promise<ScanRecord> {
  const scannerVersion = input.scannerVersion || '0.2.0';
  const discoveredRoots = await discoverRoots({ projectDir: input.projectDir, homeDir: input.homeDir, config: input.config });
  const existingRoots: RootCandidate[] = [];
  const skills: SkillRecord[] = [];

  for (const root of discoveredRoots) {
    if (!root.exists || !(await exists(root.path))) continue;
    const skillDirs = await findSkillDirs(root.path, input.config.scan.maxDepth ?? 5);
    existingRoots.push({ ...root, skillsCount: skillDirs.length });
    for (const dir of skillDirs) {
      skills.push(await collectSkill(dir, root));
    }
  }

  const conflicts = detectConflicts(skills);
  const resolutionChains = buildResolutionChains(skills);
  const summary = summarize(skills, conflicts, existingRoots);
  const generatedAt = new Date().toISOString();

  const scan: ScanRecord = {
    id: createScanId(generatedAt, input.projectDir),
    generatedAt,
    project: {
      name: path.basename(input.projectDir),
      path: input.projectDir,
    },
    scannedProject: input.projectDir,
    scanner: {
      version: scannerVersion,
      rootsStrategy: 'known-paths-plus-fallbacks',
    },
    config: {
      provider: input.config.provider || '',
      baseUrl: input.config.baseUrl || '',
      model: input.config.model || '',
    },
    roots: existingRoots,
    rootCandidates: discoveredRoots,
    summary,
    conflicts,
    resolutionChains,
    skills: skills.sort((a, b) => b.precedence - a.precedence || a.name.localeCompare(b.name)),
    analysis: {
      status: 'skipped',
      generatedAt,
      provider: input.config.provider || '',
      model: input.config.model || '',
      reason: 'not_started',
    },
  };

  scan.analysis = await analyzeScanWithModel(scan, input.config, input.analysisLanguage || 'en');
  return scan;
}

async function collectSkill(skillDir: string, root: RootCandidate): Promise<SkillRecord> {
  const files = await listFiles(skillDir, 4);
  const skillFile = path.join(skillDir, 'SKILL.md');
  const content = await safeRead(skillFile);
  const parsed = parseSkillMarkdown(content, skillDir);
  const compatibility = inferCompatibility(root, content, files);
  const risks: SkillRisk[] = [];

  for (const relativeFile of files) {
    if (!shouldScanFile(relativeFile)) continue;
    const absoluteFile = path.join(skillDir, relativeFile);
    const text = await safeRead(absoluteFile);
    if (!text) continue;
    risks.push(...scanRisks(relativeFile, text));
  }

  const scope = skillDir.includes(`${path.sep}.system${path.sep}`) ? 'system' : root.scope;
  const precedence = computePrecedence(root, scope);
  const key = normalizeName(parsed.name || path.basename(skillDir));

  return {
    id: `${root.agent}:${key}:${createStableId(skillDir)}`,
    groupKey: `${root.agent}:${key}`,
    name: parsed.name || path.basename(skillDir),
    description: parsed.description,
    triggers: parsed.triggers,
    scope,
    agent: root.agent,
    path: skillDir,
    precedence,
    files,
    compatibility,
    risks,
    issues: parsed.issues,
    localPriority: getSkillLocalPriority({ risks, issues: parsed.issues, scope }),
    rootConfidence: root.confidence,
    discoveryMethod: root.discoveryMethod,
  };
}

function detectConflicts(skills: SkillRecord[]): ConflictRecord[] {
  const conflicts: ConflictRecord[] = [];
  const grouped = groupBy(skills, (skill) => skill.groupKey);

  for (const [groupKey, groupSkills] of grouped.entries()) {
    if (groupSkills.length < 2) continue;
    const sorted = [...groupSkills].sort((a, b) => b.precedence - a.precedence);
    conflicts.push({
      id: `override:${groupKey}`,
      type: 'override',
      severity: sorted.some((item) => item.scope === 'project') && sorted.some((item) => item.scope === 'global') ? 'medium' : 'high',
      title: `${sorted[0].name} exists in multiple locations`,
      summary: `The same normalized skill appears ${sorted.length} times. Only the highest-precedence version is likely to win, which can hide older global or system definitions.`,
      skills: sorted.map((item) => item.id),
      suggestedFix: 'Rename the lower-priority skill or consolidate the behavior into one canonical definition.',
    });
  }

  const triggerMap = new Map<string, SkillRecord[]>();
  for (const skill of skills) {
    for (const trigger of skill.triggers) {
      const key = `${skill.agent}:${trigger.toLowerCase()}`;
      if (!triggerMap.has(key)) triggerMap.set(key, []);
      triggerMap.get(key)!.push(skill);
    }
  }

  for (const [trigger, triggerSkills] of triggerMap.entries()) {
    const uniqueKeys = new Set(triggerSkills.map((item) => item.groupKey));
    if (uniqueKeys.size < 2) continue;
    conflicts.push({
      id: `trigger:${trigger}`,
      type: 'trigger-overlap',
      severity: 'medium',
      title: `Trigger overlap on "${trigger.split(':')[1]}"`,
      summary: 'Different skills expose the same trigger phrase. Agents may load the wrong skill or produce unstable routing decisions.',
      skills: triggerSkills.map((item) => item.id),
      suggestedFix: 'Make trigger phrases more specific, or scope them to project-only workflows.',
    });
  }

  return conflicts;
}

function buildResolutionChains(skills: SkillRecord[]): ResolutionChain[] {
  const grouped = groupBy(skills, (skill) => skill.groupKey);
  return [...grouped.entries()]
    .filter(([, groupSkills]) => groupSkills.length > 1)
    .map(([key, groupSkills]) => {
      const candidates = [...groupSkills].sort((a, b) => b.precedence - a.precedence);
      const winner = candidates[0];
      return {
        key,
        name: winner.name,
        winnerSkillId: winner.id,
        reason: buildResolutionReason(winner, candidates.slice(1)),
        candidates: candidates.map((item) => ({
          id: item.id,
          name: item.name,
          scope: item.scope,
          agent: item.agent,
          path: item.path,
          confidence: item.rootConfidence,
          discoveryMethod: item.discoveryMethod,
        })),
      };
    });
}

function summarize(skills: SkillRecord[], conflicts: ConflictRecord[], roots: RootCandidate[]): ScanSummary {
  return {
    totalSkills: skills.length,
    projectSkills: skills.filter((item) => item.scope === 'project').length,
    globalSkills: skills.filter((item) => item.scope === 'global').length,
    systemSkills: skills.filter((item) => item.scope === 'system').length,
    highRiskSkills: skills.filter((item) => item.risks.some((risk) => risk.severity === 'high')).length,
    conflictCount: conflicts.length,
    rootCount: roots.length,
  };
}

function parseSkillMarkdown(text: string, skillDir: string): { name: string; description: string; triggers: string[]; issues: Array<{ severity: 'high' | 'low'; message: string }> } {
  const issues: Array<{ severity: 'high' | 'low'; message: string }> = [];
  if (!text) {
    return {
      name: path.basename(skillDir),
      description: 'Missing SKILL.md content.',
      triggers: [],
      issues: [{ severity: 'high', message: 'SKILL.md is empty or unreadable.' }],
    };
  }
  const explicitName = cleanValue(matchLine(text, /^name:\s*(.+)$/im));
  const headingName = cleanValue(matchLine(text, /^#\s+(.+)$/m));
  const explicitDescription = cleanValue(matchLine(text, /^description:\s*(.+)$/im));
  const paragraphDescription = cleanValue(
    text.split(/\r?\n/).map((line) => line.trim()).find((line) => line && !line.startsWith('#') && !line.startsWith('name:') && !line.startsWith('description:') && !line.startsWith('triggers:') && !line.startsWith('|')) || '',
  );
  const triggers = extractTriggers(text);
  if (!triggers.length) issues.push({ severity: 'low', message: 'No trigger phrases detected.' });

  return {
    name: explicitName || headingName || path.basename(skillDir),
    description: explicitDescription || paragraphDescription || 'No description found.',
    triggers,
    issues,
  };
}

function extractTriggers(text: string): string[] {
  const section = text.match(/triggers:\s*([\s\S]*?)(?:\n\n|$)/im)?.[1] ?? '';
  const items = [...section.matchAll(/[-*]\s+"?([^"\n]+)"?/g)].map((match) => cleanValue(match[1])).filter(Boolean);
  return [...new Set(items)].slice(0, 8);
}

function inferCompatibility(root: RootCandidate, content: string, files: string[]): string[] {
  const compatibility = new Set([root.agent]);
  const lower = `${content}\n${files.join('\n')}`.toLowerCase();
  if (lower.includes('openclaw')) compatibility.add('openclaw');
  if (lower.includes('claude code')) compatibility.add('claude');
  if (lower.includes('codex')) compatibility.add('codex');
  if (lower.includes('copilot')) compatibility.add('copilot');
  if (lower.includes('gemini')) compatibility.add('gemini-cli');
  if (lower.includes('cursor')) compatibility.add('cursor');
  if (lower.includes('github')) compatibility.add('github');
  return [...compatibility];
}

function computePrecedence(root: RootCandidate, scope: 'project' | 'global' | 'system'): number {
  if (scope === 'system') return 100;

  const normalizedRoot = normalizeRootPath(root.path);
  if (scope === 'project') {
    if (normalizedRoot.endsWith('/.agents/skills')) return 320;
    if (root.agent === 'openclaw' && normalizedRoot.endsWith('/skills')) return 330;
    return 300;
  }

  if (normalizedRoot.endsWith('/.agents/skills')) return 220;
  if (root.agent === 'openclaw' && normalizedRoot.endsWith('/.openclaw/skills')) return 210;
  return 200;
}

function buildResolutionReason(winner: SkillRecord, losers: SkillRecord[]): string {
  if (!losers.length) {
    return `Precedence ${winner.precedence} selects the visible ${winner.agent} definition.`;
  }
  const lowerBands = [...new Set(losers.map((item) => `${item.scope} (${item.precedence})`))].join(', ');
  return `${winner.scope} precedence (${winner.precedence}) outranks ${lowerBands} for the ${winner.agent} resolver.`;
}

function shouldScanFile(relativeFile: string): boolean {
  const lower = relativeFile.toLowerCase();
  if (lower.includes('/assets/')) return false;
  if (lower.includes('license')) return false;
  const ext = path.extname(lower);
  return ['.md', '.txt', '.sh', '.js', '.mjs', '.cjs', '.ts', '.py', '.json', '.yaml', '.yml', '.toml'].includes(ext);
}

function scanRisks(file: string, text: string): SkillRisk[] {
  const rules = [
    { id: 'curl-pipe-shell', label: 'Downloads piped directly into a shell', severity: 'high' as const, pattern: /(curl|wget)[^\n|]*\|\s*(sh|bash|zsh)/i },
    { id: 'sudo', label: 'Requests elevated execution with sudo', severity: 'high' as const, pattern: /\bsudo\b/i },
    { id: 'destructive-rm', label: 'Potentially destructive file deletion', severity: 'high' as const, pattern: /rm\s+-rf/i },
    { id: 'shell-exec', label: 'Spawns shell commands or subprocesses', severity: 'medium' as const, pattern: /(execSync|spawn\(|child_process|subprocess|os\.system|bash\s+-c|zsh\s+-c|sh\s+-c)/i },
    { id: 'network-fetch', label: 'Pulls remote content or calls external services', severity: 'medium' as const, pattern: /(https?:\/\/|fetch\(|axios\.|requests\.|curl\s|wget\s)/i },
    { id: 'secret-env', label: 'Reads API keys or tokens from the environment', severity: 'low' as const, pattern: /(API_KEY|TOKEN|SECRET|OPENAI_|ANTHROPIC_|AWS_SECRET_ACCESS_KEY)/i },
  ];
  return rules.filter((rule) => rule.pattern.test(text)).map((rule) => ({ file, id: rule.id, label: rule.label, severity: rule.severity }));
}

async function findSkillDirs(rootDir: string, maxDepth: number): Promise<string[]> {
  const results: string[] = [];
  await walk(rootDir, async (dir, entries) => {
    if (entries.some((entry) => entry.isFile() && entry.name === 'SKILL.md')) {
      results.push(dir);
      return false;
    }
    return true;
  }, maxDepth);
  return results;
}

async function walk(dir: string, visitor: (dir: string, entries: Dirent[]) => Promise<boolean>, depth: number): Promise<void> {
  if (depth < 0) return;
  let entries: Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  const shouldDescend = await visitor(dir, entries);
  if (!shouldDescend) return;
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name === 'node_modules' || entry.name.startsWith('.git')) continue;
    await walk(path.join(dir, entry.name), visitor, depth - 1);
  }
}

async function listFiles(rootDir: string, depth: number): Promise<string[]> {
  const files: string[] = [];
  await walk(rootDir, async (dir, entries) => {
    const relativeDir = path.relative(rootDir, dir);
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const relative = path.join(relativeDir, entry.name).replace(/^\.\//, '');
      files.push(relative === '' ? entry.name : relative);
    }
    return true;
  }, depth);
  return files.sort();
}

function groupBy<T>(items: T[], selector: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = selector(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return map;
}

function normalizeName(name: string): string {
  return cleanValue(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function matchLine(text: string, pattern: RegExp): string {
  return text.match(pattern)?.[1]?.trim() || '';
}

function cleanValue(value: string): string {
  if (!value) return '';
  return value.trim().replace(/^['"`]+|['"`]+$/g, '');
}

function normalizeRootPath(value: string): string {
  return path.resolve(value).replace(/\\/g, '/');
}

function createStableId(value: string): string {
  return createHash('sha1').update(normalizeRootPath(value)).digest('hex').slice(0, 12);
}

function createScanId(generatedAt: string, projectDir: string): string {
  const timestamp = generatedAt.replace(/[:.]/g, '-');
  const name = path.basename(projectDir).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project';
  return `${timestamp}--${name}`;
}
