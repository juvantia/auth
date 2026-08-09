import { getAddress } from "viem";
import { z } from "zod";

const USERNAME_PATTERN = /^[a-zA-Z0-9_@.:+-]+$/;
const DATA_IMAGE_PATTERN = /^data:image\/(?:jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/;

function isAllowedAvatar(value: string): boolean {
    if (value.startsWith("/uploads/") || value === "/placeholder.png") return true;
    if (DATA_IMAGE_PATTERN.test(value)) return true;
    try {
        const url = new URL(value);
        return url.protocol === "https:" || url.protocol === "http:";
    } catch {
        return false;
    }
}

export const ProfileMutationSchema = z
    .object({
        name: z.string().trim().min(1).max(100),
        username: z
            .string()
            .trim()
            .min(5)
            .max(50)
            .regex(USERNAME_PATTERN)
            .transform((value) => value.toLowerCase()),
        avatar_url: z.string().trim().max(1_000_000).refine(isAllowedAvatar, "Invalid avatar URL").optional(),
        status_description: z.string().trim().max(500).optional(),
        smart_wallet_address: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
    })
    .strict();

const NullableWalletAddressSchema = z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .nullable();

const OnboardingUserSchema = z
    .object({
        name: z.string().nullable(),
        username: z.string().nullable(),
        avatar_url: z.string().nullable(),
        smart_wallet_address: NullableWalletAddressSchema,
        status_description: z.string().nullable(),
    })
    .strict();

export const OnboardingProfileResponseSchema = z
    .object({
        needsOnboarding: z.literal(true),
        email: z.string().email().nullable(),
        user: OnboardingUserSchema,
    })
    .strict();

export const CompleteProfileResponseSchema = z
    .object({
        name: z.string().min(1),
        username: z.string().min(1),
        email: z.string().email().nullable(),
        avatar_url: z.string().nullable(),
        smart_wallet_address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
        status_description: z.string().nullable(),
    })
    .strict();

export const PublicProfileResponseSchema = z.union([
    OnboardingProfileResponseSchema,
    CompleteProfileResponseSchema,
]);

export interface PublicProfileSource {
    [key: string]: unknown;
    name?: unknown;
    username?: unknown;
    email?: unknown;
    avatar_url?: unknown;
    smart_wallet_address?: unknown;
    status_description?: unknown;
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

export function buildPublicProfileResponse(source: PublicProfileSource, sessionEmail?: string) {
    const name = nullableString(source.name);
    const username = nullableString(source.username);
    const avatarUrl = nullableString(source.avatar_url);
    const walletAddress = publicWalletAddress(source.smart_wallet_address);
    const statusDescription = nullableString(source.status_description);
    const email = nullableString(source.email) ?? nullableString(sessionEmail);

    if (!name || !username || !walletAddress) {
        return OnboardingProfileResponseSchema.parse({
            needsOnboarding: true,
            email,
            user: {
                name,
                username,
                avatar_url: avatarUrl,
                smart_wallet_address: walletAddress,
                status_description: statusDescription,
            },
        });
    }

    return CompleteProfileResponseSchema.parse({
        name,
        username,
        email,
        avatar_url: avatarUrl,
        smart_wallet_address: walletAddress,
        status_description: statusDescription,
    });
}

export type ProfileMutation = z.infer<typeof ProfileMutationSchema>;
