import { getAddress, type Hex } from "viem";
import { z } from "zod";

export const ARC_TESTNET_CHAIN_ID = 5_042_002 as const;
export const ARC_TESTNET_NETWORK = "arcTestnet" as const;

export const WalletAddressSchema = z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .transform((value, context) => {
        try {
            return getAddress(value);
        } catch {
            context.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid EVM address checksum" });
            return z.NEVER;
        }
    });

export const WalletSignatureSchema = z
    .string()
    .min(4)
    .max(131_074)
    .regex(/^0x(?:[a-fA-F0-9]{2})+$/)
    .transform((value) => value as Hex);

export const WalletChallengeRequestSchema = z
    .object({
        address: WalletAddressSchema,
    })
    .strict();

export const WalletLinkRequestSchema = z
    .object({
        challengeId: z.string().uuid(),
        signature: WalletSignatureSchema,
    })
    .strict();

export const WalletChallengeDataSchema = z
    .object({
        challengeId: z.string().uuid(),
        address: WalletAddressSchema,
        network: z.literal(ARC_TESTNET_NETWORK),
        chainId: z.literal(ARC_TESTNET_CHAIN_ID),
        message: z.string().min(1).max(4_096),
        issuedAt: z.string().datetime(),
        expiresAt: z.string().datetime(),
    })
    .strict();

export const WalletLinkDataSchema = z
    .object({
        address: WalletAddressSchema,
        network: z.literal(ARC_TESTNET_NETWORK),
        chainId: z.literal(ARC_TESTNET_CHAIN_ID),
        status: z.enum(["linked", "already_linked"]),
    })
    .strict();

export type WalletAddress = z.infer<typeof WalletAddressSchema>;
export type WalletChallengeRequest = z.infer<typeof WalletChallengeRequestSchema>;
export type WalletLinkRequest = z.infer<typeof WalletLinkRequestSchema>;
export type WalletChallengeData = z.infer<typeof WalletChallengeDataSchema>;
export type WalletLinkData = z.infer<typeof WalletLinkDataSchema>;
