import type { ScanAnalysis, ScanRecord, SkillLocalPriority } from '../types.ts';

export function assertValidScanRecord(value: unknown, context = 'scan record'): asserts value is ScanRecord {
  const result = validateScanRecord(value);
  if (!result.ok) {
    throw new Error(`${context} is invalid: ${result.errors.join('; ')}`);
  }
}

export function validateScanRecord(value: unknown): { ok: true; value: ScanRecord } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const record = asObject(value, 'root', errors);
  if (!record) return { ok: false, errors };

  expectString(record.id, 'id', errors);
  expectString(record.generatedAt, 'generatedAt', errors);
  expectString(record.scannedProject, 'scannedProject', errors);

  const project = asObject(record.project, 'project', errors);
  if (project) {
    expectString(project.name, 'project.name', errors);
    expectString(project.path, 'project.path', errors);
  }

  const scanner = asObject(record.scanner, 'scanner', errors);
  if (scanner) {
    expectString(scanner.version, 'scanner.version', errors);
    expectString(scanner.rootsStrategy, 'scanner.rootsStrategy', errors);
  }

  const config = asObject(record.config, 'config', errors);
  if (config) {
    expectString(config.provider, 'config.provider', errors);
    expectString(config.baseUrl, 'config.baseUrl', errors);
    expectString(config.model, 'config.model', errors);
  }

  validateSummary(record.summary, 'summary', errors);
  validateRoots(record.roots, 'roots', errors, true);
  validateRoots(record.rootCandidates, 'rootCandidates', errors, false);
  validateConflicts(record.conflicts, 'conflicts', errors);
  validateResolutionChains(record.resolutionChains, 'resolutionChains', errors);
  validateSkills(record.skills, 'skills', errors);
  validateAnalysis(record.analysis, 'analysis', errors);

  return errors.length ? { ok: false, errors } : { ok: true, value: record as unknown as ScanRecord };
}

function validateSummary(value: unknown, label: string, errors: string[]) {
  const summary = asObject(value, label, errors);
  if (!summary) return;
  expectNumber(summary.totalSkills, `${label}.totalSkills`, errors);
  expectNumber(summary.projectSkills, `${label}.projectSkills`, errors);
  expectNumber(summary.globalSkills, `${label}.globalSkills`, errors);
  expectNumber(summary.systemSkills, `${label}.systemSkills`, errors);
  expectNumber(summary.highRiskSkills, `${label}.highRiskSkills`, errors);
  expectNumber(summary.conflictCount, `${label}.conflictCount`, errors);
  expectNumber(summary.rootCount, `${label}.rootCount`, errors);
}

function validateRoots(value: unknown, label: string, errors: string[], requireSkillsCount: boolean) {
  const roots = asArray(value, label, errors);
  if (!roots) return;
  roots.forEach((item, index) => {
    const root = asObject(item, `${label}[${index}]`, errors);
    if (!root) return;
    expectString(root.label, `${label}[${index}].label`, errors);
    expectString(root.path, `${label}[${index}].path`, errors);
    expectString(root.scope, `${label}[${index}].scope`, errors);
    expectString(root.agent, `${label}[${index}].agent`, errors);
    expectString(root.confidence, `${label}[${index}].confidence`, errors);
    expectString(root.discoveryMethod, `${label}[${index}].discoveryMethod`, errors);
    expectBoolean(root.exists, `${label}[${index}].exists`, errors);
    if (requireSkillsCount) expectNumber(root.skillsCount, `${label}[${index}].skillsCount`, errors);
  });
}

function validateConflicts(value: unknown, label: string, errors: string[]) {
  const conflicts = asArray(value, label, errors);
  if (!conflicts) return;
  conflicts.forEach((item, index) => {
    const conflict = asObject(item, `${label}[${index}]`, errors);
    if (!conflict) return;
    expectString(conflict.id, `${label}[${index}].id`, errors);
    expectString(conflict.type, `${label}[${index}].type`, errors);
    expectString(conflict.severity, `${label}[${index}].severity`, errors);
    expectString(conflict.title, `${label}[${index}].title`, errors);
    expectString(conflict.summary, `${label}[${index}].summary`, errors);
    expectStringArray(conflict.skills, `${label}[${index}].skills`, errors);
    expectString(conflict.suggestedFix, `${label}[${index}].suggestedFix`, errors);
  });
}

