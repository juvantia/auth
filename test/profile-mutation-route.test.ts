import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    getUser: vi.fn(),
    query: vi.fn(),
    findOne: vi.fn(),
    upsertProfile: vi.fn(),
    withSession: vi.fn(
        async (
            _request: unknown,
            callback: (
                error: undefined,
                session: { getUserId: () => string },
            ) => Promise<unknown>,
        ) => callback(undefined, { getUserId: () => "session-user" }),
    ),
}));

vi.mock("supertokens-node", () => ({
    default: {
        init: vi.fn(),
        getUser: mocks.getUser,
    },
}));
vi.mock("supertokens-node/nextjs", () => ({ withSession: mocks.withSession }));
vi.mock("@/lib/db", () => ({ query: mocks.query }));
vi.mock("@/models/User", () => ({
    User: { findOne: mocks.findOne, upsertProfile: mocks.upsertProfile },
}));

import { GET, POST } from "@/app/api/user/profile/route";

describe("profile mutation route", () => {
    beforeEach(() => {
        process.env.BLOCKCHAIN_CHAIN_ID = "31337";
        for (const mock of Object.values(mocks)) mock.mockClear();
    });

    it("rejects a direct wallet mutation before identity or database access", async () => {
        const response = await POST(
            new NextRequest("https://auth.example.test/api/user/profile", {
                method: "POST",
                headers: { "content-type": "application/json", "x-request-id": "profile-mutation-test" },
                body: JSON.stringify({
                    name: "Ada",
                    smart_wallet_address: "0x1111111111111111111111111111111111111111",
                }),
            }),
        );

        expect(response.status).toBe(400);
        expect(await response.json()).toMatchObject({
            success: false,
            error: { code: "INVALID_REQUEST", requestId: "profile-mutation-test" },
        });
        expect(mocks.getUser).not.toHaveBeenCalled();
        expect(mocks.query).not.toHaveBeenCalled();
        expect(mocks.findOne).not.toHaveBeenCalled();
        expect(mocks.upsertProfile).not.toHaveBeenCalled();
    });

    it("rejects legacy username and avatar_url in mutation body", async () => {
        const response = await POST(
            new NextRequest("https://auth.example.test/api/user/profile", {
                method: "POST",
                headers: { "content-type": "application/json", "x-request-id": "profile-mutation-test" },
                body: JSON.stringify({
                    name: "Ada",
                    username: "ada_user",
                    avatar_url: "/uploads/ada.png",
                }),
            }),
        );

        expect(response.status).toBe(400);
        expect(mocks.upsertProfile).not.toHaveBeenCalled();
    });

    it("does not promote an unverified legacy address to a ZeroDev wallet", async () => {
        mocks.getUser.mockResolvedValue({ emails: ["ada@example.test"] });
        mocks.query.mockResolvedValueOnce({ rows: [{ email: "ada@example.test", name: "Ada",
            smart_wallet_address: "0x1111111111111111111111111111111111111111" }] });
        mocks.query.mockResolvedValueOnce({ rows: [] });
        const response = await GET(new NextRequest("https://auth.example.test/api/user/profile"));
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
            supertokens_id: "session-user",
            email: "ada@example.test",
            name: "Ada",
            smart_wallet_address: null,
            status_description: null,
            active_phalera_id: null,
        });
        expect(mocks.query.mock.calls[1][0]).toContain("state = 'active'");
        expect(mocks.query.mock.calls[1][1]).toEqual(["session-user", 31337]);
    });

    it("returns onboarding state without inserting when a user row does not exist", async () => {
        mocks.getUser.mockResolvedValue({ emails: ["newbie@example.test"] });
        mocks.query.mockResolvedValueOnce({ rows: [] });
        const response = await GET(new NextRequest("https://auth.example.test/api/user/profile"));
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data).toEqual({
            needsOnboarding: true,
            email: "newbie@example.test",
            supertokens_id: "session-user",
            user: {
                name: null,
                smart_wallet_address: null,
                status_description: null,
                active_phalera_id: null,
            },
        });
        const insertCalls = mocks.query.mock.calls.filter((call) => typeof call[0] === "string" && call[0].includes("INSERT"));
        expect(insertCalls).toHaveLength(0);
    });

    it("reads the active proof-gated wallet instead of the legacy profile value", async () => {
        const provenAddress = "0x2222222222222222222222222222222222222222";
        mocks.getUser.mockResolvedValue({ emails: ["ada@example.test"] });
        mocks.query.mockResolvedValueOnce({ rows: [{ email: "ada@example.test", name: "Ada",
            smart_wallet_address: "0x1111111111111111111111111111111111111111" }] });
        mocks.query.mockResolvedValueOnce({ rows: [{ address: provenAddress }] });
        const response = await GET(new NextRequest("https://auth.example.test/api/user/profile"));
        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({ smart_wallet_address: provenAddress });
    });

    it("returns an unavailable error when the wallet lookup fails, instead of an unlinked profile", async () => {
        mocks.getUser.mockResolvedValue({ emails: ["ada@example.test"] });
        mocks.query.mockResolvedValueOnce({ rows: [{ email: "ada@example.test", name: "Ada" }] });
        mocks.query.mockRejectedValueOnce(new Error("private database details"));
        const response = await GET(new NextRequest("https://auth.example.test/api/user/profile"));
        expect(response.status).toBe(503);
        const body = await response.json();
        expect(body).toMatchObject({ success: false, error: { code: "WALLET_BINDING_UNAVAILABLE" } });
        expect(JSON.stringify(body)).not.toContain("private database details");
        expect(body).not.toHaveProperty("smart_wallet_address");
    });

    it("does not save a profile when the response wallet lookup is unavailable", async () => {
        mocks.getUser.mockResolvedValue({ emails: ["ada@example.test"] });
        mocks.findOne.mockResolvedValue(null);
        mocks.query.mockRejectedValueOnce(new Error("database unavailable"));
        const response = await POST(new NextRequest("https://auth.example.test/api/user/profile", {
            method: "POST", headers: { "content-type": "application/json" },
            body: JSON.stringify({ name: "Ada", status_description: "My biography" }),
        }));
        expect(response.status).toBe(503);
        expect(await response.json()).toMatchObject({ success: false, error: { code: "WALLET_BINDING_UNAVAILABLE" } });
        expect(mocks.upsertProfile).not.toHaveBeenCalled();
    });

    it("verifies phalera ownership and saves active_phalera_id", async () => {
        mocks.getUser.mockResolvedValue({ emails: ["ada@example.test"] });
        mocks.query.mockResolvedValueOnce({ rows: [{ id: "phalera-123" }] }); // phalera check
        mocks.query.mockResolvedValueOnce({ rows: [] }); // wallet binding lookup
        mocks.upsertProfile.mockResolvedValue({
            email: "ada@example.test",
            name: "Ada",
            status_description: "Citizen",
            active_phalera_id: "phalera-123",
        });

        const response = await POST(new NextRequest("https://auth.example.test/api/user/profile", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ name: "Ada", active_phalera_id: "phalera-123" }),
        }));

        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({
            name: "Ada",
            active_phalera_id: "phalera-123",
        });
        expect(mocks.upsertProfile).toHaveBeenCalledWith("session-user", {
            name: "Ada",
            email: "ada@example.test",
            active_phalera_id: "phalera-123",
        });
    });

    it("rejects an active_phalera_id that does not belong to the citizen", async () => {
        mocks.getUser.mockResolvedValue({ emails: ["ada@example.test"] });
        mocks.query.mockResolvedValueOnce({ rows: [] }); // not found or not owned

        const response = await POST(new NextRequest("https://auth.example.test/api/user/profile", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ name: "Ada", active_phalera_id: "unowned-phalera" }),
        }));

        expect(response.status).toBe(400);
        expect(await response.json()).toMatchObject({
            success: false,
            error: { code: "INVALID_PHALERA" },
        });
        expect(mocks.upsertProfile).not.toHaveBeenCalled();
    });

    it("allows clearing active_phalera_id by passing null without querying phaleras table", async () => {
        mocks.getUser.mockResolvedValue({ emails: ["ada@example.test"] });
        mocks.query.mockResolvedValueOnce({ rows: [] }); // wallet binding lookup
        mocks.upsertProfile.mockResolvedValue({
            email: "ada@example.test",
            name: "Ada",
            status_description: "Citizen",
            active_phalera_id: null,
        });

        const response = await POST(new NextRequest("https://auth.example.test/api/user/profile", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ name: "Ada", active_phalera_id: null }),
        }));

        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({
            name: "Ada",
            active_phalera_id: null,
        });
        expect(mocks.upsertProfile).toHaveBeenCalledWith("session-user", {
            name: "Ada",
            email: "ada@example.test",
            active_phalera_id: null,
        });
    });
});
