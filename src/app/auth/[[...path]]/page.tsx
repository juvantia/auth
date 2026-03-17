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

    return componentToRender;
}
