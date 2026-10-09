'use client';

import type { ReactNode } from 'react';
import World from './World';
import './vitrum.css';

interface VitrumRootProps {
  // A moment (authenticating, granted) holds one thing in the middle; a page is the column of plates.
  moment: boolean;
  screen: string;
  children: ReactNode;
}

// Juvantia Auth after SuperTokens hands over a session: one pseudo-mobile column of Neon Vitrum glass over the land.
// The sign-in itself stays SuperTokens' own; nothing here reaches it, as every class is prefixed `vt-`.
export default function VitrumRoot({ moment, screen, children }: VitrumRootProps) {
  return (
    <div className="vt-root">
      <svg className="vt-defs" width="0" height="0" aria-hidden="true" focusable="false">
        <defs>
          {/* The emblem's gradient, horizontal across an icon's 24-unit drawing. */}
          <linearGradient id="vt-brand-ink" gradientUnits="userSpaceOnUse" x1="2" y1="12" x2="22" y2="12">
            <stop offset="0" stopColor="#00ff88" />
            <stop offset="1" stopColor="#00d4ff" />
          </linearGradient>
        </defs>
      </svg>
      <World screen={screen} />
      <main className={moment ? 'vt-page vt-page--moment' : 'vt-page'}>{children}</main>
    </div>
  );
}
