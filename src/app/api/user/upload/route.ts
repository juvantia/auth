export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { randomUUID } from "node:crypto";
import { join } from "path";
import supertokens from "supertokens-node";
import { backendConfig } from "@/config/backend";
import { withSession } from "supertokens-node/nextjs";
import {
    MAX_MULTIPART_BYTES,
    validateAvatarBytes,
} from "@/lib/uploads/avatar-upload";

supertokens.init(backendConfig());

export async function POST(request: NextRequest) {
    return withSession(request, async (err, session) => {
        if (err || !session) {
            return NextResponse.json(
                { code: "AUTHENTICATION_REQUIRED", message: "Authentication is required." },
                { status: 401 },
            );
        }

        try {
            const contentType = request.headers.get("content-type") ?? "";
            if (!contentType.toLowerCase().startsWith("multipart/form-data;")) {
                return NextResponse.json(
                    { code: "UNSUPPORTED_MEDIA_TYPE", message: "A multipart image upload is required." },
                    { status: 415 },
                );
            }

            const contentLength = Number(request.headers.get("content-length"));
            if (Number.isFinite(contentLength) && contentLength > MAX_MULTIPART_BYTES) {
                return NextResponse.json(
                    { code: "AVATAR_TOO_LARGE", message: "The avatar must not exceed 5 MB." },
                    { status: 413 },
                );
            }

            const formData = await request.formData();
            const entry = formData.get("file");
            if (!entry || typeof entry === "string") {
                return NextResponse.json(
                    { code: "AVATAR_REQUIRED", message: "Select an avatar image." },
                    { status: 400 },
                );
            }

            const buffer = Buffer.from(await entry.arrayBuffer());
            const extension = validateAvatarBytes(entry.type, buffer);
            if (!extension) {
                return NextResponse.json(
                    {
                        code: "INVALID_AVATAR",
                        message: "Use a valid JPG, PNG, or WebP image up to 5 MB.",
                    },
                    { status: 415 },
                );
            }

            // Path for storing avatars (public/uploads folder)
            const uploadDir = join(process.cwd(), "public", "uploads");
            await mkdir(uploadDir, { recursive: true });

            const fileName = `${randomUUID()}${extension}`;
            const path = join(uploadDir, fileName);

            await writeFile(path, buffer, { flag: "wx", mode: 0o600 });

            const avatarUrl = `/uploads/${fileName}`;
            return NextResponse.json(
                { avatarUrl },
                { status: 201, headers: { "Cache-Control": "no-store" } },
            );
        } catch {
            console.error("Avatar upload failed");
            return NextResponse.json(
                { code: "UPLOAD_UNAVAILABLE", message: "Avatar upload is temporarily unavailable." },
                { status: 503 },
            );
        }
    });
}
