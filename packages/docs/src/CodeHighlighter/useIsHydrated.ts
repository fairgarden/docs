import * as React from 'react';

// Nothing changes after hydration, so there is nothing to subscribe to.
function subscribeToNothing(): () => void {
  return () => {};
}

function getHydratedSnapshot(): boolean {
  return true;
}

function getNotHydratedSnapshot(): boolean {
  return false;
}

/**
 * Whether this render comes after hydration: `false` while server rendering and
 * while hydrating, `true` on every other render, including a component's first
 * render on the client outside hydration. A component that hydrated renders once
 * more, right after hydration, with `true`.
 *
 * Pass `track: false` when the caller has nothing to hold back during hydration:
 * the hook then returns `true` everywhere and never causes that extra render. The
 * value of `track` must be the same in the server render and in the hydration.
 */
export function useIsHydrated(track: boolean = true): boolean {
  return React.useSyncExternalStore(
    subscribeToNothing,
    getHydratedSnapshot,
    track ? getNotHydratedSnapshot : getHydratedSnapshot,
  );
}
