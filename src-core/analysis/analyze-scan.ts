import type { AppConfig, AppLocale, ConclusionPrompt, ConclusionPromptSet, ScanAnalysis, ScanRecord, SkillSpotlight } from '../types.ts';
import { compareSkillsForAnalysis, getSkillLocalPriority } from './local-priority.ts';

type AnalysisProgressEvent =
  | { phase: 'core_started' }
  | { phase: 'core_completed'; analysis: Pick<ScanAnalysis, 'summary' | 'findings' | 'recommendations' | 'skillSpotlights'> }
  | { phase: 'prompts_started' }
  | { phase: 'prompts_completed'; conclusionPrompts: ConclusionPromptSet }
  | { phase: 'prompts_fallback'; message: string; conclusionPrompts: ConclusionPromptSet };

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

  return analyzeScanWithProgress(scan, config, responseLanguage);
}

export async function analyzeScanWithProgress(
  scan: ScanRecord,
  config: AppConfig,
  responseLanguage: AppLocale = 'en',
  onProgress?: (event: AnalysisProgressEvent) => void,
): Promise<ScanAnalysis> {
  const provider = config.provider || 'openai-compatible';
  const apiKey = config.apiKey.trim();
  const baseUrl = config.baseUrl.trim().replace(/\/$/, '');
  const model = config.model.trim();
  if (!apiKey || !baseUrl || !model) {
    return {
      status: 'error',
      generatedAt: new Date().toISOString(),
      provider,
      model,
      reason: 'missing_config',
      message: 'Model analysis is not configured yet. Add apiKey, baseUrl, and model to enable AI-assisted review.',
    };
  }
  const timeoutMs = Number(config.analysis.timeoutMs || 20000);
  const generatedAt = new Date().toISOString();

  onProgress?.({ phase: 'core_started' });
  const coreResult = await requestModelJson(config, buildCoreAnalysisMessages(scan, config, responseLanguage), {
    timeoutMs,
    temperature: 0.2,
  });

  if (!coreResult.ok) {
    return {
      status: 'error',
      generatedAt,
      provider,
      model,
      reason: coreResult.reason,
      message: coreResult.message,
    };
  }

  const normalizedCore = normalizeCoreAnalysisOutput(safeParseJson(coreResult.content), scan);
  onProgress?.({
    phase: 'core_completed',
    analysis: {
      summary: normalizedCore.summary,
      findings: normalizedCore.findings,
      recommendations: normalizedCore.recommendations,
      skillSpotlights: normalizedCore.skillSpotlights,
    },
  });

  onProgress?.({ phase: 'prompts_started' });
  const promptsResult = await requestModelJson(
    config,
    buildConclusionPromptMessages(scan, normalizedCore, responseLanguage),
    {
      timeoutMs,
      temperature: 0.2,
    },
  );

  let conclusionPrompts: ConclusionPromptSet;
  let promptPhaseReason: string | undefined;
  let promptPhaseMessage: string | undefined;
  let promptUsage: unknown = null;

  if (promptsResult.ok) {
    conclusionPrompts = normalizeConclusionPrompts(
      safeParseJson(promptsResult.content),
      scan,
      normalizedCore.findings,
      normalizedCore.recommendations,
      responseLanguage,
    );
    promptUsage = promptsResult.usage || null;
    onProgress?.({ phase: 'prompts_completed', conclusionPrompts });
  } else {
    conclusionPrompts = createFallbackConclusionPrompts(scan, responseLanguage, normalizedCore);
    promptPhaseReason = promptsResult.reason;
    promptPhaseMessage = promptsResult.message;
    onProgress?.({
      phase: 'prompts_fallback',
      message: promptsResult.message,
      conclusionPrompts,
    });
  }

  return {
    status: 'completed',
    generatedAt,
    provider,
    model,
    summary: normalizedCore.summary,
    findings: normalizedCore.findings,
    recommendations: normalizedCore.recommendations,
    skillSpotlights: normalizedCore.skillSpotlights,
    conclusionPrompts,
    raw: {
      usage: {
        core: coreResult.usage || null,
        prompts: promptUsage,
        promptPhaseReason,
        promptPhaseMessage,
      },
    },
  };
}

