import type { SkillRecord, RiskSeverity, SkillLocalPriority } from '../types.ts';

const riskSeverityWeight: Record<RiskSeverity, number> = { high: 100, medium: 35, low: 10 };
const issueSeverityWeight: Record<RiskSeverity, number> = { high: 40, medium: 14, low: 4 };

export function compareSkillsForAnalysis(left: SkillRecord, right: SkillRecord): number {
  const leftPriority = getSkillLocalPriority(left);
  const rightPriority = getSkillLocalPriority(right);

  return (
    rightPriority.totalScore - leftPriority.totalScore ||
    rightPriority.highRiskCount - leftPriority.highRiskCount ||
    rightPriority.mediumRiskCount - leftPriority.mediumRiskCount ||
    rightPriority.highIssueCount - leftPriority.highIssueCount ||
    Number(right.scope === 'project') - Number(left.scope === 'project') ||
    right.risks.length - left.risks.length ||
    right.issues.length - left.issues.length ||
    left.name.localeCompare(right.name) ||
    left.path.localeCompare(right.path)
  );
}

export function getSkillLocalPriority(skill: Pick<SkillRecord, 'risks' | 'issues' | 'scope'> & Partial<Pick<SkillRecord, 'localPriority'>>): SkillLocalPriority {
  if (skill.localPriority) return skill.localPriority;

  const riskCounts = countBySeverity(skill.risks.map((risk) => risk.severity));
  const issueCounts = countBySeverity(skill.issues.map((issue) => issue.severity));
  const riskScore = skill.risks.reduce((score, risk) => score + riskSeverityWeight[risk.severity], 0);
  const issueScore = skill.issues.reduce((score, issue) => score + issueSeverityWeight[issue.severity], 0);
  const scopeBonus = skill.scope === 'project' ? 5 : 0;

  return {
    totalScore: riskScore + issueScore + scopeBonus,
    riskScore,
    issueScore,
    scopeBonus,
    highRiskCount: riskCounts.high,
    mediumRiskCount: riskCounts.medium,
    lowRiskCount: riskCounts.low,
    highIssueCount: issueCounts.high,
    mediumIssueCount: issueCounts.medium,
    lowIssueCount: issueCounts.low,
  };
}

function countBySeverity(values: RiskSeverity[]) {
  return values.reduce(
    (counts, severity) => {
      counts[severity] += 1;
      return counts;
    },
    { high: 0, medium: 0, low: 0 },
  );
}
