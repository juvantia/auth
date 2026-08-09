import { describe, expect, it } from "vitest";
import {
    WalletChallengeRequestSchema,
    WalletLinkRequestSchema,
    type WalletAddress,
} from "@/contracts/wallet-link";
import { WalletLinkError, walletLinkErrors } from "@/lib/wallet-link/errors";
import { WalletLinkService } from "@/lib/wallet-link/service";
import type {
    ConsumeAndLinkResult,
    CreateChallengeResult,
    WalletChallengeRecord,
    WalletLinkStore,
    WalletSignatureVerifier,
} from "@/lib/wallet-link/types";

const USER_A = "session-user-a";
const USER_B = "session-user-b";
const ADDRESS_A = "0x1111111111111111111111111111111111111111" as WalletAddress;
const ADDRESS_B = "0x2222222222222222222222222222222222222222" as WalletAddress;
const SIGNATURE = `0x${"11".repeat(65)}`;

type StoredChallenge = WalletChallengeRecord & { attempts: number; consumed: boolean };

class MemoryWalletLinkStore implements WalletLinkStore {
    readonly users = new Map<string, { profileComplete: boolean; wallet: WalletAddress | null }>();
    readonly challenges = new Map<string, StoredChallenge>();
    readonly issuedAt = new Map<string, Date[]>();

    createChallenge(record: WalletChallengeRecord, now: Date): Promise<CreateChallengeResult> {
        const user = this.users.get(record.userId);
        if (!user?.profileComplete) return Promise.resolve({ status: "profile_required" });
        if (user.wallet && user.wallet.toLowerCase() !== record.address.toLowerCase()) {
            return Promise.resolve({ status: "recovery_required" });
        }
        for (const [otherUserId, other] of this.users) {
            if (
                otherUserId !== record.userId &&
                other.wallet?.toLowerCase() === record.address.toLowerCase()
            ) {
                return Promise.resolve({ status: "address_unavailable" });
            }
        }
        const recent = (this.issuedAt.get(record.userId) ?? []).filter(
            (issued) => issued.getTime() >= now.getTime() - 10 * 60_000,
        );
        if (recent.length >= 5) return Promise.resolve({ status: "rate_limited" });
        recent.push(now);
        this.issuedAt.set(record.userId, recent);
        for (const challenge of this.challenges.values()) {
            if (challenge.userId === record.userId && !challenge.consumed) challenge.consumed = true;
        }
        this.challenges.set(record.challengeId, { ...record, attempts: 0, consumed: false });
        return Promise.resolve({ status: "created" });
    }

    getChallengeForVerification(challengeId: string, userId: string, now: Date): Promise<WalletChallengeRecord> {
        const challenge = this.challenges.get(challengeId);
        if (!challenge) throw walletLinkErrors.challengeNotFound();
        if (challenge.userId !== userId) throw walletLinkErrors.challengeSessionMismatch();
        if (challenge.consumed) throw walletLinkErrors.challengeAlreadyUsed();
        if (challenge.expiresAt.getTime() <= now.getTime()) throw walletLinkErrors.challengeExpired();
        if (challenge.attempts >= 5) throw walletLinkErrors.challengeAttemptsExceeded();
        challenge.attempts += 1;
        return Promise.resolve(challenge);
    }

    consumeAndLink(
        challengeId: string,
        userId: string,
        address: WalletAddress,
        now: Date,
    ): Promise<ConsumeAndLinkResult> {
        const challenge = this.challenges.get(challengeId);
        if (!challenge) throw walletLinkErrors.challengeNotFound();
        if (challenge.userId !== userId) throw walletLinkErrors.challengeSessionMismatch();
        if (challenge.consumed) throw walletLinkErrors.challengeAlreadyUsed();
        if (challenge.expiresAt.getTime() <= now.getTime()) throw walletLinkErrors.challengeExpired();
        if (challenge.address.toLowerCase() !== address.toLowerCase()) throw walletLinkErrors.invalidSignature();
        const user = this.users.get(userId);
        if (!user?.profileComplete) return Promise.resolve({ status: "profile_required" });
        if (user.wallet) {
            challenge.consumed = true;
            return Promise.resolve(
                user.wallet.toLowerCase() === address.toLowerCase()
                    ? { status: "already_linked" }
                    : { status: "recovery_required" },
            );
        }
        for (const [otherUserId, other] of this.users) {
            if (otherUserId !== userId && other.wallet?.toLowerCase() === address.toLowerCase()) {
                challenge.consumed = true;
                return Promise.resolve({ status: "address_unavailable" });
            }
        }
        user.wallet = address;
        challenge.consumed = true;
        return Promise.resolve({ status: "linked" });
    }
}

