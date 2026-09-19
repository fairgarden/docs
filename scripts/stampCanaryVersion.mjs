/**
 * Stamps the next canary version into a built package manifest, ready to publish.
 *
 * Usage: node scripts/stampCanaryVersion.mjs <path-to-package.json>
 *
 * Writes `version` and `gitSha` into the manifest and, when running under GitHub
 * Actions, appends `version=<version>` to `$GITHUB_OUTPUT`.
 */

import { execFile } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';

import { resolveCanaryVersion } from './canaryVersion.mjs';

const execFileAsync = promisify(execFile);

/**
 * Reads every version already on the registry. A package with no releases yet
 * makes `npm view` exit non-zero, which is not an error for our purposes.
 */
async function fetchPublishedVersions(packageName) {
  let stdout;
  try {
    ({ stdout } = await execFileAsync('npm', ['view', packageName, 'versions', '--json']));
  } catch {
    return [];
  }
  const parsed = JSON.parse(stdout);
  // `npm view` collapses a single version to a bare string.
  return Array.isArray(parsed) ? parsed : [parsed];
}

const manifestPath = process.argv[2];
if (!manifestPath) {
  throw new Error('stampCanaryVersion: pass the path to the package.json to stamp.');
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const published = await fetchPublishedVersions(manifest.name);
const version = resolveCanaryVersion(manifest.version, published);

manifest.version = version;
if (process.env.GITHUB_SHA) {
  manifest.gitSha = process.env.GITHUB_SHA;
}
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

if (process.env.GITHUB_OUTPUT) {
  await writeFile(process.env.GITHUB_OUTPUT, `version=${version}\n`, { flag: 'a' });
}

process.stdout.write(`${manifest.name}@${version}\n`);
