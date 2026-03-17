import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";
import supertokens from "supertokens-node";
import { backendConfig } from "@/config/backend";
import { withSession } from "supertokens-node/nextjs";

supertokens.init(backendConfig());

export async function POST(request: NextRequest) {
    return withSession(request, async (err, session) => {
        if (err || !session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        try {
            const formData = await request.formData();
            const file = formData.get("file") as File;
            if (!file) {
                return NextResponse.json({ message: "No file uploaded" }, { status: 400 });
            }

            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);

            // Путь для хранения аватарок (папка public/uploads)
            const uploadDir = join(process.cwd(), "public", "uploads");
            await mkdir(uploadDir, { recursive: true });

            const fileName = `${uuidv4()}-${file.name}`;
            const path = join(uploadDir, fileName);
            
            await writeFile(path, buffer);
            
            const avatarUrl = `/uploads/${fileName}`;
            return NextResponse.json({ avatarUrl });
        } catch (error: any) {
            console.error("Upload error:", error);
            return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
        }
    });
}
