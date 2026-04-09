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
                        background-color: #262b2a !important;
                        background: #262b2a !important;
                        border: none !important;
                        border-radius: 4px !important;
                        height: 44px !important;
                        box-sizing: border-box !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        display: flex !important;
                        align-items: center !important;
                        -webkit-text-size-adjust: 100% !important;
                    }
                    [data-supertokens~=inputContainer]:focus-within {
                        border: 1px solid var(--primary) !important;
                        background-color: #171d1b !important;
                        background: #171d1b !important;
                    }
                    [data-supertokens~=input] {
                        color: var(--text-primary) !important;
                        background-color: #262b2a !important;
                        background: #262b2a !important;
                        font-family: var(--font-grotesk) !important;
                        font-size: 16px !important;
                        outline: none !important;
                        border: none !important;
                        box-shadow: none !important;
                        height: 100% !important;
                        width: 100% !important;
                        padding-left: 15px !important;
                        box-sizing: border-box !important;
                        -webkit-appearance: none !important;
                        margin: 0 !important;
                        border-radius: 4px !important;
                    }
                    [data-supertokens~=input]:focus {
                        background-color: #171d1b !important;
                        background: #171d1b !important;
                    }
                    input {
                        background-color: #262b2a !important;
                        background: #262b2a !important;
                        color: var(--text-primary) !important;
                        border: none !important;
                        outline: none !important;
                        box-shadow: none !important;
                        height: 100% !important;
                        width: 100% !important;
                        margin: 0 !important;
                        -webkit-appearance: none !important;
                        font-size: 16px !important;
                    }
                    input:focus {
                        background-color: #171d1b !important;
                        background: #171d1b !important;
                    }
                    input:-webkit-autofill {
                        -webkit-box-shadow: 0 0 0px 1000px #262b2a inset !important;
                        -webkit-text-fill-color: var(--text-primary) !important;
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
                        margin-top: 15px !important;
                    }
                    [data-supertokens~=button]:hover:not(:disabled) {
                        background-color: var(--primary) !important;
                        color: #050a09 !important;
                    }
                    [data-supertokens~=button]:disabled {
                        opacity: 0.6 !important;
                        cursor: not-allowed !important;
                    }
                    [data-supertokens~=secondaryText] {
                        color: var(--text-secondary) !important;
                        font-family: var(--font-grotesk) !important;
                        font-size: 11px !important;
                        text-transform: uppercase !important;
                        letter-spacing: 0.1em !important;
                        text-decoration: none !important;
                        opacity: 0.5 !important;
                        display: flex !important;
                        justify-content: center !important;
                        align-items: center !important;
                        gap: 16px !important;
                        width: 100% !important;
                        margin: 20px auto 0 auto !important;
                        cursor: pointer !important;
                        transition: opacity 0.2s !important;
                    }
                    /* Force arrow to stay with text and have space */
                    [data-supertokens~=secondaryText] img,
                    [data-supertokens~=secondaryText] svg,
                    [data-supertokens~=secondaryText] [class*="Arrow"] {
                        position: static !important;
                        margin: 0 !important;
                        margin-right: 12px !important;
                        display: inline-block !important;
                        width: 12px !important;
                        height: auto !important;
                    }
                    [data-supertokens~=secondaryText]:hover {
                        opacity: 1 !important;
                        color: var(--primary) !important;
                    }
                    [data-supertokens~=superTokensBranding] {
                        display: none !important;
                    }
                    [data-supertokens~=divider] {
                        display: none !important;
                    }
                    [data-supertokens~=resendEmail] {
                        color: #00D4FF !important;
                        font-family: var(--font-grotesk) !important;
                        text-transform: uppercase !important;
                        letter-spacing: 0.1em !important;
                        font-size: 10px !important;
                        text-decoration: none !important;
                    }
                    /* OTP Header Text Alignment */
                    [data-supertokens~=row] [data-supertokens~=secondaryText] {
                        display: block !important;
                        text-align: center !important;
                        width: 100% !important;
                        margin-bottom: 25px !important;
                        opacity: 0.7 !important;
                        line-height: 1.6 !important;
                    }
                    [data-supertokens~=emailSnippet] {
                        display: block !important;
                        color: var(--primary) !important;
                        font-weight: 600 !important;
                        opacity: 1 !important;
                        margin-top: 4px !important;
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
