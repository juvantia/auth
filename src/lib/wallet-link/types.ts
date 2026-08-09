import type { Hex } from "viem";
import type { WalletAddress } from "@/contracts/wallet-link";

export interface WalletChallengeRecord {
    challengeId: string;
    userId: string;
    address: WalletAddress;
    chainId: 5_042_002;
    message: string;
    issuedAt: Date;
    expiresAt: Date;
}

export type CreateChallengeResult =
    | { status: "created" }
    | { status: "profile_required" }
    | { status: "recovery_required" }
    | { status: "address_unavailable" }
    | { status: "rate_limited" };

export type ConsumeAndLinkResult =
    | { status: "linked" }
    | { status: "already_linked" }
    | { status: "profile_required" }
    | { status: "recovery_required" }
    | { status: "address_unavailable" };

export interface WalletLinkStore {
    createChallenge(record: WalletChallengeRecord, now: Date): Promise<CreateChallengeResult>;
    getChallengeForVerification(challengeId: string, userId: string, now: Date): Promise<WalletChallengeRecord>;
    consumeAndLink(
        challengeId: string,
        userId: string,
        address: WalletAddress,
        now: Date,
    ): Promise<ConsumeAndLinkResult>;
}

export interface WalletSignatureVerifier {
    verify(input: { address: WalletAddress; message: string; signature: Hex }): Promise<boolean>;
}
