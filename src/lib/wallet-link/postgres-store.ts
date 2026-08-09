import type { PoolClient, QueryResultRow } from "pg";
import type { WalletAddress } from "@/contracts/wallet-link";
import { initDb, transaction } from "@/lib/db";
import { walletLinkErrors } from "./errors";
import type {
    ConsumeAndLinkResult,
    CreateChallengeResult,
    WalletChallengeRecord,
    WalletLinkStore,
} from "./types";

const CHALLENGE_RATE_WINDOW_MS = 10 * 60_000;
const MAX_CHALLENGES_PER_WINDOW = 5;
const MAX_VERIFICATION_ATTEMPTS = 5;
const CLEANUP_RETENTION_MS = 24 * 60 * 60_000;

interface UserWalletRow extends QueryResultRow {
    supertokens_id: string;
    name: string | null;
    username: string | null;
    smart_wallet_address: string | null;
}

interface ChallengeRow extends QueryResultRow {
    challenge_id: string;
    supertokens_id: string;
    wallet_address: WalletAddress;
    chain_id: number;
    message: string;
    issued_at: Date;
    expires_at: Date;
    attempt_count: number;
    consumed_at: Date | null;
}

function sameAddress(left: string, right: string): boolean {
    return left.toLowerCase() === right.toLowerCase();
}

function toChallenge(row: ChallengeRow): WalletChallengeRecord {
    return {
        challengeId: row.challenge_id,
        userId: row.supertokens_id,
        address: row.wallet_address,
        chainId: 5_042_002,
        message: row.message,
        issuedAt: new Date(row.issued_at),
        expiresAt: new Date(row.expires_at),
    };
}

function assertUsableChallenge(row: ChallengeRow | undefined, userId: string, now: Date): ChallengeRow {
    if (!row) throw walletLinkErrors.challengeNotFound();
    if (row.supertokens_id !== userId) throw walletLinkErrors.challengeSessionMismatch();
    if (row.consumed_at) throw walletLinkErrors.challengeAlreadyUsed();
    if (new Date(row.expires_at).getTime() <= now.getTime()) throw walletLinkErrors.challengeExpired();
    return row;
}

async function consumeChallenge(
    client: PoolClient,
    challengeId: string,
    now: Date,
    reason: "linked" | "conflict" | "superseded",
): Promise<void> {
    await client.query(
        `UPDATE wallet_link_challenges
         SET consumed_at = $2, consumed_reason = $3
         WHERE challenge_id = $1 AND consumed_at IS NULL`,
        [challengeId, now, reason],
    );
}

