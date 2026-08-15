'use client';

import React from 'react';

interface RedirectOverlayProps {
  isRedirecting: boolean;
  hasAuthRedirect: boolean;
  isDeepLink: boolean;
  authRedirectValue: string;
  jwt: string;
}

export default function RedirectOverlay({
  isRedirecting,
  hasAuthRedirect,
  isDeepLink,
  authRedirectValue,
  jwt,
}: RedirectOverlayProps) {
  if (!isRedirecting) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 animate-in fade-in duration-500">
      <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(0,255,136,0.15)]">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00FF88" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <h2 className="font-cinzel text-xl uppercase tracking-widest text-primary mb-2">Access Granted</h2>
      <p className="font-grotesk text-[11px] uppercase tracking-[0.2em] text-text-secondary/60 mb-6">
        {hasAuthRedirect ? "Redirecting to Application..." : "Synchronizing with Services..."}
      </p>
      {hasAuthRedirect && (
        <div className="flex flex-col items-center gap-4 mt-2">
          <a
            href={
              (() => {
                const decoded = decodeURIComponent(authRedirectValue);
                const separator = decoded.includes('?') ? '&' : '?';
                return jwt ? `${decoded}${separator}token=${jwt}` : '#';
              })()
            }
            onClick={(e) => {
              if (!jwt) e.preventDefault();
            }}
            className={`neon-btn-primary px-8 py-3.5 rounded-sm text-[11px] uppercase tracking-widest no-underline shadow-[0_0_20px_rgba(0,255,136,0.25)] hover:shadow-[0_0_30px_rgba(0,255,136,0.5)] transition-all ${!jwt ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {jwt ? "Open Juvantia Cockpit" : "Generating Session..."}
          </a>
          <p className="font-grotesk text-[9px] uppercase tracking-wider text-text-secondary/40 max-w-[240px] leading-relaxed">
            If the application did not open automatically, click the button above to launch it manually.
          </p>
        </div>
      )}
    </div>
  );
}
