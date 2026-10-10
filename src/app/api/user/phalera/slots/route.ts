export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { type NextRequest, NextResponse } from "next/server";
import { withSession } from "supertokens-node/nextjs";
import { errorResponse, requestIdFor } from "@/lib/http/api-response";
import { ensureSuperTokensInitialized } from "@/lib/supertokens-server";
import { PhaleraSlotsResponseSchema } from "@/contracts/phalera";

ensureSuperTokensInitialized();

export async function GET(request: NextRequest) {
    const requestId = requestIdFor(request);
    try {
        return await withSession(
            request,
            async (sessionError, session) => {
                if (sessionError || !session) {
                    return errorResponse(requestId, 401, "AUTHENTICATION_REQUIRED", "A valid session is required.");
                }

                const headers=new Headers();
                for(const name of ['authorization','cookie','anti-csrf','rid','st-auth-mode','fdi-version']) {
                    const value=request.headers.get(name);if(value)headers.set(name,value);
                }
                const upstream=await fetch(`${process.env.CORE_URL||'http://core:3000'}/api/phalera/slots`,{
                    headers,cache:'no-store',signal:AbortSignal.timeout(10000),redirect:'error'
                });
                if(!upstream.ok)return errorResponse(requestId,upstream.status===401?401:503,'PHALERA_UNAVAILABLE','Phalera inventory is temporarily unavailable.');
                const result=await upstream.json();
                const payload=PhaleraSlotsResponseSchema.parse({success:true,slots:result.data.slots});

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
