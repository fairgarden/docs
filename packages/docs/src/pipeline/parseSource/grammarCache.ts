/**
 * Light, client-reachable facade over the grammar engine in `./parseSource`.
 *
 * Importing this module must NOT pull `createStarryNight` (the regex engine:
 * vscode-textmate + oniguruma) or any grammar JSON into the bundle — the engine
 * is reached only through the dynamic `import()` in {@link ensureGrammars}. That
 * keeps `CodeHighlighter` (which drives lazy, per-language grammar loading from
 * the client chunk) free of the engine until a block actually needs to
 * highlight, mirroring the `./useCode/transformEngineCache` split.
 */

// Must match READY_SCOPES_KEY in ./parseSource. Duplicated intentionally to keep
// this module free of a static `./parseSource` import (which would pull the
// engine into every consumer's bundle).
const READY_SCOPES_KEY = '__docs_infra_starry_night_ready_scopes__';

function getReadyScopes(): ReadonlySet<string> | undefined {
  return (globalThis as Record<string, unknown>)[READY_SCOPES_KEY] as
    | ReadonlySet<string>
    | undefined;
}

/**
 * Synchronously reports whether every given scope's grammar is registered and
 * ready for `parseSource` to highlight with. A grammar that is still being
 * registered doesn't count yet. Reads the shared singleton's state without
 * importing the engine, so it is safe on the render path (e.g. a `useState`
 * initializer) to decide whether a block can highlight immediately or must wait
 * — avoiding a cold flash.
 */
export function areGrammarsRegistered(scopes: string[]): boolean {
  if (scopes.length === 0) {
    return true;
  }
  const readyScopes = getReadyScopes();
  if (!readyScopes) {
    return false;
  }
  return scopes.every((scope) => readyScopes.has(scope));
}

/**
 * Ensures the grammars for the given scopes (and their dependencies) are
 * registered, loading the engine and the per-scope grammar chunks on demand. A
 * synchronous no-op when the scopes are already registered (warm — e.g. a prior
 * block, the speculative preload, or an eager `CodeProvider` primed them), so it
 * is cheap to call on render or as a speculative preload. Fails open: a failed
 * load leaves the affected scope as plain text.
 */
export async function ensureGrammars(scopes: string[]): Promise<void> {
  if (scopes.length === 0 || areGrammarsRegistered(scopes)) {
    return;
  }
  // Cold: pull the engine + registration impl now (this is when a block is about
  // to highlight, so the engine load is expected and runs in parallel with the
  // content via the speculative preload).
  const { registerGrammars } = await import('./parseSource');
  await registerGrammars(scopes);
}

/**
 * Registers ALL grammars via the single barrel chunk (~146 KB gzip). Backs the
 * `preloadGrammars: 'all'` provider opt-in — for layouts that will render code
 * in many languages and prefer one upfront fetch over per-language chunks. Fails
 * open.
 */
export async function preloadAllGrammars(): Promise<void> {
  const { registerAllGrammars } = await import('./parseSource');
  await registerAllGrammars();
}
