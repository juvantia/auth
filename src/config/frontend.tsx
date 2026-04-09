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
                        background-color: #080D0C !important;
                        background: #080D0C !important;
                        border: 1px solid #171d1b !important;
                        border-radius: 4px !important;
                        height: 44px !important;
                        box-sizing: border-box !important;
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                    [data-supertokens~=inputContainer]:focus-within {
                        border-color: var(--primary) !important;
                        background-color: #171d1b !important;
                        background: #171d1b !important;
                        box-shadow: 0 0 15px rgba(0, 255, 136, 0.1) !important;
                    }
                    [data-supertokens~=input] {
                        color: var(--text-primary) !important;
                        background-color: transparent !important;
                        background: transparent !important;
                        font-family: var(--font-grotesk) !important;
                        font-size: 14px !important;
                        outline: none !important;
                        border: none !important;
                        border-radius: 4px !important;
                        height: 44px !important;
                        width: 100% !important;
                        padding-left: 15px !important;
                        box-sizing: border-box !important;
                    }
                    input, input:internal-autofill-selected {
                        background-color: transparent !important;
                        background: transparent !important;
                        color: var(--text-primary) !important;
                        height: 44px !important;
                        border: none !important;
                        outline: none !important;
                    }
                    [data-supertokens~=button] {
                        background-color: rgba(0, 255, 136, 0.03) !important;
                        border: 1px solid var(--primary) !important;
                        color: var(--primary) !important;
                        font-family: var(--font-grotesk) !important;
                        font-weight: 600 !important;
                        text-transform: uppercase !important;
                        letter-spacing: 0.25em !important;
                        border-radius: 4px !important;
                        height: 44px !important;
                        font-size: 11px !important;
                        margin-top: 20px !important;
                        box-sizing: border-box !important;
                    }
                    [data-supertokens~=button]:hover {
                        background-color: var(--primary) !important;
                        color: #050a09 !important;
                    }
                    [data-supertokens~=superTokensBranding] {
                        opacity: 0.2;
                        margin-top: 10px !important;
                    }
                    [data-supertokens~=divider] {
                        display: none;
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
