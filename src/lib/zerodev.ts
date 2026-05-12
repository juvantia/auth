import {
    createKernelAccount,
    createKernelAccountClient,
} from "@zerodev/sdk";
import { toPasskeyValidator, PasskeyValidatorContractVersion } from "@zerodev/passkey-validator";
import { toWebAuthnKey, WebAuthnMode } from "@zerodev/webauthn-key";
import { KERNEL_V3_1, getEntryPoint } from "@zerodev/sdk/constants";
import { http, createPublicClient, type Chain } from "viem";
import { arcTestnet } from "viem/chains";

const PROJECT_ID = process.env.NEXT_PUBLIC_PROJECT_ID || process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID || "5e727b99-00c4-4d64-83a6-95b0a29ff2a3";
const BUNDLER_URL = `https://rpc.zerodev.app/api/v3/${PROJECT_ID}/chain/5042002`;
const PAYMASTER_URL = `https://rpc.zerodev.app/api/v3/${PROJECT_ID}/chain/5042002?selfFunded=true`;

export async function getKernelClient(params: {
    username?: string;
    createNew?: boolean
}) {
    if (typeof window === "undefined") return null;

    try {
        const publicClient = createPublicClient({
            chain: arcTestnet as Chain,
            transport: http("https://rpc.testnet.arc.network"),
        });

        const entryPoint = getEntryPoint("0.7");
        let validator: any;
        let webAuthnKey: any;

        if (params.username) {
            // Passkey Mode (WebAuthn) - Kernel v3 Style
            const rpID = window.location.hostname === "localhost" ? "localhost" : "auth.juvantia.org";
            
            webAuthnKey = await toWebAuthnKey({
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
        }

        if (!validator) {
            throw new Error("Username must be provided for Passkey creation");
        }

        // Create Kernel Account (v3.1)
        const account = await createKernelAccount(publicClient, {
            plugins: {
                sudo: validator,
            },
            entryPoint,
            kernelVersion: KERNEL_V3_1,
        });

        // Create client for account interaction
        const client = createKernelAccountClient({
            account,
            chain: arcTestnet as Chain,
            bundlerTransport: http(BUNDLER_URL),
            paymaster: {
                getPaymasterData: async (userOperation) => {
                    const { stringify } = await import('viem');
                    const res = await fetch(PAYMASTER_URL, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: stringify({
                            jsonrpc: "2.0",
                            id: 1,
                            method: "zd_sponsorUserOperation",
                            params: [userOperation, entryPoint],
                        }),
                    });
                    const data = await res.json();
                    if (!res.ok || data.error) {
                        console.error("Paymaster Error Body:", data);
                        throw new Error(data.error?.message || `Paymaster failed with status ${res.status}`);
                    }
                    return data.result;
                },
            },
        });

        return {
            client,
            pubKey: (webAuthnKey as any)?.publicKeyId || (validator as any).getIdentifier?.() || (validator as any).id || "Passkey_ID"
        };

    } catch (err: any) {
        console.error("ZeroDev Client Init Failed:", err);
        throw err;
    }
}
