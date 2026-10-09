import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    query: vi.fn(),
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
    },
}));
vi.mock("supertokens-node/nextjs", () => ({ withSession: mocks.withSession }));
vi.mock("@/lib/db", () => ({ query: mocks.query }));

import { GET } from "@/app/api/user/phalera/slots/route";

const SAMPLE_PALETTE = [
    { hex: "#FFFFFF", rgb: [255, 255, 255], name: "White", dxfColor: 7 },
    { hex: "#0F0F0F", rgb: [15, 15, 15], name: "Black", dxfColor: 250 },
];
const SAMPLE_PIXELS = new Array(4096).fill(0);

describe("citizen phalera slots route", () => {
    beforeEach(() => {
        for (const mock of Object.values(mocks)) mock.mockClear();
    });

    it("returns 10 slots with populated items at their respective indices", async () => {
        mocks.query.mockResolvedValueOnce({
            rows: [
                {
                    id: "0194f8f2-9f35-7a12-b6b4-9f40d70f9221",
                    creator_citizen_id: "session-user",
                    owner_citizen_id: "session-user",
                    slot_index: 2,
                    name: "Phalera #3",
                    pixels: SAMPLE_PIXELS,
                    palette: SAMPLE_PALETTE,
                    created_at: new Date("2026-10-09T00:00:00Z"),
                    updated_at: new Date("2026-10-09T00:00:00Z"),
                },
                {
                    id: "0194f8f2-9f35-7a12-b6b4-9f40d70f9222",
                    creator_citizen_id: "session-user",
                    owner_citizen_id: "session-user",
                    slot_index: 5,
                    name: "Phalera #6",
                    pixels: JSON.stringify(SAMPLE_PIXELS),
                    palette: JSON.stringify(SAMPLE_PALETTE),
                    created_at: "2026-10-09T00:00:00.000Z",
                    updated_at: "2026-10-09T00:00:00.000Z",
                },
            ],
        });

        const response = await GET(new NextRequest("https://auth.example.test/api/user/phalera/slots"));
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.slots).toHaveLength(10);
        expect(data.slots[0]).toBeNull();
        expect(data.slots[1]).toBeNull();
        expect(data.slots[2]).toMatchObject({
            id: "0194f8f2-9f35-7a12-b6b4-9f40d70f9221",
            slotIndex: 2,
            name: "Phalera #3",
        });
        expect(data.slots[3]).toBeNull();
        expect(data.slots[4]).toBeNull();
        expect(data.slots[5]).toMatchObject({
            id: "0194f8f2-9f35-7a12-b6b4-9f40d70f9222",
            slotIndex: 5,
            name: "Phalera #6",
        });
        expect(data.slots[6]).toBeNull();
        expect(data.slots[7]).toBeNull();
        expect(data.slots[8]).toBeNull();
        expect(data.slots[9]).toBeNull();
    });

    it("returns 10 null slots when the user has no phaleras registered", async () => {
        mocks.query.mockResolvedValueOnce({ rows: [] });

        const response = await GET(new NextRequest("https://auth.example.test/api/user/phalera/slots"));
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.slots).toHaveLength(10);
        expect(data.slots.every((s: unknown) => s === null)).toBe(true);
    });
});
