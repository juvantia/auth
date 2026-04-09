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
        languageTranslations: {
            translations: {
                en: {
                    PWLESS_EMAIL_PASSWORDLESS_SECTION_TITLE: "Authentication",
                    PWLESS_USER_INPUT_CODE_HEADER_TITLE: "Verification",
                    PWLESS_CONTINUE_BUTTON: "CONTINUE",
                }
            }
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
                    }
                    [data-supertokens~=row] {
                        background-color: var(--container-bg) !important;
                    }
                    [data-supertokens~=headerTitle] {
                        font-family: var(--font-cinzel), serif !important;
                        text-transform: uppercase !important;
                        letter-spacing: 0.25em !important;
                        color: var(--primary) !important;
                        font-weight: 700 !important;
                    }
                    [data-supertokens~=headerSubtitle] {
                        display: none;
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
                    }
                    [data-supertokens~=button]:hover {
                        background-color: var(--primary) !important;
                        color: #050a09 !important;
                        box-shadow: 0 0 20px rgba(0, 255, 136, 0.4);
                    }
                    [data-supertokens~=superTokensBranding] {
                        opacity: 0.2;
                    }
                `
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
