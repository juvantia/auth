import React from "react";
import Passwordless from "supertokens-auth-react/recipe/passwordless";
import Session from "supertokens-auth-react/recipe/session";
import { SuperTokensConfig } from "supertokens-auth-react/lib/build/types";

export const frontendConfig = (): SuperTokensConfig => {
    return {
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
                        --container-bg: transparent;
                        --input-border: rgba(0, 255, 136, 0.15);
                        --primary: #00FF88;
                        --text-primary: #dfe4e1;
                        --text-secondary: #b9cbb9;
                        --error: #FF4757;
                        border: none;
                        box-shadow: none;
                        font-family: var(--font-grotesk), sans-serif;
                        max-width: 400px;
                        margin: 0 auto;
                    }
                    [data-supertokens~=row] {
                        padding-bottom: 20px;
                    }
                    [data-supertokens~=headerTitle] {
                        display: none;
                    }
                    [data-supertokens~=headerSubtitle] {
                       display: none;
                    }
                    [data-supertokens~=inputContainer] {
                        background: rgba(5, 10, 9, 0.8);
                        border: 1px solid var(--input-border);
                        border-radius: 2px;
                        transition: all 0.3s ease;
                    }
                    [data-supertokens~=inputContainer]:focus-within {
                        border-color: var(--primary);
                        box-shadow: 0 0 15px rgba(0, 255, 136, 0.1);
                    }
                    [data-supertokens~=input] {
                        color: var(--text-primary);
                        font-family: var(--font-grotesk);
                        letter-spacing: 0.1em;
                        text-transform: uppercase;
                        font-size: 13px;
                    }
                    [data-supertokens~=label] {
                        font-family: var(--font-cinzel);
                        text-transform: uppercase;
                        letter-spacing: 0.2em;
                        color: var(--text-secondary);
                        font-size: 10px;
                        margin-bottom: 8px;
                        opacity: 0.7;
                    }
                    [data-supertokens~=button] {
                        background: rgba(0, 255, 136, 0.05) !important;
                        border: 1px solid var(--primary) !important;
                        color: var(--primary) !important;
                        font-family: var(--font-grotesk) !important;
                        font-weight: 700 !important;
                        letter-spacing: 0.3em !important;
                        text-transform: uppercase !important;
                        border-radius: 2px !important;
                        height: 50px !important;
                        transition: all 0.3s ease !important;
                        font-size: 12px !important;
                    }
                    [data-supertokens~=button]:hover {
                        background: var(--primary) !important;
                        color: #050a09 !important;
                        box-shadow: 0 0 20px rgba(0, 255, 136, 0.4) !important;
                    }
                    /* Loading State Pulse */
                    [data-supertokens~=button][data-supertokens~=loading] {
                        opacity: 0.7;
                        animation: neon-pulse 1.5s infinite;
                        background: rgba(0, 255, 136, 0.1) !important;
                    }
                    @keyframes neon-pulse {
                        0% { box-shadow: 0 0 5px rgba(0, 255, 136, 0.2); }
                        50% { box-shadow: 0 0 20px rgba(0, 255, 136, 0.5); }
                        100% { box-shadow: 0 0 5px rgba(0, 255, 136, 0.2); }
                    }
                    [data-supertokens~=divider] {
                        display: none;
                    }
                    [data-supertokens~=superTokensBranding] {
                        opacity: 0.15;
                        filter: grayscale(1);
                        font-size: 8px;
                        margin-top: 40px;
                        transition: opacity 0.3s;
                    }
                    [data-supertokens~=superTokensBranding]:hover {
                        opacity: 0.4;
                    }
                `,
                override: {
                    components: {
                        PasswordlessHeader_Override: ({ DefaultComponent, ...props }) => {
                            return (
                                <div className="flex flex-col items-center gap-4 mb-10 pt-10">
                                    <div className="flex flex-col items-center gap-1">
                                        <h1 className="font-cinzel text-2xl font-bold tracking-[0.3em] bg-gradient-to-r from-[#00FF88] to-[#00D4FF] bg-clip-text text-transparent uppercase text-center">
                                            Authentication
                                        </h1>
                                        <div className="w-24 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                                    </div>
                                    <p className="font-grotesk text-[10px] uppercase tracking-[0.25em] text-text-secondary/40 text-center">
                                        Secure Identity Access
                                    </p>
                                </div>
                            );
                        },
                        PasswordlessEmailForm_Override: ({ DefaultComponent, ...props }) => {
                            return (
                                <div className="neon-card bg-surface-low/40 backdrop-blur-md border border-border/10 p-1">
                                    <DefaultComponent {...props} />
                                </div>
                            );
                        },
                        PasswordlessUserInputCodeForm_Override: ({ DefaultComponent, ...props }) => {
                            return (
                                <div className="neon-card bg-surface-low/40 backdrop-blur-md border border-border/10 p-1">
                                    <div className="px-6 pt-6 -mb-4">
                                        <p className="font-grotesk text-[11px] uppercase tracking-widest text-primary/80">
                                            Enter security code
                                        </p>
                                    </div>
                                    <DefaultComponent {...props} />
                                </div>
                            );
                        }
                    }
                }
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