export class PostgresWalletLinkStore implements WalletLinkStore {
    async createChallenge(record: WalletChallengeRecord, now: Date): Promise<CreateChallengeResult> {
        await initDb();
        return transaction(async (client) => {
            await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [record.userId]);
            await client.query(
                `DELETE FROM wallet_link_challenges
                 WHERE expires_at < $1`,
                [new Date(now.getTime() - CLEANUP_RETENTION_MS)],
            );

            const userResult = await client.query<UserWalletRow>(
                `SELECT supertokens_id, name, username, smart_wallet_address
                 FROM users WHERE supertokens_id = $1 FOR UPDATE`,
                [record.userId],
            );
            const user = userResult.rows[0];
            if (!user || !user.name?.trim() || !user.username?.trim()) {
                return { status: "profile_required" };
            }
            if (user.smart_wallet_address && !sameAddress(user.smart_wallet_address, record.address)) {
                return { status: "recovery_required" };
            }

            const ownerResult = await client.query<{ supertokens_id: string }>(
                `SELECT supertokens_id FROM users
                 WHERE smart_wallet_address IS NOT NULL
                   AND LOWER(smart_wallet_address) = LOWER($1)
                   AND supertokens_id <> $2
                 FOR UPDATE`,
                [record.address, record.userId],
            );
            if (ownerResult.rowCount) return { status: "address_unavailable" };

            const rateResult = await client.query<{ count: string }>(
                `SELECT COUNT(*)::text AS count
                 FROM wallet_link_challenges
                 WHERE supertokens_id = $1 AND issued_at >= $2`,
                [record.userId, new Date(now.getTime() - CHALLENGE_RATE_WINDOW_MS)],
            );
            if (Number(rateResult.rows[0]?.count ?? 0) >= MAX_CHALLENGES_PER_WINDOW) {
                return { status: "rate_limited" };
            }

            await client.query(
                `UPDATE wallet_link_challenges
                 SET consumed_at = $2, consumed_reason = 'superseded'
                 WHERE supertokens_id = $1 AND consumed_at IS NULL`,
                [record.userId, now],
            );
            await client.query(
                `INSERT INTO wallet_link_challenges
                    (challenge_id, supertokens_id, wallet_address, chain_id, message, issued_at, expires_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                    record.challengeId,
                    record.userId,
                    record.address,
                    record.chainId,
                    record.message,
                    record.issuedAt,
                    record.expiresAt,
                ],
            );
            return { status: "created" };
        });
    }

    async getChallengeForVerification(
        challengeId: string,
        userId: string,
        now: Date,
    ): Promise<WalletChallengeRecord> {
        await initDb();
        return transaction(async (client) => {
            const result = await client.query<ChallengeRow>(
                "SELECT * FROM wallet_link_challenges WHERE challenge_id = $1 FOR UPDATE",
                [challengeId],
            );
            const row = assertUsableChallenge(result.rows[0], userId, now);
            if (row.attempt_count >= MAX_VERIFICATION_ATTEMPTS) {
                throw walletLinkErrors.challengeAttemptsExceeded();
            }
            await client.query(
                "UPDATE wallet_link_challenges SET attempt_count = attempt_count + 1 WHERE challenge_id = $1",
                [challengeId],
            );
            return toChallenge(row);
        });
    }

    async consumeAndLink(
        challengeId: string,
        userId: string,
        address: WalletAddress,
        now: Date,
    ): Promise<ConsumeAndLinkResult> {
        await initDb();
        try {
            return await transaction(async (client) => {
                const challengeResult = await client.query<ChallengeRow>(
                    "SELECT * FROM wallet_link_challenges WHERE challenge_id = $1 FOR UPDATE",
                    [challengeId],
                );
                const challenge = assertUsableChallenge(challengeResult.rows[0], userId, now);
                if (!sameAddress(challenge.wallet_address, address)) {
                    throw walletLinkErrors.invalidSignature();
                }

                const userResult = await client.query<UserWalletRow>(
                    `SELECT supertokens_id, name, username, smart_wallet_address
                     FROM users WHERE supertokens_id = $1 FOR UPDATE`,
                    [userId],
                );
                const user = userResult.rows[0];
                if (!user) return { status: "profile_required" };

                if (user.smart_wallet_address) {
                    const sameWallet = sameAddress(user.smart_wallet_address, address);
                    await consumeChallenge(client, challengeId, now, sameWallet ? "linked" : "conflict");
                    return sameWallet
                        ? { status: "already_linked" }
                        : { status: "recovery_required" };
                }

                const ownerResult = await client.query<{ supertokens_id: string }>(
                    `SELECT supertokens_id FROM users
                     WHERE smart_wallet_address IS NOT NULL
                       AND LOWER(smart_wallet_address) = LOWER($1)
                       AND supertokens_id <> $2
                     FOR UPDATE`,
                    [address, userId],
                );
                if (ownerResult.rowCount) {
                    await consumeChallenge(client, challengeId, now, "conflict");
                    return { status: "address_unavailable" };
                }

                await client.query(
                    `UPDATE users
                     SET smart_wallet_address = $2, updated_at = $3
                     WHERE supertokens_id = $1`,
                    [userId, address, now],
                );
                await consumeChallenge(client, challengeId, now, "linked");
                return { status: "linked" };
            });
        } catch (error) {
            if (
                typeof error === "object" &&
                error !== null &&
                "code" in error &&
                error.code === "23505"
            ) {
                await transaction(async (client) => {
                    await client.query(
                        `UPDATE wallet_link_challenges
                         SET consumed_at = $3, consumed_reason = 'conflict'
                         WHERE challenge_id = $1
                           AND supertokens_id = $2
                           AND consumed_at IS NULL`,
                        [challengeId, userId, now],
                    );
                });
                return { status: "address_unavailable" };
            }
            throw error;
        }
    }
}
