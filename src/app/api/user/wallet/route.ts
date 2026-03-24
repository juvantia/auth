import { NextRequest, NextResponse } from "next/server";
import { withSession } from "supertokens-node/nextjs";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(request: NextRequest) {
    return withSession(request, async (err, session) => {
        if (err || !session) {
            return new NextResponse(JSON.stringify({ message: "Unauthorized" }), {
                status: 401,
                headers: { "Content-Type": "application/json" },
            });
        }

        try {
            await dbConnect();
            const { smart_wallet_address } = await request.json();

            if (!smart_wallet_address) {
                return NextResponse.json({ message: "Wallet address required" }, { status: 400 });
            }

            const updatedUser = await User.findOneAndUpdate(
                { supertokens_id: session.getUserId() },
                { $set: { smart_wallet_address } },
                { new: true }
            );

            if (!updatedUser) {
                return NextResponse.json({ message: "User not found" }, { status: 404 });
            }

            return NextResponse.json(updatedUser, { status: 200 });
        } catch (error: any) {
            console.error("Wallet save error:", error);
            return NextResponse.json({ message: error.message }, { status: 500 });
        }
    });
}