function expectWalletError(error: unknown, code: string) {
    expect(error).toBeInstanceOf(WalletLinkError);
    expect((error as WalletLinkError).code).toBe(code);
}

function setup(options: { verifierResult?: boolean; verifierError?: boolean; wallet?: WalletAddress | null } = {}) {
    const store = new MemoryWalletLinkStore();
    store.users.set(USER_A, { profileComplete: true, wallet: options.wallet ?? null });
    store.users.set(USER_B, { profileComplete: true, wallet: null });
    let now = new Date("2026-08-09T10:00:00.000Z");
    let challengeCounter = 0;
    const verificationCalls: Array<{ address: WalletAddress; message: string; signature: string }> = [];
    const verifier: WalletSignatureVerifier = {
        verify: async (input) => {
            verificationCalls.push(input);
            if (options.verifierError) throw new Error("synthetic RPC failure");
            return options.verifierResult ?? true;
        },
    };
    const service = new WalletLinkService({
        store,
        verifier,
        now: () => new Date(now),
        createChallengeId: () => `11111111-1111-4111-8111-${String(++challengeCounter).padStart(12, "0")}`,
        createNonce: () => "ab".repeat(32),
    });
    return {
        store,
        service,
        verificationCalls,
        advance(milliseconds: number) {
            now = new Date(now.getTime() + milliseconds);
        },
    };
}

function challengeInput(address: string = ADDRESS_A) {
    return WalletChallengeRequestSchema.parse({ address });
}

function linkInput(challengeId: string) {
    return WalletLinkRequestSchema.parse({ challengeId, signature: SIGNATURE });
}

describe("WalletLinkService challenge creation", () => {
    it("binds user, normalized address, chain, nonce, issue time, and expiry without exposing user ID", async () => {
        const { service, store } = setup();
        const result = await service.createChallenge(USER_A, challengeInput());
        const stored = store.challenges.get(result.challengeId);

        expect(result).toMatchObject({
            address: ADDRESS_A,
            network: "arcTestnet",
            chainId: 5_042_002,
            issuedAt: "2026-08-09T10:00:00.000Z",
            expiresAt: "2026-08-09T10:05:00.000Z",
        });
        expect(result.message).toContain(`Wallet: ${ADDRESS_A}`);
        expect(result.message).toContain("Chain ID: 5042002");
        expect(result.message).toContain(`Challenge ID: ${result.challengeId}`);
        expect(result.message).toContain(`Nonce: ${"ab".repeat(32)}`);
        expect(result.message).not.toContain(USER_A);
        expect(stored?.userId).toBe(USER_A);
    });

    it("rejects a different existing wallet with a typed recovery conflict", async () => {
        const { service } = setup({ wallet: ADDRESS_B });
        await expect(service.createChallenge(USER_A, challengeInput(ADDRESS_A))).rejects.toSatisfy((error) => {
            expectWalletError(error, "WALLET_RECOVERY_REQUIRED");
            return true;
        });
    });

    it("rejects an address already owned by another citizen", async () => {
        const { service, store } = setup();
        store.users.get(USER_B)!.wallet = ADDRESS_A;
        await expect(service.createChallenge(USER_A, challengeInput())).rejects.toSatisfy((error) => {
            expectWalletError(error, "WALLET_ADDRESS_UNAVAILABLE");
            return true;
        });
    });

    it("rate-limits challenge issuance to five per ten-minute window", async () => {
        const { service } = setup();
        for (let index = 0; index < 5; index += 1) await service.createChallenge(USER_A, challengeInput());
        await expect(service.createChallenge(USER_A, challengeInput())).rejects.toSatisfy((error) => {
            expectWalletError(error, "CHALLENGE_RATE_LIMITED");
            return true;
        });
    });
});

