#!/usr/bin/env node
import esbuild from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(rootDir, 'lib');

process.chdir(rootDir);
await import('./build-frontend.ts');

await fs.rm(outDir, { recursive: true, force: true });

await esbuild.build({
  entryPoints: [
    path.join(rootDir, 'scripts/dev-server.ts'),
    path.join(rootDir, 'scripts/scan-skills.ts'),
  ],
  outdir: outDir,
  bundle: true,
  splitting: false,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  sourcemap: false,
  packages: 'external',
  outExtension: { '.js': '.js' },
});

await Promise.all([
  fs.chmod(path.join(outDir, 'dev-server.js'), 0o755),
  fs.chmod(path.join(outDir, 'scan-skills.js'), 0o755),
]);

await fs.rename(path.join(outDir, 'dev-server.js'), path.join(outDir, 'skill-doctor.js'));
await fs.rename(path.join(outDir, 'scan-skills.js'), path.join(outDir, 'skill-doctor-scan.js'));
await Promise.all([
  normalizeShebang(path.join(outDir, 'skill-doctor.js')),
  normalizeShebang(path.join(outDir, 'skill-doctor-scan.js')),
]);

console.log('Package build complete.');

async function normalizeShebang(filePath: string): Promise<void> {
  const text = await fs.readFile(filePath, 'utf8');
  const normalized = text.replace(/^(#!\/usr\/bin\/env node\n)+/, '#!/usr/bin/env node\n');
  await fs.writeFile(filePath, normalized);
  await fs.chmod(filePath, 0o755);
}
