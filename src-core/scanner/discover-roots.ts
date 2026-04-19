import type { Dirent } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { AppConfig, RootCandidate } from '../types.ts';
import { exists } from '../storage/fs-utils.ts';

export async function discoverRoots(input: { projectDir: string; homeDir: string; config: AppConfig }): Promise<RootCandidate[]> {
  const candidates = [
    ...buildKnownCandidates(input.projectDir, input.homeDir, input.config),
    ...buildConfiguredCandidates(input.projectDir, input.homeDir, input.config),
  ];
  const seenPaths = new Set(candidates.map((candidate) => candidate.path));
  const fallbackCandidates = input.config.scan.enableFallbackDiscovery
    ? await discoverFallbackCandidates(input.projectDir, input.homeDir, seenPaths)
    : [];
  const roots: RootCandidate[] = [];

  for (const candidate of [...candidates, ...fallbackCandidates]) {
    roots.push({
      ...candidate,
      exists: await exists(candidate.path),
    });
  }

  return roots;
}

function buildConfiguredCandidates(projectDir: string, homeDir: string, config: AppConfig): RootCandidate[] {
  return [...new Set((config.scan.extraRoots || []).map((item) => path.resolve(item.trim())).filter(Boolean))].map((rootPath) => ({
    label: `${labelForAgent(inferAgentFromPath(rootPath))} Custom`,
    path: rootPath,
    scope: inferScope(rootPath, projectDir, homeDir),
    agent: inferAgentFromPath(rootPath),
    confidence: 'confirmed',
    discoveryMethod: 'user-configured',
    exists: false,
  }));
}

function buildKnownCandidates(projectDir: string, homeDir: string, config: AppConfig): RootCandidate[] {
  const projectCandidates: RootCandidate[] = config.scan.includeProjectRoots === false ? [] : [
    { label: 'Codex Project', path: path.join(projectDir, '.codex/skills'), scope: 'project', agent: 'codex', confidence: 'confirmed', discoveryMethod: 'well-known-path', exists: false },
    { label: 'Claude Project', path: path.join(projectDir, '.claude/skills'), scope: 'project', agent: 'claude', confidence: 'candidate', discoveryMethod: 'well-known-path', exists: false },
    { label: 'Agents Project', path: path.join(projectDir, '.agents/skills'), scope: 'project', agent: 'generic', confidence: 'candidate', discoveryMethod: 'well-known-path', exists: false },
    { label: 'Copilot Project', path: path.join(projectDir, '.copilot/skills'), scope: 'project', agent: 'copilot', confidence: 'candidate', discoveryMethod: 'well-known-path', exists: false },
    { label: 'Cursor Project', path: path.join(projectDir, '.cursor/skills'), scope: 'project', agent: 'cursor', confidence: 'candidate', discoveryMethod: 'well-known-path', exists: false },
    { label: 'GitHub Project', path: path.join(projectDir, '.github/skills'), scope: 'project', agent: 'github', confidence: 'candidate', discoveryMethod: 'well-known-path', exists: false },
  ];
  const globalCandidates: RootCandidate[] = config.scan.includeGlobalRoots === false ? [] : [
    { label: 'Codex Global', path: path.join(homeDir, '.codex/skills'), scope: 'global', agent: 'codex', confidence: 'confirmed', discoveryMethod: 'well-known-path', exists: false },
    { label: 'Claude Global', path: path.join(homeDir, '.claude/skills'), scope: 'global', agent: 'claude', confidence: 'candidate', discoveryMethod: 'well-known-path', exists: false },
    { label: 'Agents Global', path: path.join(homeDir, '.agents/skills'), scope: 'global', agent: 'generic', confidence: 'candidate', discoveryMethod: 'well-known-path', exists: false },
    { label: 'Copilot Global', path: path.join(homeDir, '.copilot/skills'), scope: 'global', agent: 'copilot', confidence: 'candidate', discoveryMethod: 'well-known-path', exists: false },
    { label: 'Cursor Global', path: path.join(homeDir, '.cursor/skills'), scope: 'global', agent: 'cursor', confidence: 'candidate', discoveryMethod: 'well-known-path', exists: false },
    { label: 'GitHub Global', path: path.join(homeDir, '.github/skills'), scope: 'global', agent: 'github', confidence: 'candidate', discoveryMethod: 'well-known-path', exists: false },
  ];
  return [...globalCandidates, ...projectCandidates];
}

async function discoverFallbackCandidates(projectDir: string, homeDir: string, seenPaths: Set<string>): Promise<RootCandidate[]> {
  const fallbacks: RootCandidate[] = [];
  const directories = [
    { baseDir: projectDir, scope: 'project' as const },
    { baseDir: homeDir, scope: 'global' as const },
  ];

  for (const target of directories) {
    let entries: Dirent[];
    try {
      entries = await fs.readdir(target.baseDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory() || !entry.name.startsWith('.')) continue;
      const agent = inferAgent(entry.name);
      if (!agent) continue;
      const candidatePath = path.join(target.baseDir, entry.name, 'skills');
      if (seenPaths.has(candidatePath)) continue;
      seenPaths.add(candidatePath);
      fallbacks.push({
        label: `${labelForAgent(agent)} ${capitalize(target.scope)} Fallback`,
        path: candidatePath,
        scope: target.scope,
        agent,
        confidence: 'inferred',
        discoveryMethod: 'hidden-dir-fallback',
        exists: false,
      });
    }
  }

  return fallbacks;
}

function inferAgent(dirName: string): string {
  if (dirName === '.codex') return 'codex';
  if (dirName === '.claude') return 'claude';
  if (dirName === '.agents') return 'generic';
  if (dirName === '.copilot') return 'copilot';
  if (dirName === '.cursor') return 'cursor';
  if (dirName === '.github') return 'github';
  return '';
}

function inferAgentFromPath(rootPath: string): string {
  const lower = rootPath.toLowerCase();
  if (lower.includes(`${path.sep}.codex${path.sep}`)) return 'codex';
  if (lower.includes(`${path.sep}.claude${path.sep}`)) return 'claude';
  if (lower.includes(`${path.sep}.copilot${path.sep}`)) return 'copilot';
  if (lower.includes(`${path.sep}.cursor${path.sep}`)) return 'cursor';
  if (lower.includes(`${path.sep}.github${path.sep}`)) return 'github';
  if (lower.includes(`${path.sep}.agents${path.sep}`)) return 'generic';
  return 'generic';
}

function inferScope(rootPath: string, projectDir: string, homeDir: string): 'project' | 'global' {
  const resolved = path.resolve(rootPath);
  if (resolved === projectDir || resolved.startsWith(`${projectDir}${path.sep}`)) return 'project';
  if (resolved === homeDir || resolved.startsWith(`${homeDir}${path.sep}`)) return 'global';
  return 'global';
}

function labelForAgent(agent: string): string {
  if (agent === 'codex') return 'Codex';
  if (agent === 'claude') return 'Claude';
  if (agent === 'copilot') return 'Copilot';
  if (agent === 'cursor') return 'Cursor';
  if (agent === 'github') return 'GitHub';
  return 'Agents';
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
