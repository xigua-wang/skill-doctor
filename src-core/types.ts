export type Scope = 'project' | 'global' | 'system';
export type RootConfidence = 'confirmed' | 'candidate' | 'inferred';
export type AnalysisStatus = 'completed' | 'skipped' | 'error';
export type RiskSeverity = 'high' | 'medium' | 'low';
export type AppLocale = 'en' | 'zh-CN';

export interface AppConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  provider: string;
  scan: {
    maxDepth: number;
    includeProjectRoots: boolean;
    includeGlobalRoots: boolean;
    enableFallbackDiscovery: boolean;
    extraRoots: string[];
  };
  analysis: {
    timeoutMs: number;
    maxSkills: number;
  };
}

export interface RootCandidate {
  label: string;
  path: string;
  scope: Exclude<Scope, 'system'>;
  agent: string;
  confidence: RootConfidence;
  discoveryMethod: string;
  exists: boolean;
  skillsCount?: number;
}

export interface SkillIssue {
  severity: RiskSeverity;
  message: string;
}

export interface SkillRisk {
  file: string;
  id: string;
  label: string;
  severity: RiskSeverity;
}

export interface SkillLocalPriority {
  totalScore: number;
  riskScore: number;
  issueScore: number;
  scopeBonus: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  highIssueCount: number;
  mediumIssueCount: number;
  lowIssueCount: number;
}

export interface SkillRecord {
  id: string;
  groupKey: string;
  name: string;
  description: string;
  triggers: string[];
  scope: Scope;
  agent: string;
  path: string;
  precedence: number;
  files: string[];
  compatibility: string[];
  risks: SkillRisk[];
  issues: SkillIssue[];
  localPriority?: SkillLocalPriority;
  rootConfidence?: RootConfidence;
  discoveryMethod?: string;
}

export interface ConflictRecord {
  id: string;
  type: string;
  severity: RiskSeverity | 'medium';
  title: string;
  summary: string;
  skills: string[];
  suggestedFix: string;
}

export interface ResolutionCandidate {
  id: string;
  name: string;
  scope: Scope;
  agent: string;
  path: string;
  confidence?: RootConfidence;
  discoveryMethod?: string;
}

export interface ResolutionChain {
  key: string;
  name: string;
  winnerSkillId: string;
  reason: string;
  candidates: ResolutionCandidate[];
}

export interface ScanSummary {
  totalSkills: number;
  projectSkills: number;
  globalSkills: number;
  systemSkills: number;
  highRiskSkills: number;
  conflictCount: number;
  rootCount: number;
}

export interface SkillSpotlight {
  skillId: string;
  label: string;
  rationale: string;
}

export interface ScanAnalysis {
  status: AnalysisStatus;
  generatedAt: string;
  provider: string;
  model: string;
  reason?: string;
  message?: string;
  summary?: string;
  findings?: string[];
  recommendations?: string[];
  skillSpotlights?: SkillSpotlight[];
  raw?: {
    usage: unknown;
  };
}

export interface ScanRecord {
  id: string;
  generatedAt: string;
  project: {
    name: string;
    path: string;
  };
  scannedProject: string;
  scanner: {
    version: string;
    rootsStrategy: string;
  };
  config: {
    provider: string;
    baseUrl: string;
    model: string;
  };
  roots: RootCandidate[];
  rootCandidates: RootCandidate[];
  summary: ScanSummary;
  conflicts: ConflictRecord[];
  resolutionChains: ResolutionChain[];
  skills: SkillRecord[];
  analysis: ScanAnalysis;
  storage?: {
    filePath: string;
  };
}

export interface ScanListItem {
  id: string;
  generatedAt: string | null;
  project: {
    name: string;
    path: string;
  };
  summary: Partial<ScanSummary>;
  broken: boolean;
  storage: {
    filePath: string;
  };
}
