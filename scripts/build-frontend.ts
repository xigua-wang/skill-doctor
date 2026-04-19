#!/usr/bin/env node
import esbuild from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import { assertValidScanRecord } from '../src-core/validation/scan-schema.ts';

const cwd = process.cwd();
const distDir = path.join(cwd, 'dist');
const publicDir = path.join(cwd, 'public');
const watch = process.argv.includes('--watch');

await fs.rm(distDir, { recursive: true, force: true });
await fs.mkdir(path.join(distDir, 'assets'), { recursive: true });
await validateDemoDataset(path.join(publicDir, 'data', 'demo-scan.json'));
await copyPublic(publicDir, distDir);
await writeIndexHtml(path.join(distDir, 'index.html'));

const buildOptions: esbuild.BuildOptions = {
  entryPoints: [path.join(cwd, 'src/main.tsx')],
  bundle: true,
  format: 'esm',
  outfile: path.join(distDir, 'assets/app.js'),
  jsx: 'automatic',
  loader: {
    '.ts': 'ts',
    '.tsx': 'tsx',
    '.js': 'jsx',
    '.jsx': 'jsx',
  },
  sourcemap: true,
  minify: !watch,
  target: ['es2022'],
};

if (watch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  console.log('Frontend build watcher running.');
} else {
  await esbuild.build(buildOptions);
  console.log('Frontend build complete.');
}

async function writeIndexHtml(filePath: string) {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Skill Doctor</title>
    <link rel="stylesheet" href="/assets/app.css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/assets/app.js"></script>
  </body>
</html>
`;
  await fs.writeFile(filePath, html);
}

async function copyPublic(sourceDir: string, targetDir: string): Promise<void> {
  try {
    const entries = await fs.readdir(sourceDir, { withFileTypes: true });
    for (const entry of entries) {
      const sourcePath = path.join(sourceDir, entry.name);
      const targetPath = path.join(targetDir, entry.name);
      if (entry.isDirectory()) {
        await fs.mkdir(targetPath, { recursive: true });
        await copyPublic(sourcePath, targetPath);
      } else if (entry.isFile()) {
        await fs.copyFile(sourcePath, targetPath);
      }
    }
  } catch {
    return;
  }
}

async function validateDemoDataset(filePath: string): Promise<void> {
  const text = await fs.readFile(filePath, 'utf8');
  const value = JSON.parse(text) as unknown;
  assertValidScanRecord(value, 'public/data/demo-scan.json');
}
