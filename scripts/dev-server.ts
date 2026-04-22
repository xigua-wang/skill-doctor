#!/usr/bin/env node
import type { Dirent } from 'node:fs';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { analyzeScanWithProgress, testModelConnection } from '../src-core/analysis/analyze-scan.ts';
import { buildLocalScan, buildScan } from '../src-core/scanner/scan-engine.ts';
import type { AppConfig, AppLocale } from '../src-core/types.ts';
import { readConfig, sanitizeConfig, writeConfig } from '../src-core/storage/config-store.ts';
import { deleteScan, listScans, readLatestScan, readScan, saveScan } from '../src-core/storage/scan-store.ts';

const args = parseArgs(process.argv.slice(2));
const cwd = process.cwd();
const port = Number(getArg(args, 'port') || process.env.PORT || 4173);
const host = getArg(args, 'host') || '127.0.0.1';
const appHome = getArg(args, 'app-home') || process.env.SKILL_DOCTOR_HOME;
const projectDir = path.resolve(getArg(args, 'project') || cwd);
const shouldOpen = !hasFlag(args, 'no-open');
const shouldScan = hasFlag(args, 'scan');
const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(moduleDir, '..');
const staticRoot = path.join(packageRoot, 'dist');
const fallbackRoot = packageRoot;

if (hasFlag(args, 'help')) {
  printHelp();
  process.exit(0);
}

if (shouldScan) {
  await runInitialScan();
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
    if (url.pathname.startsWith('/api/')) {
      await handleApi(request, response, url);
      return;
    }
    await serveStatic(url.pathname, response);
  } catch (error) {
    sendJson(response, 500, { error: 'internal_error', message: error instanceof Error ? error.message : 'Unknown error' });
  }
});

server.listen(port, host, () => {
  const appUrl = `http://localhost:${port}`;
  console.log(`Skill Doctor server listening on ${appUrl}`);
  console.log(`Project: ${projectDir}`);
  if (host !== '127.0.0.1' && host !== 'localhost') {
    console.warn(`Warning: server is exposed on host ${host}. Sensitive local APIs are reachable beyond this machine interface.`);
  }
  if (shouldOpen) {
    openBrowser(appUrl);
  }
});

