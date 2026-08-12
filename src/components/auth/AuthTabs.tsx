'use client';

import React, { useEffect, useState } from 'react';
import { canHandleRoute, getRoutingComponent } from 'supertokens-auth-react/ui';
import { PasswordlessPreBuiltUI } from 'supertokens-auth-react/recipe/passwordless/prebuiltui';

interface AuthTabsProps {
  onSelectTab?: (tab: string) => void;
}

export default function AuthTabs({ onSelectTab }: AuthTabsProps) {
  const [activeTab, setActiveTab] = useState<'email' | 'passkey'>('email');
  const [componentToRender, setComponentToRender] = useState<React.ReactNode | null>(null);

  useEffect(() => {
    if (canHandleRoute([PasswordlessPreBuiltUI])) {
      setComponentToRender(getRoutingComponent([PasswordlessPreBuiltUI]));
    }
  }, []);

  const handleTabChange = (tab: 'email' | 'passkey') => {
    setActiveTab(tab);
    if (onSelectTab) onSelectTab(tab);
  };

  return (
    <div className="w-full max-w-md flex flex-col gap-6">
      {/* Auth Method Navigation Tabs */}
      <div className="flex border-b border-border/20">
        <button
          type="button"
          onClick={() => handleTabChange('email')}
          className={`flex-1 py-3 font-grotesk text-[11px] uppercase tracking-widest transition-all border-b-2 font-medium ${
            activeTab === 'email'
              ? 'border-primary text-primary shadow-[0_2px_10px_rgba(0,255,136,0.15)]'
              : 'border-transparent text-text-secondary/50 hover:text-text-secondary'
          }`}
        >
          Email Passcode
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('passkey')}
          className={`flex-1 py-3 font-grotesk text-[11px] uppercase tracking-widest transition-all border-b-2 font-medium ${
            activeTab === 'passkey'
              ? 'border-primary text-primary shadow-[0_2px_10px_rgba(0,255,136,0.15)]'
              : 'border-transparent text-text-secondary/50 hover:text-text-secondary'
          }`}
        >
          Passkey / Device
        </button>
      </div>

      {/* Tab Content */}
      <div className="w-full">
        {activeTab === 'email' ? (
          <div className="w-full bg-surface-container/60 border border-border/20 rounded-sm p-6 shadow-xl backdrop-blur-sm">
            {componentToRender || (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="font-grotesk text-[11px] uppercase tracking-widest text-text-secondary/60">
                  Loading SuperTokens Auth...
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full bg-surface-container/60 border border-border/20 rounded-sm p-6 flex flex-col gap-4 text-center shadow-xl backdrop-blur-sm">
            <h3 className="font-cinzel text-sm uppercase tracking-wider text-primary">
              Hardware & Passkey Auth
            </h3>
            <p className="font-inter text-[12px] text-text-secondary/70 leading-relaxed">
              Passkey authentication is managed directly by the Juvantia Core Engine. Use your webauthn device or citizen app to sign in.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
