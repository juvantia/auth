import { NextRequest, NextResponse } from "next/server";
import Session from "supertokens-node/recipe/session";
import supertokens from "supertokens-node";
import { z } from "zod";

import { errorResponse, requestIdFor, successResponse } from "@/lib/http/api-response";
import { consumeNativeAuthCode } from "@/lib/native-handoff";
import { ensureSuperTokensInitialized } from "@/lib/supertokens-server";

ensureSuperTokensInitialized();

const inputSchema = z.object({
  code: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  codeVerifier: z.string().regex(/^[A-Za-z0-9._~-]{43,128}$/),
  redirectUri: z.string().url(),
}).strict();

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = requestIdFor(request);
  const parsed = inputSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) {
    return errorResponse(requestId, 400, "INVALID_NATIVE_TOKEN_REQUEST", "The native token request is invalid.");
  }

  const userId = await consumeNativeAuthCode(parsed.data);
  if (!userId) {
    return errorResponse(requestId, 400, "INVALID_NATIVE_AUTH_CODE", "The authorization code is invalid or expired.");
  }

  try {
    const session = await Session.createNewSessionWithoutRequestResponse(
      "public",
      supertokens.convertToRecipeUserId(userId),
      {},
      {},
      true,
    );
    const tokens = session.getAllSessionTokensDangerously();
    const response = successResponse(requestId, { expiresIn: 86_400 });
    response.headers.set("st-access-token", tokens.accessToken);
    if (tokens.refreshToken) response.headers.set("st-refresh-token", tokens.refreshToken);
    if (tokens.frontToken) response.headers.set("front-token", tokens.frontToken);
    response.headers.set("st-auth-mode", "header");
    response.headers.set("rid", "session");
    return response;
  } catch {
    return errorResponse(requestId, 500, "NATIVE_SESSION_CREATION_FAILED", "The native session could not be created.");
  }
}
