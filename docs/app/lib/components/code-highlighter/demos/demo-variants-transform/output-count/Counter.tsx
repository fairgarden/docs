import * as React from 'react';

interface CounterProps {
  count?: number;
}

export function Counter({ count = 0 }: CounterProps) {
  return (
    // @focus-start
    <p>
      Clicked <output>{count}</output> times
    </p>
    // @focus-end
  );
}
