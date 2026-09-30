import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@/lib/db", () => ({ query: mocks.query }));
import { User } from "@/models/User";

const profile = { name: "Ada", username: "ada_user", email: "ada@example.test" };

describe("citizen-authored profile descriptions", () => {
    beforeEach(() => mocks.query.mockReset());

    it("creates a profile without a generated description", async () => {
        mocks.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [profile] });
        await User.upsertProfile("session-user", profile);
        expect(mocks.query.mock.calls[1][1][5]).toBeNull();
        expect(mocks.query.mock.calls[0][0]).not.toContain("SELECT *");
    });

    it.each(["My biography", ""])("preserves an omitted description: %s", async (description) => {
        mocks.query.mockResolvedValueOnce({ rows: [{ ...profile, status_description: description }] })
            .mockResolvedValueOnce({ rows: [profile] });
        await User.upsertProfile("session-user", profile);
        expect(mocks.query.mock.calls[1][1][5]).toBe(description);
    });

    it("allows the citizen to clear their description", async () => {
        mocks.query.mockResolvedValueOnce({ rows: [{ ...profile, status_description: "My biography" }] })
            .mockResolvedValueOnce({ rows: [profile] });
        await User.upsertProfile("session-user", { ...profile, status_description: "" });
        expect(mocks.query.mock.calls[1][1][5]).toBe("");
    });
});
