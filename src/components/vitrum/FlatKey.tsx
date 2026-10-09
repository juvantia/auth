'use client';

import type { ReactNode } from 'react';

interface FlatKeyProps {
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  // An exit is red: the only red that is not an alarm.
  exit?: boolean;
  disabled?: boolean;
  confirmed?: boolean;
  ariaLabel?: string;
}

// A flat control for small actions (edit, cancel, copy, sign out). It never behaves like a glass key.
export default function FlatKey({ label, icon, onClick, exit = false, disabled = false, confirmed = false, ariaLabel }: FlatKeyProps) {
  const classes = ['vt-flat'];
  if (exit) classes.push('vt-flat--exit');
  if (confirmed) classes.push('is-confirmed');

  return (
    <button
      type="button"
      className={classes.join(' ')}
      aria-label={ariaLabel}
      aria-disabled={disabled ? true : undefined}
      onClick={() => {
        if (!disabled) onClick?.();
      }}
    >
      {label}
      {icon}
    </button>
  );
}