describe("WalletLinkService proof verification", () => {
    it("verifies the exact stored message/address and atomically links once", async () => {
        const { service, store, verificationCalls } = setup();
        const challenge = await service.createChallenge(USER_A, challengeInput());
        const linked = await service.linkWallet(USER_A, linkInput(challenge.challengeId));

        expect(linked).toEqual({
            address: ADDRESS_A,
            network: "arcTestnet",
            chainId: 5_042_002,
            status: "linked",
        });
        expect(verificationCalls).toEqual([
            { address: ADDRESS_A, message: challenge.message, signature: SIGNATURE },
        ]);
        expect(store.users.get(USER_A)?.wallet).toBe(ADDRESS_A);
        expect(store.challenges.get(challenge.challengeId)?.consumed).toBe(true);

        await expect(service.linkWallet(USER_A, linkInput(challenge.challengeId))).rejects.toSatisfy((error) => {
            expectWalletError(error, "CHALLENGE_ALREADY_USED");
            return true;
        });
    });

    it("requires proof even when the same address is already linked, then returns idempotent status", async () => {
        const { service, verificationCalls } = setup({ wallet: ADDRESS_A });
        const challenge = await service.createChallenge(USER_A, challengeInput());
        const linked = await service.linkWallet(USER_A, linkInput(challenge.challengeId));

        expect(linked.status).toBe("already_linked");
        expect(verificationCalls).toHaveLength(1);
    });

    it("rejects an invalid or address-mismatched signature without consuming the challenge", async () => {
        const { service, store } = setup({ verifierResult: false });
        const challenge = await service.createChallenge(USER_A, challengeInput());

        await expect(service.linkWallet(USER_A, linkInput(challenge.challengeId))).rejects.toSatisfy((error) => {
            expectWalletError(error, "INVALID_WALLET_SIGNATURE");
            return true;
        });
        expect(store.challenges.get(challenge.challengeId)?.consumed).toBe(false);
        expect(store.users.get(USER_A)?.wallet).toBeNull();
    });

    it("fails closed when the viem/RPC verifier is unavailable", async () => {
        const { service, store } = setup({ verifierError: true });
        const challenge = await service.createChallenge(USER_A, challengeInput());

        await expect(service.linkWallet(USER_A, linkInput(challenge.challengeId))).rejects.toSatisfy((error) => {
            expectWalletError(error, "WALLET_VERIFICATION_UNAVAILABLE");
            return true;
        });
        expect(store.challenges.get(challenge.challengeId)?.consumed).toBe(false);
        expect(store.users.get(USER_A)?.wallet).toBeNull();
    });

    it("rejects expired and user-mismatched challenges before verification", async () => {
        const expired = setup();
        const challenge = await expired.service.createChallenge(USER_A, challengeInput());
        expired.advance(5 * 60_000 + 1);
        await expect(expired.service.linkWallet(USER_A, linkInput(challenge.challengeId))).rejects.toSatisfy((error) => {
            expectWalletError(error, "CHALLENGE_EXPIRED");
            return true;
        });
        expect(expired.verificationCalls).toHaveLength(0);

        const mismatched = setup();
        const otherChallenge = await mismatched.service.createChallenge(USER_A, challengeInput());
        await expect(mismatched.service.linkWallet(USER_B, linkInput(otherChallenge.challengeId))).rejects.toSatisfy((error) => {
            expectWalletError(error, "CHALLENGE_SESSION_MISMATCH");
            return true;
        });
        expect(mismatched.verificationCalls).toHaveLength(0);
    });

    it("bounds invalid verification attempts", async () => {
        const { service } = setup({ verifierResult: false });
        const challenge = await service.createChallenge(USER_A, challengeInput());
        for (let attempt = 0; attempt < 5; attempt += 1) {
            await expect(service.linkWallet(USER_A, linkInput(challenge.challengeId))).rejects.toMatchObject({
                code: "INVALID_WALLET_SIGNATURE",
            });
        }
        await expect(service.linkWallet(USER_A, linkInput(challenge.challengeId))).rejects.toSatisfy((error) => {
            expectWalletError(error, "CHALLENGE_ATTEMPTS_EXCEEDED");
            return true;
        });
    });
});