async function requestModelJson(
  config: AppConfig,
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options: { timeoutMs: number; temperature: number; maxCompletionTokens?: number },
): Promise<
  | { ok: true; content: string; usage?: unknown }
  | { ok: false; reason: 'timeout' | 'request_failed' | 'http_error'; message: string }
> {
  const apiKey = config.apiKey.trim();
  const baseUrl = config.baseUrl.trim().replace(/\/$/, '');
  const model = config.model.trim();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: options.temperature,
        response_format: { type: 'json_object' },
        ...(options.maxCompletionTokens ? { max_completion_tokens: options.maxCompletionTokens } : {}),
        messages,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      return {
        ok: false,
        reason: 'http_error',
        message: text.slice(0, 800),
      };
    }

    const data = await response.json();
    return {
      ok: true,
      content: data?.choices?.[0]?.message?.content || '{}',
      usage: data?.usage || null,
    };
  } catch (error) {
    const failure = normalizeRequestFailure(error, options.timeoutMs, {
      timeout: `Model analysis timed out after ${formatTimeoutSeconds(options.timeoutMs)}. Increase Analysis timeout ms or use a faster model/provider endpoint.`,
      fallback: 'Model analysis failed.',
    });
    return {
      ok: false,
      reason: failure.reason,
      message: failure.message,
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
    const failure = normalizeRequestFailure(error, timeoutMs, {
      timeout: `Connection test timed out after ${formatTimeoutSeconds(timeoutMs)}. Increase Analysis timeout ms or use a faster model/provider endpoint.`,
      fallback: 'Connection test failed.',
    });
    return {
      ok: false,
      status: failure.reason,
      message: failure.message,
      model,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeRequestFailure(
  error: unknown,
  timeoutMs: number,
  messages: { timeout: string; fallback: string },
): { reason: 'timeout' | 'request_failed'; message: string } {
  if (error instanceof Error && error.name === 'AbortError') {
    return {
      reason: 'timeout',
      message: messages.timeout,
    };
  }

  return {
    reason: 'request_failed',
    message: error instanceof Error && error.message ? error.message : messages.fallback,
  };
}

function formatTimeoutSeconds(timeoutMs: number): string {
  const seconds = timeoutMs / 1000;
  return Number.isInteger(seconds) ? `${seconds}s` : `${seconds.toFixed(1)}s`;
}

function buildCoreAnalysisMessages(
  scan: ScanRecord,
  config: AppConfig,
  responseLanguage: AppLocale,
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
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

function buildConclusionPromptMessages(
  scan: ScanRecord,
  analysis: Pick<ScanAnalysis, 'summary' | 'findings' | 'recommendations' | 'skillSpotlights'>,
  responseLanguage: AppLocale,
) {
  const payload = {
    project: scan.project,
    generatedAt: scan.generatedAt,
    summary: scan.summary,
    topRiskSkills: buildTopRiskSkills(scan),
    topConflictTriggers: buildTopConflictTriggers(scan),
    precedenceHotspots: buildPrecedenceHotspots(scan),
    analysis,
  };

  const exampleOutput = responseLanguage === 'zh-CN'
    ? {
        contentOptimization: {
          title: 'Skill 内容优化 Prompt',
          intent: '给另一个模型使用，让它基于扫描结果优化 skill 内容结构与指令质量。',
          prompt: '你是资深 agent skill 架构师。请根据以下扫描结论，重写高风险和重叠 skill，优化描述、trigger、边界条件、约束、防护和输出格式，并返回修改后的 skill 草案与修改理由。',
        },
        priorityOptimization: {
          title: 'Skill 权重优化 Prompt',
          intent: '给另一个模型使用，让它基于扫描结果优化 skill 权重、优先级、拆分和合并策略。',
          prompt: '你是资深 agent skill 架构师。请根据以下扫描结论，判断哪些 skill 应提升、降低、拆分、合并或调整 precedence，减少 trigger 重叠与隐藏覆盖，并返回具体排序建议和依据。',
        },
      }
    : {
        contentOptimization: {
          title: 'Skill Content Optimization Prompt',
          intent: 'Use this with another model to improve the structure and instruction quality of skill content from the scan.',
          prompt: 'You are a senior agent-skill architect. Use the scan findings below to rewrite risky and overlapping skills, improve descriptions, triggers, boundaries, guardrails, and output contracts, then return revised skill drafts and rationale for each change.',
        },
        priorityOptimization: {
          title: 'Skill Priority Optimization Prompt',
          intent: 'Use this with another model to optimize skill weighting, precedence, split, and merge decisions from the scan.',
          prompt: 'You are a senior agent-skill architect. Use the scan findings below to determine which skills should move up, move down, split, merge, or change precedence, reduce trigger overlap and hidden overrides, then return concrete ordering changes with rationale.',
        },
      };

  return [
    {
      role: 'system' as const,
      content: [
        'You are a senior reviewer for coding-agent skill systems.',
        'Your task is to turn a completed scan analysis into two reusable optimization prompts.',
        'Use only the provided scan and analysis data.',
        'Return strict json only.',
        'json keys must be exactly: contentOptimization, priorityOptimization.',
        'Each prompt object must have keys title, intent, prompt.',
        'Each prompt must be a practical multi-step prompt that another model can execute directly.',
        languageInstruction(responseLanguage),
      ].join(' '),
    },
    {
      role: 'assistant' as const,
      content: JSON.stringify(exampleOutput),
    },
    {
      role: 'user' as const,
      content: [
        'Generate reusable optimization prompts from this scan analysis.',
        languageInstruction(responseLanguage),
        `Scan and analysis payload: ${JSON.stringify(payload)}`,
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

function normalizeCoreAnalysisOutput(parsed: Record<string, unknown>, scan: ScanRecord) {
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

export function createFallbackConclusionPrompts(
  scan: ScanRecord,
  responseLanguage: AppLocale = 'en',
  analysisInput?: Pick<ScanAnalysis, 'summary' | 'findings' | 'recommendations' | 'skillSpotlights'> | null,
): ConclusionPromptSet {
  const topSkills = [...scan.skills]
    .sort(compareSkillsForAnalysis)
    .slice(0, 5)
    .map((skill) => {
      const priority = getSkillLocalPriority(skill);
      return {
        name: skill.name,
        scope: skill.scope,
        agent: skill.agent,
        path: skill.path,
        triggers: skill.triggers.slice(0, 4),
        highRiskCount: skill.risks.filter((risk) => risk.severity === 'high').length,
        issueCount: skill.issues.length,
        priorityScore: priority.totalScore,
      };
    });
  const conflictSummary = scan.conflicts.slice(0, 5).map((conflict) => ({
    title: conflict.title,
    severity: conflict.severity,
    summary: conflict.summary,
    suggestedFix: conflict.suggestedFix,
  }));
  const chainSummary = scan.resolutionChains.slice(0, 5).map((chain) => ({
    key: chain.key,
    winnerSkillId: chain.winnerSkillId,
    reason: chain.reason,
    candidates: chain.candidates.map((candidate) => ({
      name: candidate.name,
      scope: candidate.scope,
      agent: candidate.agent,
    })),
  }));
  const spotlightSummary = analysisInput?.skillSpotlights?.slice(0, 3) ?? [];
  const findings = analysisInput?.findings?.slice(0, 6) ?? [];
  const recommendations = analysisInput?.recommendations?.slice(0, 6) ?? [];
  const summary = analysisInput?.summary || normalizeSummary('', scan, findings, recommendations);

  if (responseLanguage === 'zh-CN') {
    return {
      contentOptimization: {
        title: 'Skill 内容优化 Prompt',
        intent: '将当前扫描结果转成可直接交给模型执行的 skill 内容优化任务。',
        prompt: [
          '你是资深 coding-agent skill 架构师。请根据下面这份 skill doctor 扫描结论，产出一份专注于 skill 内容优化的方案。',
          '目标：',
          '1. 重写 skill 的 name、description、triggers、边界条件、操作约束、防护规则和输出格式。',
          '2. 优先修复高风险、触发词模糊、说明不完整、边界不清晰的 skill。',
          '3. 让 skill 文案更具体、更可执行、更不容易误触发。',
          '',
          '请基于以下扫描数据工作，不要虚构仓库外信息：',
          JSON.stringify({
            project: scan.project,
            summary: scan.summary,
            analysisSummary: summary,
            findings,
            recommendations,
            skillSpotlights: spotlightSummary,
            topSkills,
            conflicts: conflictSummary,
            precedenceChains: chainSummary,
          }, null, 2),
          '',
          '请按以下结构输出：',
          'A. 内容问题总览：先指出最影响可读性、可执行性和安全边界的 3 个问题。',
          'B. Skill 内容改写建议：按优先级列出需要重写或补强的 skill，并解释原因。',
          'C. 修订示例：至少给出 2 个更优的 skill 草案片段，包含 name、description、triggers、关键约束。',
          'D. 内容设计原则：总结后续编写 skill 时应遵守的规则。',
          '',
          '要求：',
          '- 每条建议必须结合扫描中的风险、冲突、触发词或元数据问题。',
          '- 输出要偏工程化，不要泛泛而谈。',
        ].join('\n'),
      },
      priorityOptimization: {
        title: 'Skill 权重优化 Prompt',
        intent: '将当前扫描结果转成可直接交给模型执行的 skill 权重与优先级优化任务。',
        prompt: [
          '你是资深 coding-agent skill 架构师。请根据下面这份 skill doctor 扫描结论，产出一份专注于 skill 权重、优先级、拆分和合并的优化方案。',
          '目标：',
          '1. 判断哪些 skill 应提升、降低、拆分、合并或调整 precedence。',
          '2. 减少 trigger 重叠、跨 scope 隐藏覆盖、以及高风险 skill 获得过高优先级的情况。',
          '3. 让优先级体系更稳定、更可解释、更符合实际调用意图。',
          '',
          '请基于以下扫描数据工作，不要虚构仓库外信息：',
          JSON.stringify({
            project: scan.project,
            summary: scan.summary,
            analysisSummary: summary,
            findings,
            recommendations,
            skillSpotlights: spotlightSummary,
            topSkills,
            conflicts: conflictSummary,
            precedenceChains: chainSummary,
          }, null, 2),
          '',
          '请按以下结构输出：',
          'A. 优先级问题总览：先指出最影响稳定性和路由清晰度的 3 个问题。',
          'B. 权重/优先级调整建议：明确哪些 skill 应上调、下调、拆分或合并，并说明依据。',
          'C. 冲突修复建议：针对 trigger overlap 和 override 给出优先级层面的处理方案。',
          'D. 执行顺序：给出建议的调整顺序，优先处理最高风险和最高冲突项。',
          '',
          '要求：',
          '- 如果建议调整优先级，必须明确说明当前排序为什么不合理。',
          '- 结论必须结合 scope、precedence、风险和冲突解释。',
          '- 输出要偏工程化，不要泛泛而谈。',
        ].join('\n'),
      },
    };
  }

  return {
    contentOptimization: {
      title: 'Skill Content Optimization Prompt',
      intent: 'Turn the current scan into an execution-ready prompt for improving skill content quality.',
      prompt: [
        'You are a senior coding-agent skill architect. Use the Skill Doctor scan below to produce a content-focused optimization plan.',
        'Goals:',
        '1. Rewrite skill names, descriptions, triggers, boundaries, constraints, guardrails, and output contracts.',
        '2. Prioritize skills that are risky, ambiguous, incomplete, or likely to be triggered incorrectly.',
        '3. Make skill instructions more explicit, operational, and less error-prone.',
        '',
        'Work only from this scan data:',
        JSON.stringify({
          project: scan.project,
          summary: scan.summary,
          analysisSummary: summary,
          findings,
          recommendations,
          skillSpotlights: spotlightSummary,
          topSkills,
          conflicts: conflictSummary,
          precedenceChains: chainSummary,
        }, null, 2),
        '',
        'Return the result in this structure:',
        'A. Content problems overview: identify the 3 most important issues harming readability, execution quality, or safety boundaries.',
        'B. Skill-content changes: list the skills that should be rewritten or strengthened first, with reasons.',
        'C. Revision examples: provide at least 2 improved skill draft snippets including name, description, triggers, and key guardrails.',
        'D. Content design rules: summarize the principles that future skills should follow.',
        '',
        'Requirements:',
        '- Tie every recommendation to scan evidence such as risks, conflicts, triggers, or metadata issues.',
        '- Keep the output operational and engineering-focused, not generic.',
      ].join('\n'),
    },
    priorityOptimization: {
      title: 'Skill Priority Optimization Prompt',
      intent: 'Turn the current scan into an execution-ready prompt for improving skill weighting and precedence decisions.',
      prompt: [
        'You are a senior coding-agent skill architect. Use the Skill Doctor scan below to produce a priority-focused optimization plan.',
        'Goals:',
        '1. Decide which skills should move up, move down, split, merge, or change precedence.',
        '2. Reduce trigger overlap, cross-scope hidden overrides, and cases where high-risk skills hold excessive priority.',
        '3. Make the precedence system more stable, explainable, and aligned with actual routing intent.',
        '',
        'Work only from this scan data:',
        JSON.stringify({
          project: scan.project,
          summary: scan.summary,
          analysisSummary: summary,
          findings,
          recommendations,
          skillSpotlights: spotlightSummary,
          topSkills,
          conflicts: conflictSummary,
          precedenceChains: chainSummary,
        }, null, 2),
        '',
        'Return the result in this structure:',
        'A. Priority problems overview: identify the 3 most important issues harming stability or routing clarity.',
        'B. Weighting or precedence changes: specify which skills should move up, move down, split, or merge, and explain why.',
        'C. Conflict-resolution changes: propose precedence-level fixes for trigger overlap and override chains.',
        'D. Execution order: propose the repair sequence, starting with the highest-risk and highest-conflict items.',
        '',
        'Requirements:',
        '- If you recommend a precedence change, explain why the current ordering is weak.',
        '- Tie every conclusion to scan evidence such as scope, precedence, risks, and conflicts.',
        '- Keep the output operational and engineering-focused, not generic.',
      ].join('\n'),
    },
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

function normalizeConclusionPrompts(
  value: unknown,
  scan: ScanRecord,
  findings: string[],
  recommendations: string[],
  responseLanguage: AppLocale,
): ConclusionPromptSet {
  const item = value as Record<string, unknown> | null;
  const contentPrompt = normalizeConclusionPrompt(item?.contentOptimization);
  const priorityPrompt = normalizeConclusionPrompt(item?.priorityOptimization);

  if (!contentPrompt || !priorityPrompt) {
    return createFallbackConclusionPrompts(scan, responseLanguage || detectPromptLanguageFromSet(item), {
      summary: '',
      findings,
      recommendations,
      skillSpotlights: [],
    });
  }

  return {
    contentOptimization: contentPrompt,
    priorityOptimization: priorityPrompt,
  };
}

function normalizeConclusionPrompt(value: unknown): ConclusionPrompt | null {
  const item = value as Record<string, unknown> | null;
  const title = `${item?.title || ''}`.replace(/\s+/g, ' ').trim().slice(0, 120);
  const intent = `${item?.intent || ''}`.replace(/\s+/g, ' ').trim().slice(0, 240);
  const prompt = `${item?.prompt || ''}`.trim().slice(0, 6000);
  if (!title || !intent || prompt.length < 80) return null;
  return { title, intent, prompt };
}

function detectPromptLanguage(...values: string[]): AppLocale {
  return values.some((value) => /[\u4e00-\u9fff]/.test(value)) ? 'zh-CN' : 'en';
}

function detectPromptLanguageFromSet(value: Record<string, unknown> | null | undefined): AppLocale {
  const content = value?.contentOptimization as Record<string, unknown> | undefined;
  const priority = value?.priorityOptimization as Record<string, unknown> | undefined;
  return detectPromptLanguage(
    `${content?.title || ''}`,
    `${content?.intent || ''}`,
    `${content?.prompt || ''}`,
    `${priority?.title || ''}`,
    `${priority?.intent || ''}`,
    `${priority?.prompt || ''}`,
  );
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
