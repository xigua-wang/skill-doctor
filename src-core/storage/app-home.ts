import os from 'node:os';
import path from 'node:path';
import { ensureDir } from './fs-utils.ts';

export interface AppPaths {
  home: string;
  config: string;
  scansDir: string;
  cacheDir: string;
  logsDir: string;
  exportsDir: string;
}

export function resolveAppHome(customHome?: string): string {
  return path.resolve(customHome || process.env.SKILL_DOCTOR_HOME || path.join(os.homedir(), '.skill-doctor'));
}

export function appPaths(customHome?: string): AppPaths {
  const home = resolveAppHome(customHome);
  return {
    home,
    config: path.join(home, 'config.json'),
    scansDir: path.join(home, 'scans'),
    cacheDir: path.join(home, 'cache'),
    logsDir: path.join(home, 'logs'),
    exportsDir: path.join(home, 'exports'),
  };
}

export async function ensureAppHome(customHome?: string): Promise<AppPaths> {
  const paths = appPaths(customHome);
  await Promise.all([
    ensureDir(paths.home),
    ensureDir(paths.scansDir),
    ensureDir(paths.cacheDir),
    ensureDir(paths.logsDir),
    ensureDir(paths.exportsDir),
  ]);
  return paths;
}
