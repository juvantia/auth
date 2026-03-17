import { NextRequest, NextResponse } from "next/server";
import supertokens from "supertokens-node";
import { backendConfig } from "@/config/backend";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { withSession } from "supertokens-node/nextjs";

try {
    supertokens.init(backendConfig());
} catch (e: any) {
    if (!e.message?.includes("already been called")) throw e;
}

export async function GET(request: NextRequest) {
    console.log("--- /api/user/profile GET ---");
    console.log("Cookie header:", request.headers.get("cookie")?.substring(0, 100));

    try {
        return await withSession(request, async (err, session) => {
            console.log("withSession callback called");
            console.log("  err:", err ? `${(err as any).type} - ${err.message}` : "null");
            console.log("  session:", session ? `userId=${session.getUserId()}` : "null/undefined");

            if (err) {
                return new NextResponse(JSON.stringify({ message: "Unauthorized (err)" }), {
                    status: 401,
                    headers: { "Content-Type": "application/json" },
                });
            }
            if (!session) {
                return NextResponse.json({ message: "Unauthorized (no session)" }, { status: 401 });
            }

            try {
                await dbConnect();
                const user = await User.findOne({ supertokens_id: session.getUserId() });

                if (!user || !user.name || !user.username) {
                    return NextResponse.json({ needsOnboarding: true }, { status: 200 });
                }

                // Получаем email из SuperTokens
                const userInfo = await supertokens.getUser(session.getUserId());
                const email = userInfo?.emails[0];

                return NextResponse.json({
                    ...user.toObject(),
                    email
                }, { status: 200 });
            } catch (error: any) {
                console.error("Profile GET error:", error);
                return NextResponse.json({ message: error.message }, { status: 500 });
            }
        }, { sessionRequired: false });
    } catch (e: any) {
        console.error("withSession THREW:", e.type, e.message, e.stack);
        return NextResponse.json({ message: "Internal session error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    return withSession(request, async (err, session) => {
        if (err) {
            return new NextResponse(JSON.stringify({ message: "Unauthorized" }), {
                status: 401,
                headers: { "Content-Type": "application/json" },
            });
        }
        if (!session) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        try {
            await dbConnect();
            const { name, username, avatar_url } = await request.json();

            const existingUser = await User.findOne({ username });
            if (existingUser && existingUser.supertokens_id !== session.getUserId()) {
                return NextResponse.json({ message: "Username already taken" }, { status: 400 });
            }

            const savedUser = await User.findOneAndUpdate(
                { supertokens_id: session.getUserId() },
                { $set: { name, username, ...(avatar_url ? { avatar_url } : {}) } },
                { upsert: true, new: true }
            );

            return NextResponse.json(savedUser, { status: 201 });
        } catch (error: any) {
            console.error("Onboarding error:", error);
            return NextResponse.json({ message: error.message }, { status: 500 });
        }
    });
}