async function handleApi(request: http.IncomingMessage, response: http.ServerResponse, url: URL): Promise<void> {
  if (request.method === 'GET' && url.pathname === '/api/fs/directories') {
    const homeDir = os.homedir();
    const requestedPath = url.searchParams.get('path') || homeDir;
    const safePath = resolveSafeBrowsePath(homeDir, requestedPath);
    if (!safePath) {
      sendJson(response, 400, { error: 'invalid_path' });
      return;
    }
    sendJson(response, 200, await listDirectories(homeDir, safePath));
    return;
  }
  if (request.method === 'GET' && url.pathname === '/api/config') {
    sendJson(response, 200, sanitizeConfig(await readConfig(appHome)));
    return;
  }
  if (request.method === 'PUT' && url.pathname === '/api/config') {
    const body = await readBody<Partial<AppConfig>>(request);
    sendJson(response, 200, sanitizeConfig(await writeConfig(body, appHome)));
    return;
  }
  if (request.method === 'POST' && url.pathname === '/api/config/test-connection') {
    const body = await readBody<Partial<AppConfig>>(request);
    const stored = await readConfig(appHome);
    const candidate: AppConfig = {
      ...stored,
      provider: typeof body.provider === 'string' ? body.provider.trim() : stored.provider,
      baseUrl: typeof body.baseUrl === 'string' ? body.baseUrl.trim() : stored.baseUrl,
      model: typeof body.model === 'string' ? body.model.trim() : stored.model,
      apiKey: typeof body.apiKey === 'string' && body.apiKey.trim() ? body.apiKey.trim() : stored.apiKey,
      scan: {
        ...stored.scan,
        ...(body.scan || {}),
        maxDepth: Number(body.scan?.maxDepth ?? stored.scan.maxDepth),
        includeProjectRoots: body.scan?.includeProjectRoots ?? stored.scan.includeProjectRoots,
        includeGlobalRoots: body.scan?.includeGlobalRoots ?? stored.scan.includeGlobalRoots,
        enableFallbackDiscovery: body.scan?.enableFallbackDiscovery ?? stored.scan.enableFallbackDiscovery,
        extraRoots: body.scan?.extraRoots ?? stored.scan.extraRoots,
      },
      analysis: {
        ...stored.analysis,
        ...(body.analysis || {}),
        timeoutMs: Number(body.analysis?.timeoutMs ?? stored.analysis.timeoutMs),
        maxSkills: Number(body.analysis?.maxSkills ?? stored.analysis.maxSkills),
      },
    };
    sendJson(response, 200, await testModelConnection(candidate));
    return;
  }
  if (request.method === 'GET' && url.pathname === '/api/scans') {
    sendJson(response, 200, await listScans(appHome));
    return;
  }
  if (request.method === 'GET' && url.pathname === '/api/scans/latest') {
    const latest = await readLatestScan(appHome);
    if (!latest) return sendJson(response, 404, { error: 'not_found' });
    sendJson(response, 200, latest);
    return;
  }
  if (request.method === 'POST' && url.pathname === '/api/scans/stream') {
    const body = await readBody<{ projectPath?: string; analysisLanguage?: AppLocale }>(request);
    const requestedProjectDir = path.resolve(body.projectPath || projectDir);
    const config = await readConfig(appHome);
    await streamScan(response, {
      projectDir: requestedProjectDir,
      config,
      analysisLanguage: body.analysisLanguage === 'zh-CN' ? 'zh-CN' : 'en',
    });
    return;
  }
  if (request.method === 'POST' && url.pathname === '/api/scans') {
    const body = await readBody<{ projectPath?: string; analysisLanguage?: AppLocale }>(request);
    const requestedProjectDir = path.resolve(body.projectPath || projectDir);
    const config = await readConfig(appHome);
    const scan = await buildScan({
      projectDir: requestedProjectDir,
      homeDir: os.homedir(),
      config,
      analysisLanguage: body.analysisLanguage === 'zh-CN' ? 'zh-CN' : 'en',
    });
    sendJson(response, 201, await saveScan(scan, appHome));
    return;
  }
  if (url.pathname.startsWith('/api/scans/')) {
    const id = decodeURIComponent(url.pathname.replace('/api/scans/', ''));
    if (!id) return sendJson(response, 400, { error: 'invalid_id' });
    if (request.method === 'GET') {
      try {
        const record = await readScan(id, appHome);
        if (!record) return sendJson(response, 404, { error: 'not_found' });
        sendJson(response, 200, record);
      } catch (error) {
        sendJson(response, 422, {
          error: 'invalid_scan_record',
          message: error instanceof Error ? error.message : 'Invalid scan record.',
        });
      }
      return;
    }
    if (request.method === 'DELETE') {
      const removed = await deleteScan(id, appHome);
      sendJson(response, removed ? 200 : 404, { removed });
      return;
    }
  }
  sendJson(response, 404, { error: 'not_found' });
}

async function streamScan(
  response: http.ServerResponse,
  input: { projectDir: string; config: AppConfig; analysisLanguage: AppLocale },
): Promise<void> {
  response.writeHead(200, {
    'Content-Type': 'application/x-ndjson; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  });

  try {
    sendStreamEvent(response, { type: 'scan_started', projectPath: input.projectDir });
    const localScan = await buildLocalScan({
      projectDir: input.projectDir,
      homeDir: os.homedir(),
      config: input.config,
    });
    sendStreamEvent(response, {
      type: 'local_scan_completed',
      scan: localScan,
    });

    const analysis = await analyzeScanWithProgress(localScan, input.config, input.analysisLanguage, (event) => {
      if (event.phase === 'core_started') {
        sendStreamEvent(response, { type: 'analysis_phase', phase: 'core_started' });
        return;
      }
      if (event.phase === 'core_completed') {
        sendStreamEvent(response, { type: 'analysis_phase', phase: 'core_completed', analysis: event.analysis });
        return;
      }
      if (event.phase === 'prompts_started') {
        sendStreamEvent(response, { type: 'analysis_phase', phase: 'prompts_started' });
        return;
      }
      if (event.phase === 'prompts_completed') {
        sendStreamEvent(response, { type: 'analysis_phase', phase: 'prompts_completed', conclusionPrompts: event.conclusionPrompts });
        return;
      }
      sendStreamEvent(response, {
        type: 'analysis_phase',
        phase: 'prompts_fallback',
        message: event.message,
        conclusionPrompts: event.conclusionPrompts,
      });
    });

    const storedScan = await saveScan({ ...localScan, analysis }, appHome);
    sendStreamEvent(response, { type: 'scan_completed', scan: storedScan });
  } catch (error) {
    sendStreamEvent(response, {
      type: 'scan_failed',
      message: error instanceof Error ? error.message : 'Scan failed.',
    });
  } finally {
    response.end();
  }
}

function sendStreamEvent(response: http.ServerResponse, value: unknown): void {
  response.write(`${JSON.stringify(value)}\n`);
}

async function serveStatic(pathname: string, response: http.ServerResponse): Promise<void> {
  const resolvedPath = resolveStaticPath(pathname);
  let stats: Awaited<ReturnType<typeof fs.stat>>;
  try {
    stats = await fs.stat(resolvedPath);
  } catch {
    const indexPath = await resolveIndexPath();
    try {
      const body = await fs.readFile(indexPath, 'utf8');
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end(body);
      return;
    } catch {
      sendText(response, 404, 'Not found');
      return;
    }
  }

  const filePath = stats.isDirectory() ? path.join(resolvedPath, 'index.html') : resolvedPath;
  try {
    const body = await fs.readFile(filePath);
    response.writeHead(200, { 'Content-Type': mimeType(filePath) });
    response.end(body);
  } catch {
    sendText(response, 404, 'Not found');
  }
}

function resolveStaticPath(pathname: string): string {
  const cleaned = pathname === '/' ? '/index.html' : pathname;
  const preferredTarget = path.resolve(staticRoot, `.${cleaned}`);
  if (preferredTarget.startsWith(staticRoot)) return preferredTarget;
  const fallbackTarget = path.resolve(fallbackRoot, `.${cleaned}`);
  if (!fallbackTarget.startsWith(fallbackRoot)) return path.join(fallbackRoot, 'index.html');
  return fallbackTarget;
}

async function resolveIndexPath(): Promise<string> {
  try {
    await fs.access(path.join(staticRoot, 'index.html'));
    return path.join(staticRoot, 'index.html');
  } catch {
    return path.join(fallbackRoot, 'index.html');
  }
}

function mimeType(filePath: string): string {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  if (filePath.endsWith('.md')) return 'text/markdown; charset=utf-8';
  return 'text/plain; charset=utf-8';
}

function sendJson(response: http.ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(value, null, 2));
}

function sendText(response: http.ServerResponse, status: number, value: string): void {
  response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end(value);
}

async function readBody<T>(request: http.IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(chunk as Buffer);
  if (!chunks.length) return {} as T;
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as T;
  } catch {
    return {} as T;
  }
}

