import { describe, expect, it } from "vitest";
import { ProfileMutationSchema, buildPublicProfileResponse } from "@/contracts/profile";

const ADDRESS = "0x1111111111111111111111111111111111111111";

describe("profile mutation contract", () => {
    it("accepts only public profile fields (name up to 16 chars, status_description, active_phalera_id)", () => {
        const result = ProfileMutationSchema.parse({
            name: "  Ada Lovelace  ",
            status_description: "Citizen",
            active_phalera_id: "PHL-001",
        });

        expect(result).toEqual({
            name: "Ada Lovelace",
            status_description: "Citizen",
            active_phalera_id: "PHL-001",
        });
    });

    it("rejects names longer than 16 characters", () => {
        const result = ProfileMutationSchema.safeParse({
            name: "This Name Is Way Too Long For A Citizen",
        });
        expect(result.success).toBe(false);
    });

    it.each([
        "username",
        "avatar_url",
        "avatarUrl",
        "smart_wallet_address",
        "smartWalletAddress",
        "passkey",
        "passkeys",
        "credential",
        "credentials",
    ])("rejects forbidden mutation field %s", (field) => {
        const result = ProfileMutationSchema.safeParse({
            name: "Ada",
            [field]: "untrusted-client-material",
        });
        expect(result.success).toBe(false);
    });
});

describe("sanitized profile read model", () => {
    it("returns a verified wallet but excludes internal identity and credential fields, username, and avatar", () => {
        const result = buildPublicProfileResponse({
            supertokens_id: "internal-user-id",
            email: "ada@example.test",
            name: "Ada",
            username: "legacy_user",
            avatar_url: "/uploads/legacy.png",
            smart_wallet_address: ADDRESS,
            passkeys: ["credential-material"],
            status_description: "Citizen",
        });

        expect(result).toEqual({
            supertokens_id: "internal-user-id",
            email: "ada@example.test",
            name: "Ada",
            smart_wallet_address: ADDRESS,
            status_description: "Citizen",
            active_phalera_id: null,
        });
        expect(JSON.stringify(result)).not.toContain("legacy_user");
        expect(JSON.stringify(result)).not.toContain("legacy.png");
        expect(JSON.stringify(result)).not.toContain("passkeys");
        expect(JSON.stringify(result)).not.toContain("credential-material");
    });

    it("treats an invalid legacy wallet value as unlinked instead of exposing it", () => {
        const result = buildPublicProfileResponse({
            email: "ada@example.test",
            name: "Ada",
            smart_wallet_address: "not-an-address",
        });

        expect(result).toEqual({
            supertokens_id: null,
            email: "ada@example.test",
            name: "Ada",
            smart_wallet_address: null,
            status_description: null,
            active_phalera_id: null,
        });
    });

    it("returns onboarding state when name is missing", () => {
        const result = buildPublicProfileResponse({
            email: "ada@example.test",
            name: null,
        });

        expect(result).toMatchObject({
            needsOnboarding: true,
            email: "ada@example.test",
            user: {
                name: null,
                smart_wallet_address: null,
            },
        });
    });
});
