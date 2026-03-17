import { createModularAccountAlchemyClient, AlchemyWebSigner } from "@alchemy/aa-alchemy";
import { baseSepolia } from "viem/chains";

export const ALCHEMY_RPC_URL = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || `https://base-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`;

// Экспортируем переменную, но инициализировать будем только в браузере
export let signer: AlchemyWebSigner | null = null;

export async function getSmartAccountClient(jwtToken: string) {
    if (typeof window === "undefined") return null;

    if (!signer) {
        signer = new AlchemyWebSigner({
          client: {
            connection: {
              rpcUrl: ALCHEMY_RPC_URL,
            },
            iframeConfig: {
              iframeContainerId: "turnkey-iframe-container",
            },
          },
        });
    }
    try {
        // 1. Авторизуем Signer через JWT токен от SuperTokens
        await signer.authenticate({
            type: "jwt",
            jwt: jwtToken,
        } as any);

        // 2. Создаем или получаем Modular Smart Account (ERC-4337)
        const client = await createModularAccountAlchemyClient({
            chain: baseSepolia,
            signer: signer,
            apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
            // (Опционально) Газовая политика для спонсирования транзакций пользователей
            gasManagerConfig: {
                policyId: process.env.NEXT_PUBLIC_ALCHEMY_GAS_POLICY_ID || "",
            }
        });

        return client;
    } catch (err) {
        console.error("Alchemy Smart Account init failed:", err);
        return null;
    }
}
