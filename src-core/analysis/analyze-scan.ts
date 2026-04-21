import type { AppConfig, AppLocale, ScanAnalysis, ScanRecord, SkillSpotlight } from '../types.ts';
import { compareSkillsForAnalysis, getSkillLocalPriority } from './local-priority.ts';

export async function analyzeScanWithModel(scan: ScanRecord, config: AppConfig, responseLanguage: AppLocale = 'en'): Promise<ScanAnalysis> {
  const apiKey = config.apiKey.trim();
  const baseUrl = config.baseUrl.trim().replace(/\/$/, '');
  const model = config.model.trim();

  if (!apiKey || !baseUrl || !model) {
    return {
      status: 'error',
      generatedAt: new Date().toISOString(),
      provider: config.provider || 'openai-compatible',
      model,
      reason: 'missing_config',
      message: 'Model analysis is not configured yet. Add apiKey, baseUrl, and model to enable AI-assisted review.',
    };
  }

  const timeoutMs = Number(config.analysis.timeoutMs || 20000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: buildMessages(scan, config, responseLanguage),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      return {
        status: 'error',
        generatedAt: new Date().toISOString(),
        provider: config.provider || 'openai-compatible',
        model,
        reason: 'http_error',
        message: text.slice(0, 800),
      };
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || '{}';
    const parsed = safeParseJson(content);
    const normalized = normalizeAnalysisOutput(parsed, scan);
    return {
      status: 'completed',
      generatedAt: new Date().toISOString(),
      provider: config.provider || 'openai-compatible',
      model,
      summary: normalized.summary,
      findings: normalized.findings,
      recommendations: normalized.recommendations,
      skillSpotlights: normalized.skillSpotlights,
      raw: {
        usage: data?.usage || null,
      },
    };
  } catch (error) {
    return {
      status: 'error',
      generatedAt: new Date().toISOString(),
      provider: config.provider || 'openai-compatible',
      model,
      reason: error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'request_failed',
      message: error instanceof Error ? error.message : 'Unknown analysis error.',
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function testModelConnection(config: AppConfig): Promise<{ ok: boolean; status: string; message: string; model: string; usage?: unknown }> {
  const apiKey = config.apiKey.trim();
  const baseUrl = config.baseUrl.trim().replace(/\/$/, '');
  const model = config.model.trim();
  if (!apiKey || !baseUrl || !model) {
    return { ok: false, status: 'missing_config', message: 'apiKey, baseUrl, or model is missing.', model };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.analysis.timeoutMs || 20000);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: 'json_object' },
        max_completion_tokens: 40,
        messages: [
          { role: 'system', content: 'Reply with exactly this json object: {"ok":true,"message":"connection-ok"}. Return json only.' },
          { role: 'user', content: 'Connection test. Respond in json.' },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      return { ok: false, status: 'http_error', message: text.slice(0, 400), model };
    }
    const data = await response.json();
    return { ok: true, status: 'connected', message: 'Connection test succeeded.', model, usage: data?.usage || null };
  } catch (error) {
    return {
      ok: false,
      status: error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'request_failed',
      message: error instanceof Error ? error.message : 'Connection test failed.',
      model,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function buildMessages(scan: ScanRecord, config: AppConfig, responseLanguage: AppLocale) {
  const sampleSkills = [...scan.skills]
    .sort(compareSkillsForAnalysis)
    .slice(0, Number(config.analysis.maxSkills || 12))
    .map((skill) => ({
      id: skill.id,
      name: skill.name,
      scope: skill.scope,
      agent: skill.agent,
      description: skill.description,
      triggers: skill.triggers,
      compatibility: skill.compatibility,
      risks: skill.risks,
      issues: skill.issues,
      path: skill.path,
      rootConfidence: skill.rootConfidence,
      localPriority: getSkillLocalPriority(skill),
    }));

  const compactScan = {
    project: scan.project,
    generatedAt: scan.generatedAt,
    summary: scan.summary,
    rootOverview: buildRootOverview(scan),
    configuredRootsSummary: buildConfiguredRootsSummary(scan),
    topRiskSkills: buildTopRiskSkills(scan),
    topConflictTriggers: buildTopConflictTriggers(scan),
    missingMetadataSkills: buildMissingMetadataSkills(scan),
    precedenceHotspots: buildPrecedenceHotspots(scan),
    skills: sampleSkills,
  };

  const exampleInput = {
    project: 'demo-workspace',
    generatedAt: '2026-04-19T00:00:00.000Z',
    summary: {
      skills: 4,
      conflicts: 1,
      highRiskSkills: 1,
    },
    rootOverview: {
      roots: [
        {
          label: 'Codex Project',
          path: '/workspace/demo/.codex/skills',
          scope: 'project',
          agent: 'codex',
          confidence: 'confirmed',
          discoveryMethod: 'known-root',
          skillsCount: 2,
        },
        {
          label: 'Cursor Global',
          path: '/Users/demo/.cursor/skills',
          scope: 'global',
          agent: 'cursor',
          confidence: 'confirmed',
          discoveryMethod: 'known-root',
          skillsCount: 2,
        },
      ],
      byScope: {
        project: 1,
        global: 1,
      },
      byAgent: {
        codex: 1,
        cursor: 1,
      },
      byDiscoveryMethod: {
        'known-root': 2,
      },
    },
    configuredRootsSummary: {
      count: 0,
      roots: [],
    },
    topRiskSkills: [
      {
        skillId: 'deploy-helper',
        name: 'Deploy Helper',
        agent: 'codex',
        scope: 'project',
        priorityScore: 105,
        highRisks: 1,
        mediumRisks: 0,
        lowRisks: 0,
        issues: 0,
        topRiskLabels: ['shell-pipe-exec'],
      },
    ],
    topConflictTriggers: [
      {
        conflictId: 'deploy-release-overlap',
        title: 'deploy release trigger overlap',
        severity: 'medium',
        summary: 'Two skills compete for the same deployment phrase across project and global roots.',
        skills: ['Deploy Helper', 'Deploy Guard'],
      },
    ],
    missingMetadataSkills: [
      {
        skillId: 'deploy-guard',
        name: 'Deploy Guard',
        issueCount: 1,
        issueMessages: ['Trigger metadata is incomplete.'],
      },
    ],
    precedenceHotspots: [
      {
        key: 'deploy-release',
        winnerSkillId: 'deploy-helper',
        winnerName: 'Deploy Helper',
        candidateCount: 2,
        candidateNames: ['Deploy Helper', 'Deploy Guard'],
        reason: 'Project-level skill outranks the global alternative.',
      },
    ],
    skills: [
      {
        id: 'deploy-helper',
        name: 'Deploy Helper',
        scope: 'project',
        agent: 'codex',
        description: 'Handles release deployment steps.',
        triggers: ['deploy release'],
        compatibility: ['codex'],
        risks: [{ severity: 'high', label: 'shell-pipe-exec' }],
        issues: [],
        path: '/workspace/demo/.codex/skills/deploy-helper',
        rootConfidence: 'confirmed',
        localPriority: {
          totalScore: 105,
          riskScore: 100,
          issueScore: 0,
          scopeBonus: 5,
          highRiskCount: 1,
          mediumRiskCount: 0,
          lowRiskCount: 0,
          highIssueCount: 0,
          mediumIssueCount: 0,
          lowIssueCount: 0,
        },
      },
      {
        id: 'deploy-guard',
        name: 'Deploy Guard',
        scope: 'global',
        agent: 'cursor',
        description: 'Checks release readiness.',
        triggers: ['deploy release'],
        compatibility: ['cursor'],
        risks: [],
        issues: [{ severity: 'medium', message: 'Trigger metadata is incomplete.' }],
        path: '/Users/demo/.cursor/skills/deploy-guard',
        rootConfidence: 'confirmed',
        localPriority: {
          totalScore: 14,
          riskScore: 0,
          issueScore: 14,
          scopeBonus: 0,
          highRiskCount: 0,
          mediumRiskCount: 0,
          lowRiskCount: 0,
          highIssueCount: 0,
          mediumIssueCount: 1,
          lowIssueCount: 0,
        },
      },
    ],
  };

  const exampleOutput = {
    summary: responseLanguage === 'zh-CN'
      ? '工作区整体可用，但部署相关技能存在高风险执行模式，并且同一触发词跨根目录重叠，容易导致行为判断不清。'
      : 'The workspace is usable overall, but the deployment skill set mixes a high-risk execution pattern with a cross-root trigger overlap that can make agent behavior hard to predict.',
    findings: responseLanguage === 'zh-CN'
      ? [
          'deploy-helper 包含高风险 shell 执行模式，应优先审查。',
          'deploy release 在项目级和全局级 skill 中重叠，存在优先级歧义。',
          'deploy-guard 的元数据完整性较弱，降低了意图匹配的可靠性。',
        ]
      : [
          'deploy-helper contains a high-risk shell execution pattern and should be reviewed first.',
          'The trigger "deploy release" overlaps across project and global roots, creating precedence ambiguity.',
          'deploy-guard has weaker metadata quality, which reduces intent-matching reliability.',
        ],
    recommendations: responseLanguage === 'zh-CN'
      ? [
          '先移除或约束 deploy-helper 中的高风险命令执行路径。',
          '为重叠触发词建立更清晰的项目级优先规则或直接拆分触发短语。',
          '补全 deploy-guard 的触发词和说明，减少模糊匹配。',
        ]
      : [
          'Remove or tightly constrain the high-risk command path in deploy-helper first.',
          'Define a clearer project-first precedence rule for the overlapping trigger, or split the trigger phrases.',
          'Strengthen deploy-guard metadata so trigger resolution is less ambiguous.',
        ],
    skillSpotlights: responseLanguage === 'zh-CN'
      ? [
          {
            skillId: 'deploy-helper',
            label: '高风险部署入口',
            rationale: '它同时具备最高本地优先级和直接命令执行风险，会显著影响工作区的整体安全边界。',
          },
        ]
      : [
          {
            skillId: 'deploy-helper',
            label: 'High-risk deployment entry point',
            rationale: 'It combines the highest local priority with direct command-execution risk, so it has the strongest effect on the workspace safety boundary.',
          },
        ],
  };

  return [
    {
      role: 'system',
      content: [
        'You are a senior reviewer for coding-agent skill systems.',
        'Your job is to turn a structured skill scan into a concise, operationally useful audit.',
        'Use only the provided scan data. Do not invent missing context, hidden files, or runtime behavior.',
        'Prioritize high-severity risks, override chains, trigger overlap, user-configured roots, missing metadata, precedence hotspots, and skills with the highest localPriority.',
        'Treat localPriority as a ranking hint, not as proof. Use it to focus attention, then justify conclusions from the actual scan fields.',
        'Summary must be 1 to 3 sentences and should explain the overall health of the workspace in plain language.',
        'Each finding must be specific, evidence-based, and short. Prefer concrete statements over generic warnings.',
        'Each recommendation must be actionable, short, and tied to the observed issues. Prefer highest-leverage actions first.',
        'Choose up to 3 skillSpotlights. Spotlight only skills that are unusually risky, conflict-heavy, precedence-sensitive, or structurally important to the scan.',
        'Each spotlight rationale must explain why this skill matters in the context of the workspace, not just repeat its name.',
        'Avoid duplicate findings or recommendations phrased in slightly different words.',
        'Return strict json only.',
        'json keys must be exactly: summary, findings, recommendations, skillSpotlights.',
        'findings and recommendations must be arrays of short strings.',
        'skillSpotlights must be an array of objects with keys skillId, label, rationale.',
        languageInstruction(responseLanguage),
      ].join(' '),
    },
    {
      role: 'user',
      content: [
        'Example scan payload:',
        JSON.stringify(exampleInput),
      ].join(' '),
    },
    {
      role: 'assistant',
      content: JSON.stringify(exampleOutput),
    },
    {
      role: 'user',
      content: [
        'Analyze this workspace scan and respond in json only.',
        languageInstruction(responseLanguage),
        'Use this output contract:',
        '- summary: 1 to 3 sentences',
        '- findings: 2 to 6 concrete findings',
        '- recommendations: 2 to 6 concrete actions',
        '- skillSpotlights: up to 3 items',
        'When choosing findings and recommendations, emphasize what is highest risk, highest impact, or most likely to create confusing agent behavior.',
        'Do not mention data that is absent from the scan.',
        `Scan payload: ${JSON.stringify(compactScan)}`,
      ].join(' '),
    },
  ];
}

function normalizeStringList(value: unknown): string[] {
  return normalizeEvidenceList(value);
}

function normalizeSkillSpotlights(value: unknown, validSkillIds: Set<string>): SkillSpotlight[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  return value
    .map((item) => normalizeSkillSpotlight(item, validSkillIds))
    .filter((item): item is SkillSpotlight => Boolean(item))
    .filter((item) => {
      const key = `${item.skillId}::${normalizeSentenceKey(item.label)}::${normalizeSentenceKey(item.rationale)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 3);
}

function safeParseJson(value: string): Record<string, unknown> {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function languageInstruction(responseLanguage: AppLocale): string {
  return responseLanguage === 'zh-CN'
    ? 'All summary, findings, recommendations, labels, and rationales must be written in Simplified Chinese.'
    : 'All summary, findings, recommendations, labels, and rationales must be written in English.';
}

function buildRootOverview(scan: ScanRecord) {
  return {
    roots: scan.roots.map((root) => ({
      label: root.label,
      path: root.path,
      scope: root.scope,
      agent: root.agent,
      confidence: root.confidence,
      discoveryMethod: root.discoveryMethod,
      skillsCount: root.skillsCount,
    })),
    byScope: countBy(scan.roots, (root) => root.scope),
    byAgent: countBy(scan.roots, (root) => root.agent || 'unknown'),
    byDiscoveryMethod: countBy(scan.roots, (root) => root.discoveryMethod || 'unknown'),
  };
}

function buildConfiguredRootsSummary(scan: ScanRecord) {
  const configuredRoots = scan.roots.filter((root) => root.discoveryMethod === 'user-configured');
  return {
    count: configuredRoots.length,
    roots: configuredRoots.slice(0, 6).map((root) => ({
      label: root.label,
      path: root.path,
      scope: root.scope,
      agent: root.agent,
      confidence: root.confidence,
      skillsCount: root.skillsCount,
    })),
  };
}

function buildTopRiskSkills(scan: ScanRecord) {
  return [...scan.skills]
    .sort(compareSkillsForAnalysis)
    .filter((skill) => skill.risks.length || skill.issues.length)
    .slice(0, 8)
    .map((skill) => {
      const priority = getSkillLocalPriority(skill);
      return {
        skillId: skill.id,
        name: skill.name,
        agent: skill.agent,
        scope: skill.scope,
        priorityScore: priority.totalScore,
        highRisks: skill.risks.filter((risk) => risk.severity === 'high').length,
        mediumRisks: skill.risks.filter((risk) => risk.severity === 'medium').length,
        lowRisks: skill.risks.filter((risk) => risk.severity === 'low').length,
        issues: skill.issues.length,
        topRiskLabels: uniqueStrings(skill.risks.map((risk) => risk.label)).slice(0, 3),
      };
    });
}

function buildTopConflictTriggers(scan: ScanRecord) {
  const skillNames = new Map(scan.skills.map((skill) => [skill.id, skill.name]));
  return scan.conflicts.slice(0, 8).map((conflict) => ({
    conflictId: conflict.id,
    title: conflict.title,
    severity: conflict.severity,
    summary: conflict.summary,
    skills: conflict.skills.map((skillId) => skillNames.get(skillId) || skillId),
  }));
}

function buildMissingMetadataSkills(scan: ScanRecord) {
  return [...scan.skills]
    .filter((skill) => skill.issues.length > 0)
    .sort((left, right) => {
      if (right.issues.length !== left.issues.length) return right.issues.length - left.issues.length;
      return compareSkillsForAnalysis(left, right);
    })
    .slice(0, 8)
    .map((skill) => ({
      skillId: skill.id,
      name: skill.name,
      issueCount: skill.issues.length,
      issueMessages: uniqueStrings(skill.issues.map((issue) => issue.message)).slice(0, 3),
    }));
}

function buildPrecedenceHotspots(scan: ScanRecord) {
  const skillNames = new Map(scan.skills.map((skill) => [skill.id, skill.name]));
  return scan.resolutionChains.slice(0, 8).map((chain) => ({
    key: chain.key,
    winnerSkillId: chain.winnerSkillId,
    winnerName: skillNames.get(chain.winnerSkillId) || chain.winnerSkillId,
    candidateCount: chain.candidates.length,
    candidateNames: uniqueStrings(chain.candidates.map((candidate) => candidate.name)).slice(0, 6),
    reason: chain.reason,
  }));
}

function countBy<T>(items: T[], keyOf: (item: T) => string) {
  return items.reduce<Record<string, number>>((acc, item) => {
    const key = keyOf(item);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function normalizeAnalysisOutput(parsed: Record<string, unknown>, scan: ScanRecord) {
  const validSkillIds = new Set(scan.skills.map((skill) => skill.id));
  const findings = normalizeEvidenceList(parsed.findings, 6);
  const recommendations = normalizeEvidenceList(parsed.recommendations, 6);
  return {
    summary: normalizeSummary(parsed.summary, scan, findings, recommendations),
    findings,
    recommendations,
    skillSpotlights: normalizeSkillSpotlights(parsed.skillSpotlights, validSkillIds),
  };
}

function normalizeSummary(value: unknown, scan: ScanRecord, findings: string[], recommendations: string[]) {
  const summary = `${value || ''}`.replace(/\s+/g, ' ').trim().slice(0, 500);
  if (summary) return summary;

  const workspaceName = scan.project.name || 'workspace';
  const summaryParts = [
    `${workspaceName} contains ${scan.summary.totalSkills} skills across ${scan.summary.rootCount} roots.`,
  ];

  if (scan.summary.highRiskSkills > 0) {
    summaryParts.push(`${scan.summary.highRiskSkills} skill(s) include high-severity local risk signals.`);
  }

  if (scan.summary.conflictCount > 0) {
    summaryParts.push(`${scan.summary.conflictCount} conflict(s) need precedence review.`);
  } else if (findings.length || recommendations.length) {
    summaryParts.push('The analysis completed with actionable follow-up items.');
  }

  return summaryParts.join(' ').trim();
}

function normalizeEvidenceList(value: unknown, limit = 8): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  return value
    .map((item) => `${item || ''}`.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .filter((item) => item.length >= 12)
    .filter((item) => !isGenericLowSignalLine(item))
    .filter((item) => {
      const key = normalizeSentenceKey(item);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

function normalizeSkillSpotlight(value: unknown, validSkillIds: Set<string>): SkillSpotlight | null {
  const item = value as Record<string, unknown> | null;
  const skillId = `${item?.skillId || ''}`.trim();
  const label = `${item?.label || ''}`.replace(/\s+/g, ' ').trim().slice(0, 120);
  const rationale = `${item?.rationale || ''}`.replace(/\s+/g, ' ').trim().slice(0, 240);

  if (!skillId || !validSkillIds.has(skillId) || !label || !rationale) {
    return null;
  }

  if (isGenericLowSignalLine(rationale)) {
    return null;
  }

  return { skillId, label, rationale };
}

function isGenericLowSignalLine(value: string) {
  const normalized = normalizeSentenceKey(value);
  return [
    'further review is recommended',
    'further investigation is recommended',
    'there are some potential issues',
    'there may be some issues',
    'the workspace should be reviewed',
    'some improvements are needed',
    'consider reviewing this carefully',
  ].includes(normalized);
}

function normalizeSentenceKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function uniqueStrings(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const normalized = value.trim();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}
