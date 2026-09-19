import { describe, it, expect } from 'vitest';

import { resolveCanaryVersion } from './canaryVersion';

describe('resolveCanaryVersion', () => {
  describe('base version', () => {
    it('previews the next patch when the manifest version is already released', () => {
      expect(resolveCanaryVersion('0.13.3', ['0.13.1', '0.13.3'])).toBe('0.13.4-canary.0');
    });

    it('previews the manifest version itself while that release is still pending', () => {
      // The commit that bumps the manifest ahead of a release should preview the
      // release being cut, not the patch after it.
      expect(resolveCanaryVersion('0.13.3', ['0.13.1', '0.13.2'])).toBe('0.13.3-canary.0');
    });

    it('ignores a prerelease suffix left on the manifest version', () => {
      expect(resolveCanaryVersion('0.13.3-canary.4', ['0.13.3'])).toBe('0.13.4-canary.0');
    });

    it('treats a package with no releases as pending its manifest version', () => {
      expect(resolveCanaryVersion('0.1.0', [])).toBe('0.1.0-canary.0');
    });

    it('rolls minor and major boundaries through the patch bump', () => {
      expect(resolveCanaryVersion('0.13.9', ['0.13.9'])).toBe('0.13.10-canary.0');
      expect(resolveCanaryVersion('1.0.0', ['1.0.0'])).toBe('1.0.1-canary.0');
    });
  });

  describe('canary sequence', () => {
    it('numbers the first canary of a base zero', () => {
      expect(resolveCanaryVersion('0.13.3', ['0.13.3'])).toBe('0.13.4-canary.0');
    });

    it('continues from the highest canary already published for that base', () => {
      const published = ['0.13.3', '0.13.4-canary.0', '0.13.4-canary.1'];
      expect(resolveCanaryVersion('0.13.3', published)).toBe('0.13.4-canary.2');
    });

    it('compares canary numbers numerically rather than as strings', () => {
      // A plain string sort would put "9" above "10" and reuse a number.
      const published = ['0.13.3', '0.13.4-canary.9', '0.13.4-canary.10'];
      expect(resolveCanaryVersion('0.13.3', published)).toBe('0.13.4-canary.11');
    });

    it('stays ahead of a gap left by an unpublished canary', () => {
      const published = ['0.13.3', '0.13.4-canary.0', '0.13.4-canary.7'];
      expect(resolveCanaryVersion('0.13.3', published)).toBe('0.13.4-canary.8');
    });

    it('restarts the sequence for each base version', () => {
      // The 0.13.2 canaries must not influence the 0.13.4 sequence.
      const published = ['0.13.2-canary.8', '0.13.2-canary.9', '0.13.3'];
      expect(resolveCanaryVersion('0.13.3', published)).toBe('0.13.4-canary.0');
    });

    it('ignores prereleases that are not canaries', () => {
      const published = ['0.13.3', '0.13.4-beta.5', '0.13.4-canary.1'];
      expect(resolveCanaryVersion('0.13.3', published)).toBe('0.13.4-canary.2');
    });

    it('ignores malformed canary suffixes', () => {
      const published = ['0.13.3', '0.13.4-canary.abc', '0.13.4-canary.2'];
      expect(resolveCanaryVersion('0.13.3', published)).toBe('0.13.4-canary.3');
    });
  });

  describe('produced versions order correctly', () => {
    it('sorts a canary above the current release and below the one it previews', () => {
      // The whole point of the base rule: `canary` must never resolve to
      // something semver-older than `latest`.
      const canary = resolveCanaryVersion('0.13.3', ['0.13.1', '0.13.3']);
      expect(canary).toBe('0.13.4-canary.0');
      expect(comparePrecedence('0.13.3', canary)).toBeLessThan(0);
      expect(comparePrecedence(canary, '0.13.4')).toBeLessThan(0);
    });

    it('sorts a pending-release canary above the last release', () => {
      const canary = resolveCanaryVersion('0.13.3', ['0.13.1', '0.13.2']);
      expect(canary).toBe('0.13.3-canary.0');
      expect(comparePrecedence('0.13.2', canary)).toBeLessThan(0);
      expect(comparePrecedence(canary, '0.13.3')).toBeLessThan(0);
    });

    it('keeps successive canaries of one base in ascending order', () => {
      let published = ['0.13.3'];
      const emitted: string[] = [];
      for (let index = 0; index < 4; index += 1) {
        const next = resolveCanaryVersion('0.13.3', published);
        emitted.push(next);
        published = [...published, next];
      }
      expect(emitted).toEqual([
        '0.13.4-canary.0',
        '0.13.4-canary.1',
        '0.13.4-canary.2',
        '0.13.4-canary.3',
      ]);
      for (let index = 1; index < emitted.length; index += 1) {
        expect(comparePrecedence(emitted[index - 1], emitted[index])).toBeLessThan(0);
      }
    });
  });

  describe('input validation', () => {
    it('rejects a manifest version that is not semver', () => {
      expect(() => resolveCanaryVersion('not-a-version', [])).toThrow(/not a semver version/);
    });
  });
});

/**
 * Minimal semver precedence comparison covering the release and `-canary.N`
 * shapes this script produces, so the ordering assertions do not depend on a
 * semver library. Returns a negative number when `left` sorts below `right`.
 */
function comparePrecedence(left: string, right: string): number {
  const parse = (version: string) => {
    const [core, prerelease] = version.split('-');
    return {
      parts: core.split('.').map(Number),
      canary: prerelease ? Number(prerelease.split('.')[1]) : null,
    };
  };
  const a = parse(left);
  const b = parse(right);
  for (let index = 0; index < 3; index += 1) {
    if (a.parts[index] !== b.parts[index]) {
      return a.parts[index] - b.parts[index];
    }
  }
  if (a.canary === null && b.canary === null) {
    return 0;
  }
  // A prerelease sorts below the release sharing its core version.
  if (a.canary === null) {
    return 1;
  }
  if (b.canary === null) {
    return -1;
  }
  return a.canary - b.canary;
}
