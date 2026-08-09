import { ARC_TESTNET_CHAIN_ID, ARC_TESTNET_NETWORK, type WalletAddress } from "@/contracts/wallet-link";

export interface WalletLinkMessageInput {
    challengeId: string;
    address: WalletAddress;
    nonce: string;
    issuedAt: Date;
    expiresAt: Date;
}

export function buildWalletLinkMessage(input: WalletLinkMessageInput): string {
    return [
        "Juvantia Wallet Link",
        "",
        "Authorize this wallet for your Juvantia citizen profile.",
        "This request does not authorize a transaction.",
        "",
        "Domain: auth.juvantia.org",
        "URI: https://auth.juvantia.org",
        `Network: ${ARC_TESTNET_NETWORK}`,
        `Chain ID: ${ARC_TESTNET_CHAIN_ID}`,
        `Wallet: ${input.address}`,
        `Challenge ID: ${input.challengeId}`,
        `Nonce: ${input.nonce}`,
        `Issued At: ${input.issuedAt.toISOString()}`,
        `Expiration Time: ${input.expiresAt.toISOString()}`,
    ].join("\n");
}
