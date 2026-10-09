export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { type NextRequest, NextResponse } from "next/server";
import { withSession } from "supertokens-node/nextjs";
import { errorResponse, requestIdFor } from "@/lib/http/api-response";
import { query } from "@/lib/db";
import { ensureSuperTokensInitialized } from "@/lib/supertokens-server";
import { PhaleraSlotsResponseSchema, type PhaleraSlot } from "@/contracts/phalera";

ensureSuperTokensInitialized();

interface PhaleraRow extends Record<string, unknown> {
    id: string;
    creator_citizen_id: string;
    owner_citizen_id: string;
    slot_index: number;
    name: string;
    pixels: unknown;
    palette: unknown;
    created_at: Date | string | null;
    updated_at: Date | string | null;
}

function parseJsonField<T>(field: unknown, fallback: T): T {
    if (typeof field === "string") {
        try {
            return JSON.parse(field) as T;
        } catch {
            return fallback;
        }
    }
    if (field && typeof field === "object") {
        return field as T;
    }
    return fallback;
}

export async function GET(request: NextRequest) {
    const requestId = requestIdFor(request);
    try {
        return await withSession(
            request,
            async (sessionError, session) => {
                if (sessionError || !session) {
                    return errorResponse(requestId, 401, "AUTHENTICATION_REQUIRED", "A valid session is required.");
                }

                const userId = session.getUserId();

                const result = await query<PhaleraRow>(
                    `SELECT id, creator_citizen_id, owner_citizen_id, slot_index, name, pixels, palette, created_at, updated_at
                     FROM phaleras
                     WHERE owner_citizen_id = $1 AND slot_index IS NOT NULL
                     ORDER BY slot_index ASC`,
                    [userId],
                );

                const slots: Array<PhaleraSlot | null> = new Array(10).fill(null);

                for (const row of result.rows) {
                    const slotIndex = Number(row.slot_index);
                    if (slotIndex >= 0 && slotIndex <= 9) {
                        const pixels = parseJsonField<number[]>(row.pixels, []);
                        const palette = parseJsonField(row.palette, []);
                        slots[slotIndex] = {
                            id: row.id,
                            slotIndex,
                            name: row.name || `Phalera #${slotIndex + 1}`,
                            pixels,
                            palette,
                            creatorCitizenId: row.creator_citizen_id,
                            ownerCitizenId: row.owner_citizen_id,
                            createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
                            updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
                        };
                    }
                }

                const payload = PhaleraSlotsResponseSchema.parse({
                    success: true,
                    slots,
                });

                return NextResponse.json(payload, {
                    status: 200,
                    headers: {
                        "x-request-id": requestId,
                        "cache-control": "no-store",
                    },
                });
            },
            { sessionRequired: false },
        );
    } catch (error) {
        console.error("GET /api/user/phalera/slots unhandled error:", error);
        return errorResponse(requestId, 500, "INTERNAL_ERROR", "The auth service could not load citizen phalera slots.");
    }
}
