import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    getUser: vi.fn(),
    withSession: vi.fn(
        async (
            _request: unknown,
            callback: (error: undefined, session: undefined) => Promise<unknown>,
        ) => callback(undefined, undefined),
    ),
}));

vi.mock("supertokens-node", () => ({
    default: {
        init: vi.fn(),
        getUser: mocks.getUser,
    },
}));

vi.mock("supertokens-node/nextjs", () => ({ withSession: mocks.withSession }));

import { GET } from "@/app/api/user/profile/route";

describe("profile session boundary", () => {
    beforeEach(() => {
        mocks.getUser.mockClear();
        mocks.withSession.mockClear();
    });

    it("ignores legacy x-internal-auth and x-user-id impersonation headers", async () => {
        const response = await GET(
            new NextRequest("https://auth.example.test/api/user/profile", {
                headers: {
                    "x-internal-auth": "true",
                    "x-user-id": "another-citizen",
                    "x-request-id": "profile-session-test",
                },
            }),
        );

        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({
            success: false,
            error: {
                code: "AUTHENTICATION_REQUIRED",
                message: "A valid session is required.",
                requestId: "profile-session-test",
            },
        });
        expect(mocks.getUser).not.toHaveBeenCalled();
    });
});