function validateResolutionChains(value: unknown, label: string, errors: string[]) {
  const chains = asArray(value, label, errors);
  if (!chains) return;
  chains.forEach((item, index) => {
    const chain = asObject(item, `${label}[${index}]`, errors);
    if (!chain) return;
    expectString(chain.key, `${label}[${index}].key`, errors);
    expectString(chain.name, `${label}[${index}].name`, errors);
    expectString(chain.winnerSkillId, `${label}[${index}].winnerSkillId`, errors);
    expectString(chain.reason, `${label}[${index}].reason`, errors);
    const candidates = asArray(chain.candidates, `${label}[${index}].candidates`, errors);
    if (!candidates) return;
    candidates.forEach((candidateItem, candidateIndex) => {
      const candidate = asObject(candidateItem, `${label}[${index}].candidates[${candidateIndex}]`, errors);
      if (!candidate) return;
      expectString(candidate.id, `${label}[${index}].candidates[${candidateIndex}].id`, errors);
      expectString(candidate.name, `${label}[${index}].candidates[${candidateIndex}].name`, errors);
      expectString(candidate.scope, `${label}[${index}].candidates[${candidateIndex}].scope`, errors);
      expectString(candidate.agent, `${label}[${index}].candidates[${candidateIndex}].agent`, errors);
      expectString(candidate.path, `${label}[${index}].candidates[${candidateIndex}].path`, errors);
    });
  });
}

function validateSkills(value: unknown, label: string, errors: string[]) {
  const skills = asArray(value, label, errors);
  if (!skills) return;
  skills.forEach((item, index) => {
    const skill = asObject(item, `${label}[${index}]`, errors);
    if (!skill) return;
    expectString(skill.id, `${label}[${index}].id`, errors);
    expectString(skill.groupKey, `${label}[${index}].groupKey`, errors);
    expectString(skill.name, `${label}[${index}].name`, errors);
    expectString(skill.description, `${label}[${index}].description`, errors);
    expectString(skill.scope, `${label}[${index}].scope`, errors);
    expectString(skill.agent, `${label}[${index}].agent`, errors);
    expectString(skill.path, `${label}[${index}].path`, errors);
    expectNumber(skill.precedence, `${label}[${index}].precedence`, errors);
    expectStringArray(skill.triggers, `${label}[${index}].triggers`, errors);
    expectStringArray(skill.files, `${label}[${index}].files`, errors);
    expectStringArray(skill.compatibility, `${label}[${index}].compatibility`, errors);
    validateRisks(skill.risks, `${label}[${index}].risks`, errors);
    validateIssues(skill.issues, `${label}[${index}].issues`, errors);
    optionalLocalPriority(skill.localPriority, `${label}[${index}].localPriority`, errors);
  });
}

function validateRisks(value: unknown, label: string, errors: string[]) {
  const risks = asArray(value, label, errors);
  if (!risks) return;
  risks.forEach((item, index) => {
    const risk = asObject(item, `${label}[${index}]`, errors);
    if (!risk) return;
    expectString(risk.file, `${label}[${index}].file`, errors);
    expectString(risk.id, `${label}[${index}].id`, errors);
    expectString(risk.label, `${label}[${index}].label`, errors);
    expectString(risk.severity, `${label}[${index}].severity`, errors);
  });
}

function validateIssues(value: unknown, label: string, errors: string[]) {
  const issues = asArray(value, label, errors);
  if (!issues) return;
  issues.forEach((item, index) => {
    const issue = asObject(item, `${label}[${index}]`, errors);
    if (!issue) return;
    expectString(issue.severity, `${label}[${index}].severity`, errors);
    expectString(issue.message, `${label}[${index}].message`, errors);
  });
}

