'use client';

import React, { useEffect, useState } from 'react';
import { canHandleRoute, getRoutingComponent } from 'supertokens-auth-react/ui';
import { PasswordlessPreBuiltUI } from 'supertokens-auth-react/recipe/passwordless/prebuiltui';

export default function AuthTabs() {
  const [componentToRender, setComponentToRender] = useState<React.ReactNode | null>(null);

  useEffect(() => {
    if (canHandleRoute([PasswordlessPreBuiltUI])) {
      setComponentToRender(getRoutingComponent([PasswordlessPreBuiltUI]));
    }
  }, []);

  return (
    <div className="w-full max-w-md">
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
    </div>
  );
}
