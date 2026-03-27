import { NextRequest, NextResponse } from 'next/server';
import Session from 'supertokens-node/recipe/session';
import { withSession } from 'supertokens-node/nextjs';
import jwt from 'jsonwebtoken';
import { backendConfig } from '@/config/backend';
import supertokens from 'supertokens-node';

supertokens.init(backendConfig());

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { nonce } = body;

        return await withSession(request, async (err, session) => {
            if (err) throw err;
            if (!session) {
                return NextResponse.json({ message: "No session found" }, { status: 401 });
            }

            const userId = session.getUserId();
            const payload = await session.getAccessTokenPayload();
            const email = payload.email;

            // Настроечные данные для Alchemy
            const privateKey = (process.env.ALCHEMY_JWKS_PRIVATE_KEY || '').replace(/\\n/g, '\n');
            const issuer = process.env.NEXT_PUBLIC_API_DOMAIN ? `${process.env.NEXT_PUBLIC_API_DOMAIN}/api/auth/` : 'https://auth.juvantia.org/api/auth/';
            const audience = "b86126bc-ddd4-4ada-948f-3f5a3b81eb2e";

            if (!privateKey) {
                console.error("ALCHEMY_JWKS_PRIVATE_KEY is missing in env");
                return NextResponse.json({ message: "Server configuration error" }, { status: 500 });
            }

            // Создаем новый JWT специально для Alchemy
            const alchemyToken = jwt.sign(
                {
                    sub: userId,
                    iss: issuer,
                    aud: audience,
                    email: email,
                    nonce: nonce, // Тот самый nonce, который требует Alchemy для паскеев
                    iat: Math.floor(Date.now() / 1000),
                    exp: Math.floor(Date.now() / 1000) + 3600, // 1 час
                },
                privateKey,
                {
                    algorithm: 'RS256',
                    keyid: 'alchemy-signer-key-1'
                }
            );

            return NextResponse.json({ token: alchemyToken });
        });
    } catch (error: any) {
        console.error("Token bridging error:", error);
        return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
    }
}
