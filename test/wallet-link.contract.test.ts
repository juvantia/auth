import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import {
    WalletChallengeRequestSchema,
    WalletLinkRequestSchema,
} from "@/contracts/wallet-link";
import { POST as retiredWalletPost } from "@/app/api/user/wallet/route";

const ADDRESS = "0x1111111111111111111111111111111111111111";
const SIGNATURE = `0x${"11".repeat(65)}`;
const CHALLENGE_ID = "11111111-1111-4111-8111-111111111111";

describe("wallet proof DTOs", () => {
    it("accepts only a normalized address for challenge creation", () => {
        expect(WalletChallengeRequestSchema.parse({ address: ADDRESS })).toEqual({ address: ADDRESS });
        expect(WalletChallengeRequestSchema.safeParse({ address: ADDRESS, chainId: 1 }).success).toBe(false);
        expect(WalletChallengeRequestSchema.safeParse({ smart_wallet_address: ADDRESS }).success).toBe(false);
    });

    it("accepts only challengeId and a bounded hex signature for linking", () => {
        expect(WalletLinkRequestSchema.parse({ challengeId: CHALLENGE_ID, signature: SIGNATURE })).toEqual({
            challengeId: CHALLENGE_ID,
            signature: SIGNATURE,
        });
        expect(
            WalletLinkRequestSchema.safeParse({
                challengeId: CHALLENGE_ID,
                signature: SIGNATURE,
                address: ADDRESS,
            }).success,
        ).toBe(false);
        expect(WalletLinkRequestSchema.safeParse({ challengeId: CHALLENGE_ID, signature: "verified" }).success)
            .toBe(false);
    });
});

describe("retired direct wallet mutation", () => {
    it("returns a typed 410 and cannot persist a submitted address", async () => {
        const request = new NextRequest("https://auth.example.test/api/user/wallet", {
            method: "POST",
            headers: { "content-type": "application/json", "x-request-id": "retired-wallet-test" },
            body: JSON.stringify({ smart_wallet_address: ADDRESS }),
        });
        const response = await retiredWalletPost(request);

        expect(response.status).toBe(410);
        expect(await response.json()).toEqual({
            success: false,
            error: {
                code: "WALLET_LINK_FLOW_REQUIRED",
                message: "Use /api/user/wallet/challenge and /api/user/wallet/link to prove wallet ownership.",
                requestId: "retired-wallet-test",
            },
        });
    });
});
