import { NextResponse } from 'next/server';

export async function GET() {
    const issuer = process.env.NEXT_PUBLIC_API_DOMAIN ? `${process.env.NEXT_PUBLIC_API_DOMAIN}/api/auth/` : 'http://localhost:3001/api/auth/';
    
    return NextResponse.json({
        issuer: issuer,
        jwks_uri: `${issuer}jwt/jwks.json`,
        response_types_supported: ["code", "token", "id_token"],
        subject_types_supported: ["public"],
        id_token_signing_alg_values_supported: ["RS256"],
        claims_supported: ["sub", "iss", "aud", "iat", "exp", "email"]
    }, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        }
    });
}
