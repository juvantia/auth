export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import supertokens from "supertokens-node";
import { backendConfig } from "@/config/backend";
import dbConnect from "@/lib/db";
import { User, IUser } from "@/models/User";
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
                
                const supertokens_id = session.getUserId();
                console.log(`[GET] Looking for user ${supertokens_id}...`);
                
                const user = await User.findOne({ supertokens_id });
                console.log(`[GET] Found user: ${user ? JSON.stringify(user).substring(0, 50) + "..." : "NULL"}`);

                // Получаем email из SuperTokens
                const userInfo = await supertokens.getUser(supertokens_id);
                console.log(`[GET] SuperTokens userInfo: ${userInfo ? "FOUND" : "NOT FOUND"}`);
                const email = userInfo?.emails[0];

                // Самолечение: если в базе нет почты, записываем её
                if (user && email && !user.email) {
                    console.log(`[GET] Self-healing email for user ${supertokens_id}`);
                    await User.findOneAndUpdate({ supertokens_id }, { email });
                }

                // 3. Если пользователя нет, или нет обязательных полей (включая кошелек) - на онбординг
                if (!user || !user.name || !user.username || !user.smart_wallet_address) {
                    console.log(`[GET] Onboarding needed for ${supertokens_id}. UserExists=${!!user}, Name=${user?.name}, Username=${user?.username}, Wallet=${user?.smart_wallet_address}`);
                    return NextResponse.json({ 
                        needsOnboarding: true, 
                        email,
                        user: user ? {
                            name: user.name,
                            username: user.username,
                            avatar_url: user.avatar_url,
                            smart_wallet_address: user.smart_wallet_address
                        } : null
                    }, { status: 200 });
                }

                console.log(`[GET] Returning profile for ${supertokens_id}`);
                // Возвращаем чистый объект без лишних полей pg
                return NextResponse.json({
                    supertokens_id: user.supertokens_id,
                    name: user.name,
                    username: user.username,
                    email: user.email || email,
                    avatar_url: user.avatar_url,
                    smart_wallet_address: user.smart_wallet_address,
                    passkeys: user.passkeys || []
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
            const { name, username, avatar_url, smart_wallet_address, passkey } = await request.json();

            if (!name || !username) {
                return NextResponse.json({ message: "Name and username are required" }, { status: 400 });
            }

            // Получаем актуальный email из SuperTokens
            const userInfo = await supertokens.getUser(session.getUserId());
            const email = userInfo?.emails[0];

            if (!email) {
                return NextResponse.json({ message: "Could not retrieve email from session" }, { status: 400 });
            }

            const existingUser = await User.findOne({ username });
            if (existingUser && existingUser.supertokens_id !== session.getUserId()) {
                return NextResponse.json({ message: "Username already taken" }, { status: 400 });
            }

            // Умный апдейт: ищем по id
            const updateObj: Partial<IUser> = { 
                email: email || '', 
                name, 
                username, 
            };
            if (smart_wallet_address) updateObj.smart_wallet_address = smart_wallet_address;
            if (avatar_url) updateObj.avatar_url = avatar_url;

            // Handle passkeys: get existing and add new
            const user = await User.findOne({ supertokens_id: session.getUserId() });
            if (passkey) {
                const existingPasskeys = user?.passkeys || [];
                if (!existingPasskeys.includes(passkey)) {
                    updateObj.passkeys = [...existingPasskeys, passkey];
                }
            }

            const savedUser = await User.findOneAndUpdate(
                { supertokens_id: session.getUserId() },
                updateObj,
                { upsert: true, new: true }
            );

            return NextResponse.json(savedUser, { status: 201 });
        } catch (error: any) {
            console.error("Onboarding error:", error);
            return NextResponse.json({ message: error.message }, { status: 500 });
        }
    });
}
