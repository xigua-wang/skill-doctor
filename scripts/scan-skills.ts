#!/usr/bin/env node
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildScan } from '../src-core/scanner/scan-engine.ts';
import type { AppLocale, ScanRecord } from '../src-core/types.ts';
import { appPaths, ensureAppHome } from '../src-core/storage/app-home.ts';
import { configPath, readConfig } from '../src-core/storage/config-store.ts';
import { saveScan } from '../src-core/storage/scan-store.ts';

const args = parseArgs(process.argv.slice(2));
if (args.help === true) {
  printHelp();
  process.exit(0);
}
const projectDir = path.resolve(getArg(args, 'project') || process.cwd());
const homeDir = path.resolve(getArg(args, 'home') || os.homedir());
const appHome = getArg(args, 'app-home');
const analysisLanguage = parseAnalysisLanguage(getArg(args, 'analysis-language'));

await ensureAppHome(appHome);
const config = await readConfig(appHome);
const scan = await buildScan({ projectDir, homeDir, config, analysisLanguage });
const storedScan = await saveScan(scan, appHome);

if (getArg(args, 'output')) {
  const output = getArg(args, 'output')!;
  await fs.mkdir(path.dirname(path.resolve(output)), { recursive: true });
  await fs.writeFile(path.resolve(output), JSON.stringify(storedScan, null, 2));
}
if (getArg(args, 'markdown')) {
  const markdown = getArg(args, 'markdown')!;
  await fs.mkdir(path.dirname(path.resolve(markdown)), { recursive: true });
  await fs.writeFile(path.resolve(markdown), toMarkdown(storedScan));
}

console.log(JSON.stringify({
  id: storedScan.id,
  generatedAt: storedScan.generatedAt,
  scannedProject: storedScan.scannedProject,
  skills: storedScan.summary.totalSkills,
  conflicts: storedScan.summary.conflictCount,
  highRiskSkills: storedScan.summary.highRiskSkills,
  storagePath: appPaths(appHome).scansDir,
  configPath: configPath(appHome),
}, null, 2));

function toMarkdown(scan: ScanRecord): string {
  const lines = [
    '# Skill Doctor Report',
    '',
    `Generated: ${scan.generatedAt}`,
    `Project: ${scan.scannedProject}`,
    '',
    '## Summary',
    '',
    `- Total skills: ${scan.summary.totalSkills}`,
    `- Project skills: ${scan.summary.projectSkills}`,
    `- Global skills: ${scan.summary.globalSkills}`,
    `- System skills: ${scan.summary.systemSkills}`,
    `- Conflict count: ${scan.summary.conflictCount}`,
    `- High risk skills: ${scan.summary.highRiskSkills}`,
    '',
    '## Roots',
    '',
    ...scan.roots.map((root) => `- ${root.label}: ${root.path} (${root.skillsCount || 0} skills)`),
    '',
    '## Conflicts',
    '',
    ...(scan.conflicts.length
      ? scan.conflicts.map((conflict) => `- [${conflict.severity}] ${conflict.title}: ${conflict.summary}`)
      : ['- No conflicts found.']),
  ];
  return `${lines.join('\n')}\n`;
}

function parseArgs(input: string[]): Record<string, string | boolean> {
  const result: Record<string, string | boolean> = {};
  for (let index = 0; index < input.length; index += 1) {
    const token = input[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = input[index + 1];
    if (!next || next.startsWith('--')) {
      result[key] = true;
    } else {
      result[key] = next;
      index += 1;
    }
  }
  return result;
}

function getArg(argsMap: Record<string, string | boolean>, key: string): string | undefined {
  const value = argsMap[key];
  return typeof value === 'string' ? value : undefined;
}

function parseAnalysisLanguage(value?: string): AppLocale {
  return value === 'zh-CN' ? 'zh-CN' : 'en';
}

function printHelp(): void {
  console.log([
    'Skill Doctor Scan',
    '',
    'Usage:',
    '  skill-doctor-scan [--project <path>] [--home <path>] [--output <file>] [--markdown <file>] [--analysis-language <en|zh-CN>] [--app-home <path>]',
  ].join('\n'));
}
