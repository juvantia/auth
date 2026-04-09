import React from "react";
import Passwordless from "supertokens-auth-react/recipe/passwordless";
import Session from "supertokens-auth-react/recipe/session";
import { SuperTokensConfig } from "supertokens-auth-react/lib/build/types";

export const frontendConfig = (): SuperTokensConfig => {
    return {
        useShadowDom: false,
        appInfo: {
            appName: "Juvantia Auth",
            apiDomain: process.env.NEXT_PUBLIC_API_DOMAIN || "https://auth.juvantia.org",
            websiteDomain: process.env.NEXT_PUBLIC_WEBSITE_DOMAIN || "https://auth.juvantia.org",
            apiBasePath: "/api/auth/",
            websiteBasePath: "/auth",
        },
        recipeList: [
            Passwordless.init({
                contactMethod: "EMAIL",
                style: `
                    [data-supertokens~=container] {
                        --container-bg: #262b2a;
                        --primary: #00FF88;
                        --text-primary: #dfe4e1;
                        --text-secondary: #b9cbb9;
                        background-color: var(--container-bg) !important;
                        border: 1px solid rgba(0, 255, 136, 0.15);
                        box-shadow: 0 20px 40px rgba(0,0,0,0.6);
                        border-radius: 2px;
                        font-family: var(--font-grotesk), sans-serif;
                    }
                    [data-supertokens~=row] {
                        background-color: var(--container-bg) !important;
                    }
                    [data-supertokens~=headerTitle] {
                        display: none !important;
                    }
                    [data-supertokens~=headerSubtitle] {
                        display: none !important;
                    }
                    [data-supertokens~=label] {
                        color: var(--text-secondary);
                        font-family: var(--font-grotesk);
                        text-transform: uppercase;
                        letter-spacing: 0.15em;
                        font-size: 10px;
                        opacity: 0.8;
                    }
                    [data-supertokens~=inputContainer] {
                        background: #171d1b !important;
                        border: 1px solid rgba(0, 255, 136, 0.1) !important;
                        border-radius: 0px !important;
                    }
                    [data-supertokens~=inputContainer]:focus-within {
                        border-color: var(--primary) !important;
                        background: #080D0C !important;
                    }
                    [data-supertokens~=input] {
                        color: var(--text-primary) !important;
                        background: transparent !important;
                        font-family: var(--font-grotesk) !important;
                        font-size: 14px !important;
                    }
                    [data-supertokens~=button] {
                        background-color: rgba(0, 255, 136, 0.05) !important;
                        border: 1px solid var(--primary) !important;
                        color: var(--primary) !important;
                        font-family: var(--font-grotesk);
                        font-weight: bold;
                        letter-spacing: 0.3em;
                        border-radius: 2px;
                        transition: all 0.3s;
                        height: 50px !important;
                    }
                    [data-supertokens~=button]:hover {
                        background-color: var(--primary) !important;
                        color: #050a09 !important;
                        box-shadow: 0 0 20px rgba(0, 255, 136, 0.4);
                    }
                    [data-supertokens~=superTokensBranding] {
                        opacity: 0.1;
                    }
                    [data-supertokens~=divider] {
                        display: none;
                    }
                `,
                override: {
                    components: {
                        PasswordlessHeader: () => {
                            return (
                                <div className="flex flex-col items-center gap-4 mb-4 pt-4 w-full">
                                    <h1 className="font-cinzel text-xl font-bold tracking-[0.4em] text-[#00FF88] uppercase text-center block" style={{ color: '#00FF88' }}>
                                        Juvantia Auth
                                    </h1>
                                    <div className="w-32 h-[1px] bg-[#00FF88]/30" />
                                </div>
                            );
                        },
                        PasswordlessUserInputCodeHeader: () => {
                            return (
                                <div className="flex flex-col items-center gap-4 mb-4 pt-4 w-full">
                                    <h1 className="font-cinzel text-xl font-bold tracking-[0.4em] text-[#00FF88] uppercase text-center block" style={{ color: '#00FF88' }}>
                                        Verification
                                    </h1>
                                    <div className="w-32 h-[1px] bg-[#00FF88]/30" />
                                </div>
                            );
                        }
                    }
                } as any
            }),
            Session.init({
                tokenTransferMethod: "cookie",
                sessionTokenFrontendDomain: ".juvantia.org",
            }),
    ],
    async getRedirectionURL(context) {
        if (context.action === "SUCCESS" && typeof window !== "undefined") {
            const urlParams = new URLSearchParams(window.location.search);
            const redirect = urlParams.get("auth_redirect") || urlParams.get("redirectToPath");
            if (redirect === "close") {
                window.close();
                return undefined;
            }
            if (redirect) {
                return decodeURIComponent(redirect);
            }
        }
        return undefined;
    }
  };
};
