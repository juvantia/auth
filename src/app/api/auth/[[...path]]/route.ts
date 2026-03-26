export const dynamic = "force-dynamic";
import { NextResponse, NextRequest } from "next/server";
import supertokens from "supertokens-node";
import { backendConfig } from "@/config/backend";
import { getAppDirRequestHandler } from "supertokens-node/nextjs";

supertokens.init(backendConfig());

const handleCall = getAppDirRequestHandler();

export async function GET(request: NextRequest) {
    return handleCall(request);
}

export async function POST(request: NextRequest) {
    return handleCall(request);
}

export async function DELETE(request: NextRequest) {
    return handleCall(request);
}

export async function PUT(request: NextRequest) {
    return handleCall(request);
}

export async function PATCH(request: NextRequest) {
    return handleCall(request);
}

export async function OPTIONS(request: NextRequest) {
    return handleCall(request);
}
