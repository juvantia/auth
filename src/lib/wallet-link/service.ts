import { randomBytes, randomUUID } from "node:crypto";
import {
    ARC_TESTNET_CHAIN_ID,
    ARC_TESTNET_NETWORK,
    WalletChallengeDataSchema,
    WalletLinkDataSchema,
    type WalletChallengeData,
    type WalletChallengeRequest,
    type WalletLinkData,
    type WalletLinkRequest,
} from "@/contracts/wallet-link";
import { walletLinkErrors } from "./errors";
import { buildWalletLinkMessage } from "./message";
import type { WalletLinkStore, WalletSignatureVerifier } from "./types";

const DEFAULT_CHALLENGE_TTL_MS = 5 * 60_000;

export interface WalletLinkServiceOptions {
    store: WalletLinkStore;
    verifier: WalletSignatureVerifier;
    now?: () => Date;
    createChallengeId?: () => string;
    createNonce?: () => string;
    challengeTtlMs?: number;
}

export class WalletLinkService {
    private readonly now: () => Date;
    private readonly createChallengeId: () => string;
    private readonly createNonce: () => string;
    private readonly challengeTtlMs: number;

    constructor(private readonly options: WalletLinkServiceOptions) {
        this.now = options.now ?? (() => new Date());
        this.createChallengeId = options.createChallengeId ?? randomUUID;
        this.createNonce = options.createNonce ?? (() => randomBytes(32).toString("hex"));
        this.challengeTtlMs = options.challengeTtlMs ?? DEFAULT_CHALLENGE_TTL_MS;
        if (!Number.isInteger(this.challengeTtlMs) || this.challengeTtlMs < 60_000 || this.challengeTtlMs > 10 * 60_000) {
            throw new Error("Wallet challenge TTL must be between one and ten minutes.");
        }
    }

    async createChallenge(userId: string, input: WalletChallengeRequest): Promise<WalletChallengeData> {
        const issuedAt = this.now();
        const expiresAt = new Date(issuedAt.getTime() + this.challengeTtlMs);
        const challengeId = this.createChallengeId();
        const nonce = this.createNonce();
        if (!/^[a-fA-F0-9]{64}$/.test(nonce)) throw new Error("Wallet challenge nonce generator failed.");
        const message = buildWalletLinkMessage({
            challengeId,
            address: input.address,
            nonce: nonce.toLowerCase(),
            issuedAt,
            expiresAt,
        });

        const storeResult = await this.options.store.createChallenge(
            {
                challengeId,
                userId,
                address: input.address,
                chainId: ARC_TESTNET_CHAIN_ID,
                message,
                issuedAt,
                expiresAt,
            },
            issuedAt,
        );

        switch (storeResult.status) {
            case "profile_required":
                throw walletLinkErrors.profileRequired();
            case "recovery_required":
                throw walletLinkErrors.recoveryRequired();
            case "address_unavailable":
                throw walletLinkErrors.addressUnavailable();
            case "rate_limited":
                throw walletLinkErrors.challengeRateLimited();
        }

        return WalletChallengeDataSchema.parse({
            challengeId,
            address: input.address,
            network: ARC_TESTNET_NETWORK,
            chainId: ARC_TESTNET_CHAIN_ID,
            message,
            issuedAt: issuedAt.toISOString(),
            expiresAt: expiresAt.toISOString(),
        });
    }

    async linkWallet(userId: string, input: WalletLinkRequest): Promise<WalletLinkData> {
        const verificationStartedAt = this.now();
        const challenge = await this.options.store.getChallengeForVerification(
            input.challengeId,
            userId,
            verificationStartedAt,
        );

        let isValid = false;
        try {
            isValid = await this.options.verifier.verify({
                address: challenge.address,
                message: challenge.message,
                signature: input.signature,
            });
        } catch {
            throw walletLinkErrors.verificationUnavailable();
        }
        if (!isValid) throw walletLinkErrors.invalidSignature();

        const storeResult = await this.options.store.consumeAndLink(
            challenge.challengeId,
            userId,
            challenge.address,
            this.now(),
        );
        switch (storeResult.status) {
            case "profile_required":
                throw walletLinkErrors.profileRequired();
            case "recovery_required":
                throw walletLinkErrors.recoveryRequired();
            case "address_unavailable":
                throw walletLinkErrors.addressUnavailable();
        }

        return WalletLinkDataSchema.parse({
            address: challenge.address,
            network: ARC_TESTNET_NETWORK,
            chainId: ARC_TESTNET_CHAIN_ID,
            status: storeResult.status,
        });
    }
}
