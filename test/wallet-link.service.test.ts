import { beforeEach, describe, expect, it, vi } from "vitest";

import type { WalletAddress } from "@/contracts/wallet-link";
import { WalletLinkError } from "@/lib/wallet-link/errors";
import { WalletLinkService } from "@/lib/wallet-link/service";
import type {
    WalletChallengeRecord,
    WalletLinkStore,
    WalletSignatureVerifier,
} from "@/lib/wallet-link/types";

const ADDRESS = "0x1111111111111111111111111111111111111111" as WalletAddress;
const CHALLENGE_ID = "11111111-1111-4111-8111-111111111111";
const NOW = new Date("2026-08-11T00:00:00.000Z");

describe("WalletLinkService", () => {
    const createChallenge = vi.fn<WalletLinkStore["createChallenge"]>();
    const getChallengeForVerification = vi.fn<WalletLinkStore["getChallengeForVerification"]>();
    const consumeAndLink = vi.fn<WalletLinkStore["consumeAndLink"]>();
    const verify = vi.fn<WalletSignatureVerifier["verify"]>();
    const store: WalletLinkStore = {
        createChallenge,
        getChallengeForVerification,
        consumeAndLink,
    };
    const verifier: WalletSignatureVerifier = { verify };

    const service = () =>
        new WalletLinkService({
            store,
            verifier,
            now: () => NOW,
            createChallengeId: () => CHALLENGE_ID,
            createNonce: () => "ab".repeat(32),
        });

    beforeEach(() => {
        vi.clearAllMocks();
        createChallenge.mockResolvedValue({ status: "created" });
        consumeAndLink.mockResolvedValue({ status: "linked" });
        verify.mockResolvedValue(true);
    });

    it("creates a five-minute challenge bound to the session user and Arc network", async () => {
        const result = await service().createChallenge("session-user", { address: ADDRESS });

        expect(result).toMatchObject({
            challengeId: CHALLENGE_ID,
            address: ADDRESS,
            network: "arcTestnet",
            chainId: 5_042_002,
            issuedAt: NOW.toISOString(),
            expiresAt: "2026-08-11T00:05:00.000Z",
        });
        expect(result.message).toContain(CHALLENGE_ID);
        expect(createChallenge).toHaveBeenCalledWith(
            expect.objectContaining({ userId: "session-user", address: ADDRESS }),
            NOW,
        );
    });

    it("maps an existing different wallet to recovery instead of overwriting", async () => {
        createChallenge.mockResolvedValue({ status: "recovery_required" });

        await expect(service().createChallenge("session-user", { address: ADDRESS })).rejects.toMatchObject({
            code: "WALLET_RECOVERY_REQUIRED",
            status: 409,
        });
    });

    it("verifies the stored challenge message before an atomic link", async () => {
        const challenge: WalletChallengeRecord = {
            challengeId: CHALLENGE_ID,
            userId: "session-user",
            address: ADDRESS,
            chainId: 5_042_002,
            message: "Juvantia wallet proof",
            issuedAt: NOW,
            expiresAt: new Date(NOW.getTime() + 300_000),
        };
        getChallengeForVerification.mockResolvedValue(challenge);

        const result = await service().linkWallet("session-user", {
            challengeId: CHALLENGE_ID,
            signature: "0x1234",
        });

        expect(verify).toHaveBeenCalledWith({
            address: ADDRESS,
            message: challenge.message,
            signature: "0x1234",
        });
        expect(consumeAndLink).toHaveBeenCalledWith(
            CHALLENGE_ID,
            "session-user",
            ADDRESS,
            NOW,
        );
        expect(result).toEqual({
            address: ADDRESS,
            network: "arcTestnet",
            chainId: 5_042_002,
            status: "linked",
        });
    });

    it("never consumes a challenge after an invalid signature", async () => {
        getChallengeForVerification.mockResolvedValue({
            challengeId: CHALLENGE_ID,
            userId: "session-user",
            address: ADDRESS,
            chainId: 5_042_002,
            message: "Juvantia wallet proof",
            issuedAt: NOW,
            expiresAt: new Date(NOW.getTime() + 300_000),
        });
        verify.mockResolvedValue(false);

        await expect(
            service().linkWallet("session-user", {
                challengeId: CHALLENGE_ID,
                signature: "0x1234",
            }),
        ).rejects.toEqual(expect.objectContaining<Partial<WalletLinkError>>({
            code: "INVALID_WALLET_SIGNATURE",
            status: 422,
        }));
        expect(consumeAndLink).not.toHaveBeenCalled();
    });
});
