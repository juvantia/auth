import { createModularAccountAlchemyClient, AlchemyWebSigner } from "@alchemy/aa-alchemy";
import { baseSepolia } from "viem/chains";

export const ALCHEMY_RPC_URL = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || `https://base-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`;

// Экспортируем переменную, но инициализировать будем только в браузере
export let signer: AlchemyWebSigner | null = null;

export async function getSmartAccountClient(params: { createNew?: boolean; username?: string; idToken?: string }) {
    if (typeof window === "undefined") return null;

    // Всегда (пере)инициализируем signer, если пришел idToken (OIDC/BYO Auth)
    if (params.idToken) {
        signer = new AlchemyWebSigner({
          client: {
            connection: {
              // В режиме Bring Your Own Auth (OIDC), токен должен идти в заголовок Authorization
              jwt: params.idToken,
            },
            iframeConfig: {
              iframeContainerId: "turnkey-iframe-container",
            },
          },
        });
        
        // Monkey-patch: SDK 3.19.0 не прокидывает idToken в тело signup запроса.
        // Мы перехватываем внутренний запрос и добавляем idToken вручную.
        const innerClient = (signer as any).inner;
        const originalRequest = innerClient.request.bind(innerClient);
        innerClient.request = async (route: string, body: any) => {
            if (route === "/v1/signup" && params.idToken) {
                body.idToken = params.idToken;
            }
            return originalRequest(route, body);
        };
    } else if (!signer) {
        signer = new AlchemyWebSigner({
          client: {
            connection: {
              apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "",
            },
            iframeConfig: {
              iframeContainerId: "turnkey-iframe-container",
            },
          },
        });
    }
    try {
        console.log("Alchemy Signer: Authenticating with params:", { 
            type: "passkey", 
            createNew: params.createNew, 
            username: params.username,
            hasIdToken: !!params.idToken 
        });
        
        // 1. Создаем Passkey, привязанный к OIDC сессии (Self-Custodial)
        await signer.authenticate({
            type: "passkey",
            createNew: params.createNew ?? false,
            username: params.username || "Juvantia_User",
            idToken: params.idToken
        } as any);

        // 2. Создаем или получаем Modular Smart Account (ERC-4337)
        const client = await createModularAccountAlchemyClient({
            chain: baseSepolia,
            signer: signer,
            rpcUrl: ALCHEMY_RPC_URL,
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
