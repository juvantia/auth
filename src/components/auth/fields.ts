import type { CSSProperties, PointerEvent } from 'react';

// The moment an element rises in after its plate has entered.
export const at = (ms: number) => ({ '--at': `${ms}ms` }) as CSSProperties;

// A recess focuses its input wherever it is pressed.
export const focusField = (event: PointerEvent<HTMLDivElement>) => {
  if (event.target !== event.currentTarget) return;
  event.preventDefault();
  event.currentTarget.querySelector<HTMLElement>('input, textarea')?.focus();
};