function validateAnalysis(value: unknown, label: string, errors: string[]) {
  const analysis = asObject(value, label, errors);
  if (!analysis) return;
  expectString(analysis.status, `${label}.status`, errors);
  expectString(analysis.generatedAt, `${label}.generatedAt`, errors);
  expectString(analysis.provider, `${label}.provider`, errors);
  expectString(analysis.model, `${label}.model`, errors);
  optionalString(analysis.reason, `${label}.reason`, errors);
  optionalString(analysis.message, `${label}.message`, errors);
  optionalString(analysis.summary, `${label}.summary`, errors);
  optionalStringArray(analysis.findings, `${label}.findings`, errors);
  optionalStringArray(analysis.recommendations, `${label}.recommendations`, errors);
  const conclusionPrompts = analysis.conclusionPrompts;
  if (conclusionPrompts !== undefined) {
    const promptSet = asObject(conclusionPrompts, `${label}.conclusionPrompts`, errors);
    if (promptSet) {
      validateConclusionPrompt(promptSet.contentOptimization, `${label}.conclusionPrompts.contentOptimization`, errors);
      validateConclusionPrompt(promptSet.priorityOptimization, `${label}.conclusionPrompts.priorityOptimization`, errors);
    }
  }

  const spotlights = analysis.skillSpotlights;
  if (spotlights !== undefined) {
    const array = asArray(spotlights, `${label}.skillSpotlights`, errors);
    if (array) {
      array.forEach((item, index) => {
        const spotlight = asObject(item, `${label}.skillSpotlights[${index}]`, errors);
        if (!spotlight) return;
        expectString(spotlight.skillId, `${label}.skillSpotlights[${index}].skillId`, errors);
        expectString(spotlight.label, `${label}.skillSpotlights[${index}].label`, errors);
        expectString(spotlight.rationale, `${label}.skillSpotlights[${index}].rationale`, errors);
      });
    }
  }
}

function validateConclusionPrompt(value: unknown, label: string, errors: string[]) {
  const prompt = asObject(value, label, errors);
  if (!prompt) return;
  expectString(prompt.title, `${label}.title`, errors);
  expectString(prompt.intent, `${label}.intent`, errors);
  expectString(prompt.prompt, `${label}.prompt`, errors);
}

function asObject(value: unknown, label: string, errors: string[]): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`${label} must be an object`);
    return null;
  }
  return value as Record<string, unknown>;
}

function asArray(value: unknown, label: string, errors: string[]): unknown[] | null {
  if (!Array.isArray(value)) {
    errors.push(`${label} must be an array`);
    return null;
  }
  return value;
}

function expectString(value: unknown, label: string, errors: string[]) {
  if (typeof value !== 'string') errors.push(`${label} must be a string`);
}

function optionalString(value: unknown, label: string, errors: string[]) {
  if (value !== undefined && typeof value !== 'string') errors.push(`${label} must be a string when present`);
}

function expectNumber(value: unknown, label: string, errors: string[]) {
  if (typeof value !== 'number' || Number.isNaN(value)) errors.push(`${label} must be a number`);
}

function expectBoolean(value: unknown, label: string, errors: string[]) {
  if (typeof value !== 'boolean') errors.push(`${label} must be a boolean`);
}

function expectStringArray(value: unknown, label: string, errors: string[]) {
  const array = asArray(value, label, errors);
  if (!array) return;
  array.forEach((item, index) => {
    if (typeof item !== 'string') errors.push(`${label}[${index}] must be a string`);
  });
}

function optionalStringArray(value: unknown, label: string, errors: string[]) {
  if (value !== undefined) expectStringArray(value, label, errors);
}

function optionalLocalPriority(value: unknown, label: string, errors: string[]) {
  if (value === undefined) return;
  const priority = asObject(value, label, errors) as SkillLocalPriority | null;
  if (!priority) return;
  expectNumber(priority.totalScore, `${label}.totalScore`, errors);
  expectNumber(priority.riskScore, `${label}.riskScore`, errors);
  expectNumber(priority.issueScore, `${label}.issueScore`, errors);
  expectNumber(priority.scopeBonus, `${label}.scopeBonus`, errors);
  expectNumber(priority.highRiskCount, `${label}.highRiskCount`, errors);
  expectNumber(priority.mediumRiskCount, `${label}.mediumRiskCount`, errors);
  expectNumber(priority.lowRiskCount, `${label}.lowRiskCount`, errors);
  expectNumber(priority.highIssueCount, `${label}.highIssueCount`, errors);
  expectNumber(priority.mediumIssueCount, `${label}.mediumIssueCount`, errors);
  expectNumber(priority.lowIssueCount, `${label}.lowIssueCount`, errors);
}

export function coerceValidatedScanRecord(value: unknown, context = 'scan record'): ScanRecord {
  assertValidScanRecord(value, context);
  const record = value as unknown as ScanRecord;
  if (!record.analysis) {
    record.analysis = {
      status: 'skipped',
      generatedAt: record.generatedAt,
      provider: record.config?.provider || '',
      model: record.config?.model || '',
      reason: 'missing_analysis',
    } satisfies ScanAnalysis;
  }
  return record;
}
