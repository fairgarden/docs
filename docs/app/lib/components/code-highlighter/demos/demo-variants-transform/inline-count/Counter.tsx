import * as React from 'react';

interface CounterProps {
  count?: number;
}

export function Counter({ count = 0 }: CounterProps) {
  return (
    // @focus
    <button type="button">Clicked {count} times</button>
  );
}
