import { describe, expect, it } from "vitest";

import {
    ARC_TESTNET_CHAIN_ID,
    WalletChallengeRequestSchema,
    WalletLinkRequestSchema,
} from "@/contracts/wallet-link";

const ADDRESS = "0x1111111111111111111111111111111111111111";
const CHALLENGE_ID = "11111111-1111-4111-8111-111111111111";

describe("wallet proof request contracts", () => {
    it("accepts one normalized Arc wallet address for a challenge", () => {
        expect(WalletChallengeRequestSchema.parse({ address: ADDRESS })).toEqual({
            address: ADDRESS,
        });
        expect(ARC_TESTNET_CHAIN_ID).toBe(5_042_002);
    });

    it("requires challengeId and signature while rejecting address replay", () => {
        expect(
            WalletLinkRequestSchema.parse({
                challengeId: CHALLENGE_ID,
                signature: "0x1234",
            }),
        ).toEqual({ challengeId: CHALLENGE_ID, signature: "0x1234" });

        expect(
            WalletLinkRequestSchema.safeParse({
                challengeId: CHALLENGE_ID,
                signature: "0x1234",
                address: ADDRESS,
            }).success,
        ).toBe(false);
    });

    it("rejects malformed addresses and signatures", () => {
        expect(WalletChallengeRequestSchema.safeParse({ address: "0x1234" }).success).toBe(false);
        expect(
            WalletLinkRequestSchema.safeParse({
                challengeId: CHALLENGE_ID,
                signature: "not-a-signature",
            }).success,
        ).toBe(false);
    });
});
