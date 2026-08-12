export const dynamic = "force-dynamic";

import { type NextRequest } from "next/server";
import { errorResponse, requestIdFor } from "@/lib/http/api-response";

export async function POST(request: NextRequest) {
    const requestId = requestIdFor(request);
    return errorResponse(
        requestId,
        410,
        "WALLET_LINK_FLOW_REQUIRED",
        "Use /api/user/wallet/challenge and /api/user/wallet/link to prove wallet ownership.",
    );
}
