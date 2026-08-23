export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { randomUUID } from "node:crypto";

import { type NextRequest, NextResponse } from "next/server";
import { withSession } from "supertokens-node/nextjs";
import { getAddress } from "viem";

import { SendEURCIntentSchema } from "@/contracts/profile";
import { query } from "@/lib/db";
import { errorResponse, requestIdFor } from "@/lib/http/api-response";
import { ensureSuperTokensInitialized } from "@/lib/supertokens-server";

ensureSuperTokensInitialized();

const EURC_ADDRESS = "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a";

interface WalletRow {
    username: string | null;
    smart_wallet_address: string | null;
}

function response(requestId: string, data: unknown) {
    return NextResponse.json(data, {
        headers: { "cache-control": "no-store", "x-request-id": requestId },
    });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    const requestId = requestIdFor(request);
    const parsed = SendEURCIntentSchema.safeParse(await request.json().catch(() => undefined));
    if (!parsed.success) {
        return errorResponse(requestId, 400, "INVALID_TRANSFER_INTENT", "A recipient username and a positive EURC amount are required.");
    }

    try {
        return await withSession(
            request,
            async (sessionError, session) => {
                if (sessionError || !session) {
                    return errorResponse(requestId, 401, "AUTHENTICATION_REQUIRED", "A valid session is required.");
                }

                const senderResult = await query<WalletRow>(
                    "SELECT username, smart_wallet_address FROM users WHERE supertokens_id = $1",
                    [session.getUserId()],
                );
                const sender = senderResult.rows[0];
                if (!sender?.username || !sender.smart_wallet_address) {
                    return errorResponse(requestId, 409, "SENDER_WALLET_REQUIRED", "An active smart wallet is required before sending EURC.");
                }
                if (sender.username.toLowerCase() === parsed.data.recipientUsername) {
                    return errorResponse(requestId, 409, "SELF_TRANSFER_NOT_ALLOWED", "Choose a different citizen as the recipient.");
                }

                const recipientResult = await query<WalletRow>(
                    "SELECT username, smart_wallet_address FROM users WHERE lower(username) = $1",
                    [parsed.data.recipientUsername],
                );
                const recipient = recipientResult.rows[0];
                if (!recipient) {
                    return errorResponse(requestId, 404, "RECIPIENT_NOT_FOUND", "The selected citizen was not found.");
                }
                if (!recipient.smart_wallet_address) {
                    return errorResponse(requestId, 409, "RECIPIENT_WALLET_REQUIRED", "The selected citizen has no active smart wallet.");
                }

                return response(requestId, {
                    status: "confirmed",
                    confirmationId: randomUUID(),
                    confirmedAt: Date.now(),
                    intent: {
                        intentId: randomUUID(),
                        network: "arcTestnet",
                        from: getAddress(sender.smart_wallet_address),
                        to: getAddress(recipient.smart_wallet_address),
                        tokenAddress: EURC_ADDRESS,
                        token: "EURC",
                        amount: parsed.data.amount,
                        sponsorship: { mode: "circlePaymaster" },
                    },
                });
            },
            { sessionRequired: false },
        );
    } catch {
        return errorResponse(requestId, 500, "INTERNAL_ERROR", "The transfer intent could not be prepared.");
    }
}
