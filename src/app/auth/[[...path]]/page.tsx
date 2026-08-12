import React from 'react';
import AuthTabs from '@/components/auth/AuthTabs';

export default function AuthPage() {
    return (
        <main className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-background">
            <div className="w-full max-w-md relative z-10 flex flex-col items-center gap-6 md:gap-8">
                {/* Branding */}
                <div className="flex flex-col items-center gap-0.5">
                    <h1 
                        className="text-2xl md:text-3xl font-normal uppercase tracking-[0.3em] bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent" 
                        style={{ fontFamily: 'var(--font-cinzel)' }}
                    >
                        Juvantia Auth
                    </h1>
                </div>

                {/* Auth Tabs Component */}
                <AuthTabs />
            </div>
        </main>
    );
}
