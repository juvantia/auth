import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { ErrorEnvelopeSchema } from "@/contracts/api";

const SAFE_REQUEST_ID = /^[a-zA-Z0-9._:-]{1,128}$/;

export function requestIdFor(request: Request): string {
    const supplied = request.headers.get("x-request-id");
    return supplied && SAFE_REQUEST_ID.test(supplied) ? supplied : randomUUID();
}

function headers(requestId: string) {
    return { "x-request-id": requestId, "cache-control": "no-store" };
}

export function successResponse(
    requestId: string,
    data: unknown,
    status: 200 | 201 = 200,
): NextResponse {
    return NextResponse.json(
        { success: true, data, meta: { requestId } },
        { status, headers: headers(requestId) },
    );
}

export function errorResponse(
    requestId: string,
    status: number,
    code: string,
    message: string,
    fields?: Record<string, string[]>,
): NextResponse {
    const body = ErrorEnvelopeSchema.parse({
        success: false,
        error: { code, message, requestId, ...(fields ? { fields } : {}) },
    });
    return NextResponse.json(body, { status, headers: headers(requestId) });
}
