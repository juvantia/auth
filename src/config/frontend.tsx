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
                    /* Главный контейнер - делаем полностью прозрачным */
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
                    /* Сама карточка формы */
                    [data-supertokens~=row] {
                        background: transparent !important;
                        padding-bottom: 20px;
                    }
                    /* Убираем стандартные тексты, так как мы их заменим в компонентах */
                    [data-supertokens~=headerTitle] {
                        display: none !important;
                    }
                    [data-supertokens~=headerSubtitle] {
                       display: none !important;
                    }
                    /* Поле ввода */
                    [data-supertokens~=inputContainer] {
                        background: rgba(10, 15, 14, 0.8) !important;
                        border: 1px solid rgba(0, 255, 136, 0.15) !important;
                        border-radius: 2px !important;
                    }
                    [data-supertokens~=inputContainer]:focus-within {
                        border-color: var(--primary) !important;
                        box-shadow: 0 0 15px rgba(0, 255, 136, 0.15) !important;
                    }
                    [data-supertokens~=input] {
                        color: var(--text-primary) !important;
                        font-family: var(--font-grotesk) !important;
                        letter-spacing: 0.1em;
                        text-transform: uppercase;
                        font-size: 13px;
                    }
                    /* Кнопка */
                    [data-supertokens~=button] {
                        background: rgba(0, 255, 136, 0.05) !important;
                        border: 1px solid var(--primary) !important;
                        color: var(--primary) !important;
                        font-family: var(--font-grotesk) !important;
                        font-weight: 700 !important;
                        letter-spacing: 0.3em !important;
                        text-transform: uppercase !important;
                        border-radius: 2px !important;
                        height: 54px !important;
                        font-size: 12px !important;
                        transition: all 0.3s ease !important;
                    }
                    [data-supertokens~=button]:hover {
                        background: var(--primary) !important;
                        color: #050a09 !important;
                        box-shadow: 0 0 25px rgba(0, 255, 136, 0.5) !important;
                    }
                    [data-supertokens~=button][data-supertokens~=loading] {
                        opacity: 0.7;
                        background: rgba(0, 255, 136, 0.2) !important;
                    }
                    [data-supertokens~=superTokensBranding] {
                        opacity: 0.15;
                        margin-top: 40px;
                    }
                `,
                override: {
                    components: {
                        PasswordlessHeader: ({ DefaultComponent, ...props }: any) => {
                            return (
                                <div className="flex flex-col items-center gap-4 mb-10 pt-6">
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
                        PasswordlessEmailForm: ({ DefaultComponent, ...props }: any) => {
                             // Оборачиваем в нашу карточку с размытием
                            return (
                                <div className="p-8 border border-border/10 bg-[#080D0C]/60 backdrop-blur-xl relative overflow-hidden">
                                     {/* Эффект свечения сверху */}
                                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent shadow-[0_0_15px_rgba(0,255,136,0.3)]" />
                                    <DefaultComponent {...props} />
                                </div>
                            );
                        },
                        PasswordlessUserInputCodeForm: ({ DefaultComponent, ...props }: any) => {
                            return (
                                <div className="p-8 border border-border/10 bg-[#080D0C]/60 backdrop-blur-xl relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent shadow-[0_0_15px_rgba(0,255,136,0.3)]" />
                                    <div className="mb-6 text-center">
                                        <p className="font-grotesk text-[11px] uppercase tracking-widest text-primary/80">
                                            Enter the transmission code
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
