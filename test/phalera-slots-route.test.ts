import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    fetch: vi.fn(),
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
vi.stubGlobal("fetch",mocks.fetch);

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
        const slots=Array.from({length:10},()=>null) as Array<unknown>;
        for(const slotIndex of [2,5])slots[slotIndex]={
            id:`0194f8f2-9f35-7a12-b6b4-9f40d70f922${slotIndex===2?'1':'2'}`,
            slotIndex,name:`Phalera #${slotIndex+1}`,pixels:SAMPLE_PIXELS,palette:SAMPLE_PALETTE,
            creatorCitizenId:'session-user',ownerCitizenId:'session-user',image:null,
            createdAt:'2026-10-09T00:00:00.000Z',updatedAt:'2026-10-09T00:00:00.000Z'
        };
        mocks.fetch.mockResolvedValueOnce(new Response(JSON.stringify({success:true,data:{slots}})));

        const response = await GET(new NextRequest("https://auth.example.test/api/user/phalera/slots",{headers:{Authorization:'Bearer verified-session'}}));
        expect(response.status).toBe(200);
        const [target,init]=mocks.fetch.mock.calls.at(-1)!;
        expect(new URL(target).pathname).toBe('/api/phalera/slots');
        expect(new Headers(init.headers).get('authorization')).toBe('Bearer verified-session');
        expect(new URL(target).search).toBe('');

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
        mocks.fetch.mockResolvedValueOnce(new Response(JSON.stringify({success:true,data:{slots:new Array(10).fill(null)}})));

        const response = await GET(new NextRequest("https://auth.example.test/api/user/phalera/slots",{headers:{Authorization:'Bearer verified-session'}}));
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.slots).toHaveLength(10);
        expect(data.slots.every((s: unknown) => s === null)).toBe(true);
    });
});
