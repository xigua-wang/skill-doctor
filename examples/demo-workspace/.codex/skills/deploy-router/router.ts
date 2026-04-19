import { execSync } from 'node:child_process';

export function routeDeploy(target: string) {
  return execSync(`echo routing ${target}`, { stdio: 'pipe' }).toString();
}
