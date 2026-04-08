export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import supertokens from "supertokens-node";
import { backendConfig } from "@/config/backend";
import { query } from "@/lib/db";
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
        // 0. Check for Internal Service-to-Service Secret (Bypasses Session/Cookies)
        const internalKey = request.headers.get("x-internal-auth");
        const forcedUserId = request.headers.get("x-user-id");
        
        if (internalKey === 'true' && forcedUserId) {
            return await getProfileByUserId(forcedUserId);
        }

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
                const supertokens_id = session.getUserId();
                console.log(`[GET] Looking for user ${supertokens_id} in PostgreSQL...`);
                
                // 1. Get profile from PostgreSQL
                const result = await query("SELECT * FROM users WHERE supertokens_id = $1", [supertokens_id]);
                let user = result.rows[0];
                
                // 2. Get info from SuperTokens
                const userInfo = await supertokens.getUser(supertokens_id);
                const email = userInfo?.emails[0];
                
                // 3. Self-healing: If not in PG but in ST, creating basic record
                if (!user && email) {
                    console.log(`[GET] User ${supertokens_id} not found in PG. Auto-creating record...`);
                    const insertResult = await query(
                        "INSERT INTO users (supertokens_id, email, name) VALUES ($1, $2, $3) RETURNING *",
                        [supertokens_id, email, email.split('@')[0]]
                    );
                    user = insertResult.rows[0];
                }

                if (!user) {
                    return NextResponse.json({ message: "User profile not found" }, { status: 404 });
                }

                // 4. Checking onboarding status
                if (!user.name || !user.username || !user.smart_wallet_address) {
                    return NextResponse.json({ 
                        needsOnboarding: true, 
                        email,
                        user: {
                            name: user.name,
                            username: user.username,
                            avatar_url: user.avatar_url,
                            smart_wallet_address: user.smart_wallet_address
                        }
                    }, { status: 200 });
                }

                console.log(`[GET] Returning profile for ${supertokens_id}`);
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
