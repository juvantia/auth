export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { type NextRequest } from "next/server";
import { withSession } from "supertokens-node/nextjs";
import { WalletChallengeRequestSchema } from "@/contracts/wallet-link";
import { errorResponse, requestIdFor, successResponse } from "@/lib/http/api-response";
import { parseJsonBody } from "@/lib/http/request-validation";
import { ensureSuperTokensInitialized } from "@/lib/supertokens-server";
import { getWalletLinkService } from "@/lib/wallet-link/runtime";
import { walletLinkRouteError } from "@/lib/wallet-link/route-error";

ensureSuperTokensInitialized();

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
                    const input = await parseJsonBody(request, WalletChallengeRequestSchema);
                    const data = await getWalletLinkService().createChallenge(session.getUserId(), input);
                    return successResponse(requestId, data, 201);
                } catch (error) {
                    return walletLinkRouteError(requestId, error);
                }
            },
            { sessionRequired: false },
        );
    } catch {
        return errorResponse(requestId, 500, "INTERNAL_ERROR", "The auth service could not complete the request.");
    }
}
