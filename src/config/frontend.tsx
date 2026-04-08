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
                    /* Главный контейнер */
                    [data-supertokens~=container] {
                        --container-bg: transparent;
                        --primary: #00FF88;
                        --text-primary: #dfe4e1;
                        --text-secondary: #b9cbb9;
                        --error: #FF4757;
                        border: none;
                        box-shadow: none;
                        background: transparent !important;
                        font-family: var(--font-grotesk), sans-serif;
                    }
                    /* Карточка */
                    [data-supertokens~=row] {
                        background: transparent !important;
                        padding-bottom: 20px;
                    }
                    /* Тексты по умолчанию - убираем */
                    [data-supertokens~=headerTitle], [data-supertokens~=headerSubtitle] {
                        display: none !important;
                    }
                    /* Метки (Label) */
                    [data-supertokens~=label] {
                        font-family: var(--font-cinzel) !important;
                        text-transform: uppercase !important;
                        letter-spacing: 0.2em !important;
                        color: var(--primary) !important;
                        font-size: 10px !important;
                        margin-bottom: 10px !important;
                        opacity: 0.8 !important;
                    }
                    /* Поле ввода */
                    [data-supertokens~=inputContainer] {
                        background: rgba(10, 15, 14, 0.9) !important;
                        border: 1px solid rgba(0, 255, 136, 0.2) !important;
                        border-radius: 2px !important;
                    }
                    [data-supertokens~=inputContainer]:focus-within {
                        border-color: var(--primary) !important;
                        box-shadow: 0 0 15px rgba(0, 255, 136, 0.2) !important;
                    }
                    [data-supertokens~=input] {
                        background: transparent !important;
                        color: var(--text-primary) !important;
                        font-family: var(--font-grotesk) !important;
                        letter-spacing: 0.1em;
                        font-size: 14px;
                        padding: 12px !important;
                    }
                    /* Кнопка */
                    [data-supertokens~=button] {
                        background: rgba(0, 255, 136, 0.05) !important;
                        border: 1px solid var(--primary) !important;
                        color: var(--primary) !important;
                        font-family: var(--font-grotesk) !important;
                        font-weight: 700 !important;
                        letter-spacing: 0.4em !important;
                        text-transform: uppercase !important;
                        border-radius: 2px !important;
                        height: 56px !important;
                        font-size: 12px !important;
                        transition: all 0.3s ease !important;
                        margin-top: 10px !important;
                    }
                    [data-supertokens~=button]:hover {
                        background: var(--primary) !important;
                        color: #050a09 !important;
                        box-shadow: 0 0 30px rgba(0, 255, 136, 0.6) !important;
                    }
                    [data-supertokens~=superTokensBranding] {
                        opacity: 0.1;
                        margin-top: 50px;
                    }
                `,
                override: {
                    components: {
                        PasswordlessHeader: ({ DefaultComponent, ...props }: any) => {
                            return (
                                <div className="flex flex-col items-center gap-4 mb-4 pt-4">
                                    <div className="flex flex-col items-center gap-2">
                                        <h1 className="font-cinzel text-2xl font-bold tracking-[0.4em] text-primary uppercase text-center">
                                            Authentication
                                        </h1>
                                        <div className="w-32 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                                    </div>
                                    <p className="font-grotesk text-[10px] uppercase tracking-[0.3em] text-text-secondary/40 text-center">
                                        Secure Identity Node
                                    </p>
                                </div>
                            );
                        },
                        EmailForm: ({ DefaultComponent, ...props }: any) => {
                            return (
                                <div className="p-10 border border-white/5 bg-[#050a09]/80 backdrop-blur-2xl relative shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
                                    <DefaultComponent {...props} />
                                </div>
                            );
                        },
                        UserInputCodeForm: ({ DefaultComponent, ...props }: any) => {
                            return (
                                <div className="p-10 border border-white/5 bg-[#050a09]/80 backdrop-blur-2xl relative shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
                                    <div className="mb-8 text-center">
                                        <p className="font-grotesk text-[11px] uppercase tracking-[0.2em] text-primary/80">
                                            Security Verification Required
                                        </p>
                                    </div>
                                    <DefaultComponent {...props} />
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
