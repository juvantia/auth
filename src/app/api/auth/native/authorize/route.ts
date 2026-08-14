import { NextRequest } from "next/server";
import { withSession } from "supertokens-node/nextjs";
import { z } from "zod";

import { errorResponse, requestIdFor, successResponse } from "@/lib/http/api-response";
import { issueNativeAuthCode } from "@/lib/native-handoff";
import { ensureSuperTokensInitialized } from "@/lib/supertokens-server";

ensureSuperTokensInitialized();

const inputSchema = z.object({
  redirectUri: z.string().url(),
  codeChallenge: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
}).strict();

export async function POST(request: NextRequest) {
  const requestId = requestIdFor(request);
  return withSession(request, async (sessionError, session) => {
    if (sessionError || !session) {
      return errorResponse(requestId, 401, "AUTHENTICATION_REQUIRED", "A valid session is required.");
    }
    const parsed = inputSchema.safeParse(await request.json().catch(() => undefined));
    if (!parsed.success) {
      return errorResponse(requestId, 400, "INVALID_NATIVE_AUTH_REQUEST", "The native authorization request is invalid.");
    }
    try {
      const code = await issueNativeAuthCode({
        userId: session.getUserId(),
        redirectUri: parsed.data.redirectUri,
        codeChallenge: parsed.data.codeChallenge,
      });
      return successResponse(requestId, { code, expiresIn: 60 });
    } catch {
      return errorResponse(requestId, 400, "INVALID_NATIVE_AUTH_REQUEST", "The native authorization request is invalid.");
    }
  }, { sessionRequired: false });
}
