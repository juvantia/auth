import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    if (request.method === "OPTIONS") {
        return handleCors(request, new NextResponse(null, { status: 204 }));
    }
    
    const response = NextResponse.next();
    return handleCors(request, response);
}

function handleCors(request: NextRequest, response: NextResponse) {
    const origin = request.headers.get("origin");
    if (origin && (origin.endsWith(".juvantia.org") || origin.includes("localhost"))) {
        response.headers.set("Access-Control-Allow-Origin", origin);
        response.headers.set("Access-Control-Allow-Credentials", "true");
        response.headers.set("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
        response.headers.set(
            "Access-Control-Allow-Headers",
            "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, st-auth-mode, st-custom-auth, rid, fdi-version, anti-csrf, authorization"
        );
    }
    return response;
}

export const config = {
    matcher: "/api/(.*)",
};
