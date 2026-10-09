export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { type NextRequest, NextResponse } from "next/server";
import supertokens from "supertokens-node";
import { withSession } from "supertokens-node/nextjs";
import { z } from "zod";
import { ProfileMutationSchema, buildPublicProfileResponse } from "@/contracts/profile";
import { errorResponse, requestIdFor } from "@/lib/http/api-response";
import { parseJsonBody, RequestValidationError } from "@/lib/http/request-validation";
import { query } from "@/lib/db";
import { ensureSuperTokensInitialized } from "@/lib/supertokens-server";
import { User } from "@/models/User";
import { blockchainChainId } from "@/config/blockchain";

ensureSuperTokensInitialized();

interface ProfileRow extends Record<string, unknown> {
    email: string;
    name: string;
    smart_wallet_address: string | null;
    status_description: string | null;
    active_phalera_id: string | null;
}

function rawProfileResponse(requestId: string, data: unknown, status: 200 | 201 = 200) {
    return NextResponse.json(data, { status, headers: { "x-request-id": requestId, "cache-control": "no-store" } });
}

class WalletBindingUnavailable extends Error {}

async function verifiedWalletAddress(userId: string): Promise<string | null> {
    try {
        const chainId = blockchainChainId();
        const result = await query<{ address: string }>(
            "SELECT address FROM wallet_bindings WHERE user_id = $1 AND chain_id = $2 AND state = 'active'",
            [userId, chainId],
        );
        return result.rows[0]?.address ?? null;
    } catch {
        console.error("Failed to query verified wallet address");
        throw new WalletBindingUnavailable("The smart account binding could not be checked.");
    }
}

async function getProfileByUserId(userId: string, requestId: string) {
    try {
        const result = await query<ProfileRow>(
            `SELECT email, name, status_description, active_phalera_id
             FROM users WHERE supertokens_id = $1`,
            [userId],
        );
        const user = result.rows[0];
        const userInfo = await supertokens.getUser(userId);
        const sessionEmail = userInfo?.emails[0];

        if (!user) {
            if (!sessionEmail) {
                return errorResponse(requestId, 404, "PROFILE_NOT_FOUND", "The citizen profile was not found.");
            }
            return rawProfileResponse(
                requestId,
                buildPublicProfileResponse(
                    {
                        supertokens_id: userId,
                        name: null,
                        status_description: null,
                        active_phalera_id: null,
                        smart_wallet_address: null,
                    },
                    sessionEmail,
                    userId,
                ),
            );
        }

        return rawProfileResponse(
            requestId,
            buildPublicProfileResponse(
                {
                    ...user,
                    supertokens_id: userId,
                    smart_wallet_address: await verifiedWalletAddress(userId),
                },
                sessionEmail,
                userId,
            ),
        );
    } catch (error) {
        if (error instanceof WalletBindingUnavailable) return walletBindingError(requestId);
        console.error("getProfileByUserId failed:", error);
        return errorResponse(requestId, 500, "INTERNAL_ERROR", "The auth service could not load the profile.");
    }
}

function walletBindingError(requestId: string) {
    return errorResponse(requestId, 503, "WALLET_BINDING_UNAVAILABLE", "The smart account binding is temporarily unavailable.");
}

function profileMutationError(requestId: string, error: unknown) {
    if (error instanceof WalletBindingUnavailable) return walletBindingError(requestId);
    if (error instanceof RequestValidationError) {
        return errorResponse(requestId, 400, "INVALID_REQUEST", error.message, error.fields);
    }
    if (error instanceof z.ZodError) {
        return errorResponse(requestId, 502, "PROFILE_CONTRACT_MISMATCH", "The profile response is invalid.");
    }
    console.error("profileMutationError unhandled error:", error);
    return errorResponse(requestId, 500, "INTERNAL_ERROR", "The auth service could not update the profile.");
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
                return getProfileByUserId(session.getUserId(), requestId);
            },
            { sessionRequired: false },
        );
    } catch (error) {
        console.error("GET /api/user/profile unhandled error:", error);
        return errorResponse(requestId, 500, "INTERNAL_ERROR", "The auth service could not load the profile.");
    }
}

export async function POST(request: NextRequest) {
    const requestId = requestIdFor(request);
    try {
        return await withSession(
            request,
            async (sessionError, session) => {
                if (sessionError || !session) {
                    return errorResponse(requestId, 401, "AUTHENTICATION_REQUIRED", "A valid session is required.");
                }
                try {
                    const input = await parseJsonBody(request, ProfileMutationSchema);
                    const userInfo = await supertokens.getUser(session.getUserId());
                    const email = userInfo?.emails[0];
                    if (!email) {
                        return errorResponse(requestId, 409, "SESSION_EMAIL_REQUIRED", "The session has no verified email.");
                    }

                    if (input.active_phalera_id) {
                        const phaleraCheck = await query(
                            "SELECT id FROM phaleras WHERE id = $1 AND owner_citizen_id = $2",
                            [input.active_phalera_id, session.getUserId()]
                        );
                        if (phaleraCheck.rows.length === 0) {
                            return errorResponse(requestId, 400, "INVALID_PHALERA", "The specified Phalera does not exist or does not belong to the citizen.");
                        }
                    }

                    const walletAddress = await verifiedWalletAddress(session.getUserId());
                    const savedUser = await User.upsertProfile(session.getUserId(), { ...input, email });
                    const response = buildPublicProfileResponse({
                        supertokens_id: session.getUserId(),
                        email: savedUser.email,
                        name: savedUser.name,
                        smart_wallet_address: walletAddress,
                        status_description: savedUser.status_description,
                        active_phalera_id: savedUser.active_phalera_id,
                    }, email, session.getUserId());
                    return rawProfileResponse(requestId, response, 200);
                } catch (error) {
                    return profileMutationError(requestId, error);
                }
            },
            { sessionRequired: false },
        );
    } catch (error) {
        console.error("POST /api/user/profile unhandled error:", error);
        return errorResponse(requestId, 500, "INTERNAL_ERROR", "The auth service could not update the profile.");
    }
}
