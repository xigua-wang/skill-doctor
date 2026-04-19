import fs from 'node:fs/promises';
import path from 'node:path';

export async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function safeRead(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch {
    return '';
  }
}

export async function readJson<T>(filePath: string, fallback: T | null = null): Promise<T | null> {
  try {
    const text = await fs.readFile(filePath, 'utf8');
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function writeJsonAtomic(filePath: string, value: unknown): Promise<void> {
  await ensureDir(path.dirname(filePath));
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(tempPath, JSON.stringify(value, null, 2));
  await fs.rename(tempPath, filePath);
}

export async function removeFile(filePath: string): Promise<boolean> {
  try {
    await fs.unlink(filePath);
    return true;
  } catch {
    return false;
  }
}
