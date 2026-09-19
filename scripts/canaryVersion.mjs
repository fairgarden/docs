/**
 * Derives the next canary version for a package from its manifest version and
 * the versions already on the registry.
 *
 * The suffix is the canary's position in its own release cycle — `0.13.4-canary.2`
 * is the third preview of `0.13.4` — so it is derived from the registry rather
 * than from any CI counter, and it restarts at 0 for every new base version.
 */

const CANARY_TAG = 'canary';
const SEMVER_CORE = /^(\d+)\.(\d+)\.(\d+)$/;

/**
 * @param {string} manifestVersion - `version` from the package manifest.
 * @param {string[]} publishedVersions - Every version already on the registry.
 * @returns {string} The version to publish, e.g. `0.13.4-canary.2`.
 */
export function resolveCanaryVersion(manifestVersion, publishedVersions) {
  const core = String(manifestVersion).split('-')[0];
  const match = SEMVER_CORE.exec(core);
  if (!match) {
    throw new Error(`canaryVersion: '${manifestVersion}' is not a semver version.`);
  }
  const [major, minor, patch] = match.slice(1).map(Number);

  // A manifest version that is not on the registry yet is the release being
  // prepared, so preview that. Otherwise the next thing to ship is the patch
  // after it. Without this the commit that bumps the manifest for a release
  // publishes a canary for the patch *after* that release.
  const released = new Set(publishedVersions);
  const base = released.has(core) ? `${major}.${minor}.${patch + 1}` : core;

  const prefix = `${base}-${CANARY_TAG}.`;
  let highest = -1;
  for (const version of publishedVersions) {
    if (!version.startsWith(prefix)) {
      continue;
    }
    const sequence = Number(version.slice(prefix.length));
    // Skip suffixes that are not plain integers; they are not ours to continue.
    if (Number.isInteger(sequence) && sequence > highest) {
      highest = sequence;
    }
  }

  return `${prefix}${highest + 1}`;
}
