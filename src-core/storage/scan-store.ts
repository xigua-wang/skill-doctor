import fs from 'node:fs/promises';
import path from 'node:path';
import type { ScanListItem, ScanRecord } from '../types.ts';
import { assertValidScanRecord, coerceValidatedScanRecord, validateScanRecord } from '../validation/scan-schema.ts';
import { appPaths, ensureAppHome } from './app-home.ts';
import { readJson, removeFile, writeJsonAtomic } from './fs-utils.ts';

export async function saveScan(scan: ScanRecord, customHome?: string): Promise<ScanRecord> {
  const paths = await ensureAppHome(customHome);
  const id = scan.id || createScanId(scan);
  const filePath = path.join(paths.scansDir, `${id}.json`);
  const record: ScanRecord = {
    ...scan,
    id,
    storage: {
      filePath,
    },
  };
  assertValidScanRecord(record, 'scan before save');
  await writeJsonAtomic(filePath, record);
  return record;
}

export async function listScans(customHome?: string): Promise<ScanListItem[]> {
  const paths = await ensureAppHome(customHome);
  const entries = await fs.readdir(paths.scansDir, { withFileTypes: true });
  const scans: ScanListItem[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    const filePath = path.join(paths.scansDir, entry.name);
    const record = await readJson<unknown>(filePath);
    if (!record) {
      scans.push({
        id: entry.name.replace(/\.json$/, ''),
        generatedAt: null,
        project: { name: 'broken-record', path: filePath },
        summary: {},
        broken: true,
        storage: { filePath },
      });
      continue;
    }
    const validation = validateScanRecord(record);
    if (!validation.ok) {
      scans.push({
        id: entry.name.replace(/\.json$/, ''),
        generatedAt: null,
        project: { name: 'broken-record', path: filePath },
        summary: {},
        broken: true,
        storage: { filePath },
      });
      continue;
    }
    const validRecord = coerceValidatedScanRecord(record, filePath);
    scans.push({
      id: validRecord.id,
      generatedAt: validRecord.generatedAt,
      project: validRecord.project,
      summary: validRecord.summary,
      broken: false,
      storage: { filePath },
    });
  }

  return scans.sort((a, b) => `${b.generatedAt || ''}`.localeCompare(`${a.generatedAt || ''}`));
}

export async function readScan(id: string, customHome?: string): Promise<ScanRecord | null> {
  const paths = await ensureAppHome(customHome);
  const value = await readJson<unknown>(path.join(paths.scansDir, `${id}.json`));
  if (!value) return null;
  return coerceValidatedScanRecord(value, `scan ${id}`);
}

export async function readLatestScan(customHome?: string): Promise<ScanRecord | null> {
  const scans = await listScans(customHome);
  if (!scans.length) return null;
  return readScan(scans[0].id, customHome);
}

export async function deleteScan(id: string, customHome?: string): Promise<boolean> {
  return removeFile(path.join(appPaths(customHome).scansDir, `${id}.json`));
}

function createScanId(scan: Pick<ScanRecord, 'generatedAt' | 'project'>): string {
  const timestamp = `${scan.generatedAt || new Date().toISOString()}`.replace(/[:.]/g, '-').replace(/Z$/, 'Z');
  const name = sanitizeSegment(scan.project?.name || 'project');
  return `${timestamp}--${name}`;
}

function sanitizeSegment(value: string): string {
  return `${value}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project';
}
