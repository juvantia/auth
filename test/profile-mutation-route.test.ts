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

import { POST } from "@/app/api/user/profile/route";

describe("profile mutation route", () => {
    beforeEach(() => {
        for (const mock of Object.values(mocks)) mock.mockClear();
    });

    it("rejects a direct wallet mutation before identity or database access", async () => {
        const response = await POST(
            new NextRequest("https://auth.example.test/api/user/profile", {
                method: "POST",
                headers: { "content-type": "application/json", "x-request-id": "profile-mutation-test" },
                body: JSON.stringify({
                    name: "Ada",
                    username: "ada_user",
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
});
