import { describe, expect, it } from "vitest";
import { ProfileMutationSchema, buildPublicProfileResponse } from "@/contracts/profile";

const ADDRESS = "0x1111111111111111111111111111111111111111";

describe("profile mutation contract", () => {
    it("accepts only public profile fields and normalizes the username", () => {
        const result = ProfileMutationSchema.parse({
            name: "  Ada Lovelace  ",
            username: "Ada_User",
            avatar_url: "/uploads/avatar.png",
            status_description: "Citizen",
        });

        expect(result).toEqual({
            name: "Ada Lovelace",
            username: "ada_user",
            avatar_url: "/uploads/avatar.png",
            status_description: "Citizen",
        });
    });

    it.each([
        "smart_wallet_address",
        "smartWalletAddress",
        "passkey",
        "passkeys",
        "credential",
        "credentials",
    ])("rejects forbidden mutation field %s", (field) => {
        const result = ProfileMutationSchema.safeParse({
            name: "Ada",
            username: "ada_user",
            [field]: "untrusted-client-material",
        });
        expect(result.success).toBe(false);
    });
});

describe("sanitized profile read model", () => {
    it("returns a verified wallet but excludes internal identity and credential fields", () => {
        const result = buildPublicProfileResponse({
            supertokens_id: "internal-user-id",
            email: "ada@example.test",
            name: "Ada",
            username: "ada_user",
            avatar_url: null,
            smart_wallet_address: ADDRESS,
            passkeys: ["credential-material"],
            status_description: "Citizen",
        });

        expect(result).toEqual({
            email: "ada@example.test",
            name: "Ada",
            username: "ada_user",
            avatar_url: null,
            smart_wallet_address: ADDRESS,
            status_description: "Citizen",
        });
        expect(JSON.stringify(result)).not.toContain("supertokens_id");
        expect(JSON.stringify(result)).not.toContain("passkeys");
        expect(JSON.stringify(result)).not.toContain("credential-material");
    });

    it("treats an invalid legacy wallet value as unlinked instead of exposing it", () => {
        const result = buildPublicProfileResponse({
            email: "ada@example.test",
            name: "Ada",
            username: "ada_user",
            smart_wallet_address: "not-an-address",
        });

        expect(result).toMatchObject({
            needsOnboarding: true,
            user: { smart_wallet_address: null },
        });
    });
});
