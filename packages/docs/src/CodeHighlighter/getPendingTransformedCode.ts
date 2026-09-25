import type { Code } from './types';

/**
 * The last finished transform-deltas computation: the loaded code it started
 * from and the code it produced (highlighted, with the deltas embedded).
 */
export interface FinishedTransformedCode {
  loaded?: Code;
  output?: Code;
}

/**
 * Whether two loaded variants hold the same content. A new object with equal
 * content counts as the same, so a re-parse that changes nothing (a `refresh()`
 * returning the same sources) keeps the finished output.
 */
function isSameVariantContent(current: Code[string], previous: Code[string]): boolean {
  if (current === previous) {
    return true;
  }
  if (!current || !previous || typeof current !== 'object' || typeof previous !== 'object') {
    return false;
  }
  return JSON.stringify(current) === JSON.stringify(previous);
}

/**
 * The code to show while the transform deltas for a new `parsedCode` are still
 * being computed. A variant whose loaded content is unchanged keeps the finished
 * output, deltas included, so its transformed views stay highlighted. A changed
 * or new variant shows its new parse: highlighted, with its transforms applying
 * to its text (as plain text) until the deltas land. So the code shown is never
 * older than the loaded code. Returns `undefined` before the first computation
 * has finished (the first load), when there's no highlighted output to keep.
 */
export function getPendingTransformedCode(
  parsedCode: Code,
  loadedCode: Code | undefined,
  finished: FinishedTransformedCode,
): Code | undefined {
  const { loaded, output } = finished;
  if (!loaded || !output) {
    return undefined;
  }
  const pending: Code = {};
  for (const [variantName, variant] of Object.entries(parsedCode)) {
    const finishedVariant = output[variantName];
    pending[variantName] =
      finishedVariant !== undefined &&
      isSameVariantContent(loadedCode?.[variantName], loaded[variantName])
        ? finishedVariant
        : variant;
  }
  return pending;
}