function resolveSafeBrowsePath(homeDir: string, requestedPath: string): string | null {
  const resolved = path.resolve(requestedPath);
  if (resolved === homeDir || resolved.startsWith(`${homeDir}${path.sep}`)) return resolved;
  return null;
}

async function listDirectories(homeDir: string, currentPath: string): Promise<{
  rootPath: string;
  currentPath: string;
  parentPath: string | null;
  directories: Array<{ name: string; path: string }>;
}> {
  let entries: Dirent[];
  try {
    entries = await fs.readdir(currentPath, { withFileTypes: true });
  } catch {
    return {
      rootPath: homeDir,
      currentPath,
      parentPath: currentPath === homeDir ? null : path.dirname(currentPath),
      directories: [],
    };
  }

  const directories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      name: entry.name,
      path: path.join(currentPath, entry.name),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));

  return {
    rootPath: homeDir,
    currentPath,
    parentPath: currentPath === homeDir ? null : path.dirname(currentPath),
    directories,
  };
}

async function runInitialScan(): Promise<void> {
  try {
    const config = await readConfig(appHome);
    const scan = await buildScan({
      projectDir,
      homeDir: os.homedir(),
      config,
      analysisLanguage: 'en',
    });
    const saved = await saveScan(scan, appHome);
    console.log(`Initial scan saved: ${saved.id}`);
  } catch (error) {
    console.error(`Initial scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function openBrowser(url: string): void {
  try {
    if (process.platform === 'darwin') {
      detachOpen('open', [url]);
      return;
    }
    if (process.platform === 'win32') {
      detachOpen('cmd', ['/c', 'start', '', url]);
      return;
    }
    detachOpen('xdg-open', [url]);
  } catch {
    // Ignore browser launch errors and keep the local server running.
  }
}

function detachOpen(command: string, args: string[]): void {
  const child = spawn(command, args, {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
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

function hasFlag(argsMap: Record<string, string | boolean>, key: string): boolean {
  return argsMap[key] === true;
}

function printHelp(): void {
  console.log([
    'Skill Doctor',
    '',
    'Usage:',
    '  skill-doctor [--project <path>] [--port <number>] [--host <host>] [--app-home <path>] [--no-open] [--scan]',
    '',
    'Default behavior:',
    '  - Uses the current working directory as the project',
    '  - Binds the local server to 127.0.0.1',
    '  - Starts the local UI server',
    '  - Opens the browser',
    '',
    'Optional flags:',
    '  --scan    Run an initial scan before starting the UI',
    '  --host    Override the bind host, for example 0.0.0.0',
  ].join('\n'));
}
