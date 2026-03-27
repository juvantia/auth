import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        // Fetch original SuperTokens keys (optional, but good for compatibility)
        let keys: any[] = [];
        try {
            const stJwksRes = await fetch('http://supertokens:3567/recipe/jwt/jwks', {
                headers: {
                    'rid': 'session'
                }
            });
            if (stJwksRes.ok) {
                const data = await stJwksRes.json();
                keys = data.keys || [];
            }
        } catch (e) {
            console.error("Failed to fetch ST JWKS:", e);
        }

        // Add our NEW Alchemy Signing Key (The Bridge Key)
        keys.push({
            kty: "RSA",
            kid: "alchemy-signer-key-1",
            n: "oqQaGK8HzGuI9NTtlVddZp-NKFqMincT8B2wrq1FIGIOo62i98ula57ARFJZH4cSqU_nthUChjv8R9iMEFlDU8xjOTDJIa7G32wCvoEI-catjuz5s2h_juxx6FiTFVMSfYRIZtIBNk3rNo4c7pj9Kaabx3a-qcmDwl2dA-NgmbLFbjbmhc3LI8x9MER74bkwroFq8bDYjnIVbYGm7ZhqlaXIXROfHIbsaZURho-m-JfXsdWrwSudMAsAvFHjAuv3D9UDBJ8zBpN-8hbsmS0MaH61Q5kvu91rLFIdQYPjs59LXiqxfpB7toz0XdUsWEGWb7EEqiWQFtFWQGTKJ6N8FQ",
            e: "AQAB",
            alg: "RS256",
            use: "sig"
        });

        return NextResponse.json({ keys }, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=3600'
            }
        });
    } catch (e: any) {
        console.error("JWKS error:", e);
        return NextResponse.json({ keys: [] }, { status: 500 });
    }
}
