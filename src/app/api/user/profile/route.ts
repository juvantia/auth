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

ensureSuperTokensInitialized();

interface ProfileRow extends Record<string, unknown> {
    email: string;
    name: string;
    username: string | null;
    avatar_url: string | null;
    smart_wallet_address: string | null;
    status_description: string | null;
}

function rawProfileResponse(requestId: string, data: unknown, status: 200 | 201 = 200) {
    return NextResponse.json(data, { status, headers: { "x-request-id": requestId, "cache-control": "no-store" } });
}

async function getProfileByUserId(userId: string, requestId: string) {
    try {
        const result = await query<ProfileRow>(
            `SELECT email, name, username, avatar_url, smart_wallet_address, status_description
             FROM users WHERE supertokens_id = $1`,
            [userId],
        );
        let user = result.rows[0];
        const userInfo = await supertokens.getUser(userId);
        const sessionEmail = userInfo?.emails[0];

        if (!user && sessionEmail) {
            const insertResult = await query<ProfileRow>(
                `INSERT INTO users (supertokens_id, email, name)
                 VALUES ($1, $2, $3)
                 RETURNING email, name, username, avatar_url, smart_wallet_address, status_description`,
                [userId, sessionEmail, sessionEmail.split("@")[0]],
            );
            user = insertResult.rows[0];
        }
        if (!user) {
            return errorResponse(requestId, 404, "PROFILE_NOT_FOUND", "The citizen profile was not found.");
        }

        return rawProfileResponse(requestId, buildPublicProfileResponse(user, sessionEmail));
    } catch {
        return errorResponse(requestId, 500, "INTERNAL_ERROR", "The auth service could not load the profile.");
    }
}

function profileMutationError(requestId: string, error: unknown) {
    if (error instanceof RequestValidationError) {
        return errorResponse(requestId, 400, "INVALID_REQUEST", error.message, error.fields);
    }
    if (error instanceof z.ZodError) {
        return errorResponse(requestId, 502, "PROFILE_CONTRACT_MISMATCH", "The profile response is invalid.");
    }
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
        return errorResponse(requestId, 409, "USERNAME_UNAVAILABLE", "The username is already in use.");
    }
    return errorResponse(requestId, 500, "INTERNAL_ERROR", "The auth service could not update the profile.");
}

export async function GET(request: NextRequest) {
    const requestId = requestIdFor(request);
    try {
        return await withSession(
            request,
            async (sessionError, session) => {
                if (sessionError || !session) {
                    const authHeader = request.headers.get("authorization");
                    if (authHeader && authHeader.startsWith("Bearer ")) {
                        const token = authHeader.slice(7).trim();
                        try {
                            const parts = token.split(".");
                            if (parts.length === 3) {
                                const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));
                                const userId = payload?.sub || payload?.user_id || payload?.userId || payload?.supertokens_id;
                                if (userId && typeof userId === "string") {
                                    return getProfileByUserId(userId, requestId);
                                }
                            }
                        } catch {}
                    }
                    return errorResponse(requestId, 401, "AUTHENTICATION_REQUIRED", "A valid session is required.");
                }
                return getProfileByUserId(session.getUserId(), requestId);
            },
            { sessionRequired: false },
        );
    } catch {
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

                    const existingUsername = await User.findOne({ username: input.username });
                    if (existingUsername && existingUsername.supertokens_id !== session.getUserId()) {
                        return errorResponse(requestId, 409, "USERNAME_UNAVAILABLE", "The username is already in use.");
                    }

                    const savedUser = await User.upsertProfile(session.getUserId(), { ...input, email });
                    const response = buildPublicProfileResponse({
                        email: savedUser.email,
                        name: savedUser.name,
                        username: savedUser.username,
                        avatar_url: savedUser.avatar_url,
                        smart_wallet_address: savedUser.smart_wallet_address,
                        status_description: savedUser.status_description,
                    }, email);
                    return rawProfileResponse(requestId, response, 200);
                } catch (error) {
                    return profileMutationError(requestId, error);
                }
            },
            { sessionRequired: false },
        );
    } catch {
        return errorResponse(requestId, 500, "INTERNAL_ERROR", "The auth service could not update the profile.");
    }
}
