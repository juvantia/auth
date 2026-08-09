import { createPublicClient, http } from "viem";
import { arcTestnet } from "viem/chains";
import { ARC_TESTNET_CHAIN_ID } from "@/contracts/wallet-link";
import type { WalletSignatureVerifier } from "./types";

const DEFAULT_ARC_TESTNET_RPC_URL = "https://rpc.testnet.arc.network";

export function createViemWalletSignatureVerifier(
    rpcUrl = process.env.ARC_TESTNET_RPC_URL ?? DEFAULT_ARC_TESTNET_RPC_URL,
): WalletSignatureVerifier {
    const parsedRpcUrl = new URL(rpcUrl);
    if (!['http:', 'https:'].includes(parsedRpcUrl.protocol)) {
        throw new Error("ARC_TESTNET_RPC_URL must use HTTP or HTTPS.");
    }
    if (arcTestnet.id !== ARC_TESTNET_CHAIN_ID) {
        throw new Error("The configured viem Arc Testnet chain ID is invalid.");
    }

    const client = createPublicClient({
        chain: arcTestnet,
        transport: http(rpcUrl),
    });

    return {
        verify: ({ address, message, signature }) =>
            client.verifyMessage({ address, message, signature }),
    };
}
