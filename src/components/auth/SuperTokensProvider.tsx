'use client';

import React from 'react';
import SuperTokens, { SuperTokensWrapper } from 'supertokens-auth-react';
import { frontendConfig } from '@/config/frontend';

if (typeof window !== 'undefined') {
    SuperTokens.init(frontendConfig());
}

export const SuperTokensProvider = ({ children }: { children: React.ReactNode }) => {
    return <SuperTokensWrapper>{children}</SuperTokensWrapper>;
};
