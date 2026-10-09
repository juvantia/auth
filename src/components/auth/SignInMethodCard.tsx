'use client';

import React from 'react';

interface SignInMethodCardProps {
  email?: string | null;
}

export default function SignInMethodCard({ email }: SignInMethodCardProps) {
  return (
    <div className="neon-card flex flex-col gap-3">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-1 h-4 bg-secondary/60 rounded-full" />
        <h3 className="font-cinzel text-[11px] uppercase tracking-widest text-text-secondary/70">
          Sign-In Method
        </h3>
      </div>
      <div className="flex items-center justify-between bg-surface-container border border-border/10 px-4 py-3 rounded-sm">
        <div>
          <p className="font-grotesk text-[9px] uppercase tracking-widest text-text-secondary/40 mb-0.5">Email</p>
          <p className="font-inter text-[13px] text-text-primary">{email || '—'}</p>
        </div>
        <button
          disabled
          className="font-grotesk text-[8px] uppercase tracking-widest text-text-secondary/40 border border-border/20 bg-surface-lowest/50 px-2.5 py-1 rounded-sm opacity-60 cursor-not-allowed select-none"
        >
          Change
        </button>
      </div>
    </div>
  );
}
