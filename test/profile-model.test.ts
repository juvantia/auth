import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@/lib/db", () => ({ query: mocks.query }));
import { User } from "@/models/User";

const profile = { name: "Ada", email: "ada@example.test" };

describe("citizen-authored profile descriptions", () => {
    beforeEach(() => mocks.query.mockReset());

    it("creates a profile without a generated description", async () => {
        mocks.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [profile] });
        await User.upsertProfile("session-user", profile);
        // Parameter index 3 is status_description in INSERT (supertokens_id, email, name, status_description)
        expect(mocks.query.mock.calls[1][1][3]).toBeNull();
        expect(mocks.query.mock.calls[0][0]).not.toContain("SELECT *");
    });

    it.each(["My biography", ""])("preserves an omitted description: %s", async (description) => {
        mocks.query.mockResolvedValueOnce({ rows: [{ ...profile, status_description: description }] })
            .mockResolvedValueOnce({ rows: [profile] });
        await User.upsertProfile("session-user", profile);
        // Parameter index 3 is status_description in UPDATE (supertokens_id, email, name, status_description)
        expect(mocks.query.mock.calls[1][1][3]).toBe(description);
    });

    it("allows the citizen to clear their description", async () => {
        mocks.query.mockResolvedValueOnce({ rows: [{ ...profile, status_description: "My biography" }] })
            .mockResolvedValueOnce({ rows: [profile] });
        await User.upsertProfile("session-user", { ...profile, status_description: "" });
        expect(mocks.query.mock.calls[1][1][3]).toBe("");
    });
});
