import {
    createKernelAccount,
    createKernelAccountClient,
    createZeroDevPaymasterClient
} from "@zerodev/sdk";
import { getSocialValidator } from "@zerodev/social-validator";
import { toPasskeyValidator, PasskeyValidatorContractVersion } from "@zerodev/passkey-validator";
import { toWebAuthnKey, WebAuthnMode } from "@zerodev/webauthn-key";
import { KERNEL_V3_1, getEntryPoint } from "@zerodev/sdk/constants";
import { http, createPublicClient, type Chain } from "viem";
import { baseSepolia } from "viem/chains";

const PROJECT_ID = process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID || "00000000-0000-0000-0000-000000000000";
const BUNDLER_URL = `https://rpc.zerodev.app/api/v3/${PROJECT_ID}/chain/84532`;
const PAYMASTER_URL = `https://rpc.zerodev.app/api/v2/paymaster/${PROJECT_ID}`;

const publicClient = createPublicClient({
    chain: baseSepolia as Chain,
    transport: http()
});

const entryPoint = getEntryPoint("0.7");

export async function getKernelClient(params: {
    idToken?: string;
    username?: string;
    createNew?: boolean
}) {
    if (typeof window === "undefined") return null;

    try {
        let validator;

        if (params.username) {
            // Режим Passkey (WebAuthn) - Kernel v3 Style
            const hostname = typeof window !== "undefined" ? window.location.hostname : "unknown";
            const rpID = hostname === "localhost" ? "localhost" : "auth.juvantia.org";
            
            console.log("ZeroDev DEBUG: Initializing Passkey Validator", {
                username: params.username,
                hostname,
                rpID,
                passkeyServerUrl: `https://passkeys.zerodev.app/api/v3/${PROJECT_ID}`
            });
            
            const webAuthnKey = await toWebAuthnKey({
                passkeyName: params.username,
                rpID,
                passkeyServerUrl: `https://passkeys.zerodev.app/api/v3/${PROJECT_ID}`,
                mode: params.createNew ? WebAuthnMode.Register : WebAuthnMode.Login,
            });

            validator = await toPasskeyValidator(publicClient, {
                webAuthnKey,
                entryPoint,
                kernelVersion: KERNEL_V3_1,
                validatorContractVersion: PasskeyValidatorContractVersion.V0_0_2_UNPATCHED,
            });
        } else if (params.idToken) {
            // Режим OIDC (Social Login)
            console.log("ZeroDev: Initializing Social Validator with ID Token...");
            // ПРИМЕЧАНИЕ: getSocialValidator из @zerodev/social-validator требует Magic.
            // Если мы хотим кастомный JWT без Magic, нужно использовать другой плагин.
            // Но для старта попробуем упростить до Passkey, как и хотел пользователь.
            throw new Error("OIDC via Social Validator requires Magic redirect. Use Passkey instead.");
        } else {
            throw new Error("Username must be provided for Passkey creation");
        }

        // Создаем Kernel Account (v3.1)
        const account = await createKernelAccount(publicClient, {
            plugins: {
                sudo: validator,
            },
            entryPoint,
            kernelVersion: KERNEL_V3_1,
        });

        // Создаем клиент для взаимодействия с аккаунтом
        const kernelClient = createKernelAccountClient({
            account,
            chain: baseSepolia as Chain,
            bundlerTransport: http(BUNDLER_URL),
            paymaster: createZeroDevPaymasterClient({
                chain: baseSepolia as Chain,
                transport: http(PAYMASTER_URL),
            }),
        });

        return kernelClient;
    } catch (err) {
        console.error("ZeroDev Client Init Failed:", err);
        throw err;
    }
}
