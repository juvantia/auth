'use client';

import React, { useEffect, useState } from 'react';
import { canHandleRoute, getRoutingComponent } from 'supertokens-auth-react/ui';
import { PasswordlessPreBuiltUI } from 'supertokens-auth-react/recipe/passwordless/prebuiltui';

export default function AuthPage() {
    const [componentToRender, setComponentToRender] = useState<React.ReactNode | null>(null);

    useEffect(() => {
        if (canHandleRoute([PasswordlessPreBuiltUI])) {
            setComponentToRender(getRoutingComponent([PasswordlessPreBuiltUI]));
        } else {
            // Если маршрут не относится к SuperTokens, можно редиректнуть или показать 404
            window.location.href = '/';
        }
    }, []);

    return (
        <main className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
            <div className="w-full max-w-md relative z-10 flex flex-col items-center gap-8">
                {/* Branding */}
                <div className="flex flex-col gap-0.5">
                    <h1 
                        className="text-xl font-normal uppercase tracking-[0.3em] bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent" 
                        style={{ fontFamily: 'var(--font-cinzel)' }}
                    >
                        Juvantia Auth
                    </h1>
                </div>

                {/* Auth Component */}
                <div className="w-full">
                    {componentToRender}
                </div>
            </div>
        </main>
    );
}
