export type WalletLinkErrorCode =
    | "PROFILE_REQUIRED"
    | "WALLET_RECOVERY_REQUIRED"
    | "WALLET_ADDRESS_UNAVAILABLE"
    | "CHALLENGE_NOT_FOUND"
    | "CHALLENGE_EXPIRED"
    | "CHALLENGE_ALREADY_USED"
    | "CHALLENGE_SESSION_MISMATCH"
    | "CHALLENGE_ATTEMPTS_EXCEEDED"
    | "CHALLENGE_RATE_LIMITED"
    | "INVALID_WALLET_SIGNATURE"
    | "WALLET_VERIFICATION_UNAVAILABLE";

export class WalletLinkError extends Error {
    constructor(
        public readonly code: WalletLinkErrorCode,
        public readonly status: 403 | 404 | 409 | 410 | 422 | 429 | 503,
        message: string,
    ) {
        super(message);
        this.name = "WalletLinkError";
    }
}

export const walletLinkErrors = {
    profileRequired: () =>
        new WalletLinkError("PROFILE_REQUIRED", 409, "Complete the citizen profile before linking a wallet."),
    recoveryRequired: () =>
        new WalletLinkError(
            "WALLET_RECOVERY_REQUIRED",
            409,
            "A different wallet is already linked. Use the recovery or support flow.",
        ),
    addressUnavailable: () =>
        new WalletLinkError("WALLET_ADDRESS_UNAVAILABLE", 409, "This wallet cannot be linked to this profile."),
    challengeNotFound: () =>
        new WalletLinkError("CHALLENGE_NOT_FOUND", 404, "The wallet challenge was not found."),
    challengeExpired: () =>
        new WalletLinkError("CHALLENGE_EXPIRED", 410, "The wallet challenge has expired."),
    challengeAlreadyUsed: () =>
        new WalletLinkError("CHALLENGE_ALREADY_USED", 409, "The wallet challenge has already been used."),
    challengeSessionMismatch: () =>
        new WalletLinkError("CHALLENGE_SESSION_MISMATCH", 403, "The wallet challenge belongs to another session."),
    challengeAttemptsExceeded: () =>
        new WalletLinkError("CHALLENGE_ATTEMPTS_EXCEEDED", 429, "The wallet challenge attempt limit was reached."),
    challengeRateLimited: () =>
        new WalletLinkError("CHALLENGE_RATE_LIMITED", 429, "Too many wallet challenges were requested."),
    invalidSignature: () =>
        new WalletLinkError("INVALID_WALLET_SIGNATURE", 422, "The wallet signature is invalid."),
    verificationUnavailable: () =>
        new WalletLinkError(
            "WALLET_VERIFICATION_UNAVAILABLE",
            503,
            "Wallet ownership verification is temporarily unavailable.",
        ),
} as const;
