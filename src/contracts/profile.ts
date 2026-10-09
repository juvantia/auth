import { getAddress } from "viem";
import { z } from "zod";

export const ProfileMutationSchema = z
    .object({
        name: z.string().trim().min(1).max(16),
        status_description: z.string().trim().max(500).optional(),
        active_phalera_id: z.string().trim().max(64).optional(),
    })
    .strict();

const NullableWalletAddressSchema = z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .nullable();

const OnboardingUserSchema = z
    .object({
        name: z.string().nullable(),
        smart_wallet_address: NullableWalletAddressSchema,
        status_description: z.string().nullable(),
        active_phalera_id: z.string().nullable().optional(),
    })
    .strict();

export const OnboardingProfileResponseSchema = z
    .object({
        needsOnboarding: z.literal(true),
        email: z.string().email().nullable(),
        supertokens_id: z.string().nullable().optional(),
        user: OnboardingUserSchema,
    })
    .strict();

export const CompleteProfileResponseSchema = z
    .object({
        supertokens_id: z.string().nullable().optional(),
        name: z.string().min(1).max(16),
        email: z.string().email().nullable(),
        smart_wallet_address: NullableWalletAddressSchema,
        status_description: z.string().nullable(),
        active_phalera_id: z.string().nullable().optional(),
    })
    .strict();

export const PublicProfileResponseSchema = z.union([
    OnboardingProfileResponseSchema,
    CompleteProfileResponseSchema,
]);

export interface PublicProfileSource {
    [key: string]: unknown;
    supertokens_id?: unknown;
    name?: unknown;
    email?: unknown;
    smart_wallet_address?: unknown;
    status_description?: unknown;
    active_phalera_id?: unknown;
}

function nullableString(value: unknown): string | null {
    return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function publicWalletAddress(value: unknown): string | null {
    if (typeof value !== "string") return null;
    try {
        return getAddress(value.toLowerCase());
    } catch {
        return null;
    }
}

export function buildPublicProfileResponse(
    source: PublicProfileSource,
    sessionEmail?: string,
    supertokensId?: string,
) {
    const name = nullableString(source.name);
    const walletAddress = publicWalletAddress(source.smart_wallet_address);
    const statusDescription = nullableString(source.status_description);
    const activePhaleraId = nullableString(source.active_phalera_id);
    const email = nullableString(source.email) ?? nullableString(sessionEmail);
    const civitasId = nullableString(source.supertokens_id) ?? nullableString(supertokensId);

    if (!name) {
        return OnboardingProfileResponseSchema.parse({
            needsOnboarding: true,
            email,
            supertokens_id: civitasId,
            user: {
                name,
                smart_wallet_address: walletAddress,
                status_description: statusDescription,
                active_phalera_id: activePhaleraId,
            },
        });
    }

    return CompleteProfileResponseSchema.parse({
        supertokens_id: civitasId,
        name,
        email,
        smart_wallet_address: walletAddress,
        status_description: statusDescription,
        active_phalera_id: activePhaleraId,
    });
}

export type ProfileMutation = z.infer<typeof ProfileMutationSchema>;
