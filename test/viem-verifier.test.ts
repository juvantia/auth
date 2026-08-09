import { describe, expect, it, vi } from "vitest";
import type { WalletAddress } from "@/contracts/wallet-link";

const mocks = vi.hoisted(() => ({
    verifyMessage: vi.fn(async () => true),
    createPublicClient: vi.fn(),
    http: vi.fn(() => ({ type: "http" })),
}));

vi.mock("viem", async (importOriginal) => {
    const actual = await importOriginal<typeof import("viem")>();
    mocks.createPublicClient.mockReturnValue({ verifyMessage: mocks.verifyMessage });
    return {
        ...actual,
        createPublicClient: mocks.createPublicClient,
        http: mocks.http,
    };
});

import { createViemWalletSignatureVerifier } from "@/lib/wallet-link/viem-verifier";

describe("official viem wallet verifier", () => {
    it("delegates ownership proof to Public Client verifyMessage without a local bypass", async () => {
        const address = "0x1111111111111111111111111111111111111111" as WalletAddress;
        const signature = `0x${"11".repeat(65)}` as const;
        const verifier = createViemWalletSignatureVerifier("https://rpc.example.test");

        await expect(verifier.verify({ address, message: "synthetic challenge", signature })).resolves.toBe(true);
        expect(mocks.http).toHaveBeenCalledWith("https://rpc.example.test");
        expect(mocks.createPublicClient).toHaveBeenCalledWith(
            expect.objectContaining({ chain: expect.objectContaining({ id: 5_042_002 }) }),
        );
        expect(mocks.verifyMessage).toHaveBeenCalledWith({
            address,
            message: "synthetic challenge",
            signature,
        });
    });
});
