import type { AppConfig, AppConfigView } from '../types.ts';
import { appPaths, ensureAppHome } from './app-home.ts';
import { readJson, writeJsonAtomic } from './fs-utils.ts';

export const defaultConfig: AppConfig = {
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-5.4',
  provider: 'openai',
  scan: {
    maxDepth: 5,
    includeProjectRoots: true,
    includeGlobalRoots: true,
    enableFallbackDiscovery: true,
    extraRoots: [],
  },
  analysis: {
    timeoutMs: 20000,
    maxSkills: 12,
  },
};

export async function readConfig(customHome?: string): Promise<AppConfig> {
  const paths = await ensureAppHome(customHome);
  const stored = await readJson<Partial<AppConfig>>(paths.config, {});
  return mergeConfig(defaultConfig, stored ?? {});
}

export async function writeConfig(patch: Partial<AppConfig>, customHome?: string): Promise<AppConfig> {
  const paths = await ensureAppHome(customHome);
  const stored = await readJson<Partial<AppConfig>>(paths.config, {});
  const current = mergeConfig(defaultConfig, stored ?? {});
  const next = mergeConfig(current, patch);
  await writeJsonAtomic(paths.config, next);
  return next;
}

export function configPath(customHome?: string): string {
  return appPaths(customHome).config;
}

function mergeConfig(base: AppConfig, patch: Partial<AppConfig>): AppConfig {
  return {
    ...base,
    ...patch,
    scan: {
      ...base.scan,
      ...(patch.scan || {}),
    },
    analysis: {
      ...base.analysis,
      ...(patch.analysis || {}),
    },
  };
}

export function sanitizeConfig(config: AppConfig): AppConfigView {
  return {
    provider: config.provider,
    baseUrl: config.baseUrl,
    model: config.model,
    apiKey: '',
    hasApiKey: Boolean(config.apiKey.trim()),
    apiKeyHint: maskApiKey(config.apiKey),
    scan: { ...config.scan },
    analysis: { ...config.analysis },
  };
}

function maskApiKey(apiKey: string): string | undefined {
  const trimmed = apiKey.trim();
  if (!trimmed) return undefined;
  if (trimmed.length <= 8) return '***configured***';
  return `${trimmed.slice(0, 3)}***${trimmed.slice(-4)}`;
}
