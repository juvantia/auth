export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { type NextRequest, NextResponse } from "next/server";
import { withSession } from "supertokens-node/nextjs";
import { getAddress } from "viem";

import { WalletBindingSchema, buildPublicProfileResponse } from "@/contracts/profile";
import { errorResponse, requestIdFor } from "@/lib/http/api-response";
import { query } from "@/lib/db";
import { ensureSuperTokensInitialized } from "@/lib/supertokens-server";

ensureSuperTokensInitialized();

interface ProfileRow extends Record<string, unknown> {
    email: string;
    name: string;
    username: string | null;
    avatar_url: string | null;
    smart_wallet_address: string | null;
    status_description: string | null;
}

function rawProfileResponse(requestId: string, data: unknown) {
    return NextResponse.json(data, {
        status: 200,
        headers: { "x-request-id": requestId, "cache-control": "no-store" },
    });
}

async function bindWallet(userId: string, address: string, requestId: string) {
    const result = await query<ProfileRow>(
        `SELECT email, name, username, avatar_url, smart_wallet_address, status_description
         FROM users WHERE supertokens_id = $1`,
        [userId],
    );
    const user = result.rows[0];
    if (!user) {
        return errorResponse(requestId, 404, "PROFILE_NOT_FOUND", "The citizen profile was not found.");
    }

    if (user.smart_wallet_address) {
        if (user.smart_wallet_address.toLowerCase() !== address.toLowerCase()) {
            return errorResponse(requestId, 409, "WALLET_ALREADY_BOUND", "A different wallet is already bound to this profile.");
        }
        return rawProfileResponse(requestId, buildPublicProfileResponse(user));
    }

    try {
        const saved = await query<ProfileRow>(
            `UPDATE users
             SET smart_wallet_address = $2, updated_at = NOW()
             WHERE supertokens_id = $1 AND smart_wallet_address IS NULL
             RETURNING email, name, username, avatar_url, smart_wallet_address, status_description`,
            [userId, address],
        );
        const updated = saved.rows[0];
        if (!updated) {
            return errorResponse(requestId, 409, "WALLET_ALREADY_BOUND", "A different wallet is already bound to this profile.");
        }
        return rawProfileResponse(requestId, buildPublicProfileResponse(updated));
    } catch (error) {
        if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
            return errorResponse(requestId, 409, "WALLET_ALREADY_BOUND", "This wallet is already bound to another profile.");
        }
        return errorResponse(requestId, 500, "INTERNAL_ERROR", "The auth service could not bind the wallet.");
    }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    const requestId = requestIdFor(request);
    const parsed = WalletBindingSchema.safeParse(await request.json().catch(() => undefined));
    if (!parsed.success) {
        return errorResponse(requestId, 400, "INVALID_WALLET_BINDING", "A valid EVM wallet address is required.");
    }

    let address: string;
    try {
        address = getAddress(parsed.data.address);
    } catch {
        return errorResponse(requestId, 400, "INVALID_WALLET_BINDING", "A valid EVM wallet address is required.");
    }

    try {
        return await withSession(
            request,
            async (sessionError, session) => {
                if (sessionError || !session) {
                    return errorResponse(requestId, 401, "AUTHENTICATION_REQUIRED", "A valid session is required.");
                }
                return bindWallet(session.getUserId(), address, requestId);
            },
            { sessionRequired: false },
        );
    } catch {
        return errorResponse(requestId, 500, "INTERNAL_ERROR", "The auth service could not bind the wallet.");
    }
}
