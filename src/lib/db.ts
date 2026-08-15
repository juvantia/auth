import { Pool, type PoolClient, type QueryResultRow } from "pg";

const pool = new Pool({
    connectionString:
        process.env.POSTGRES_URI ||
        "postgresql://supertokens_user:supertokens_password@db:5432/juvantia",
});

export const query = <T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]) =>
    pool.query<T>(text, params);

export async function transaction<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await operation(client);
        await client.query("COMMIT");
        return result;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

let initialization: Promise<void> | undefined;

async function synchronizeSchema(): Promise<void> {
    await transaction(async (client) => {
        await client.query("SELECT pg_advisory_xact_lock(hashtext('juvantia-auth-schema-v1'))");
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                supertokens_id VARCHAR(255) PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                name VARCHAR(255) NOT NULL,
                username VARCHAR(255) UNIQUE,
                avatar_url TEXT,
                smart_wallet_address VARCHAR(255) UNIQUE,
                status VARCHAR(50) DEFAULT 'citizen',
                status_description TEXT DEFAULT 'Citizen of Juvantia Technopark.',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await client.query(`
            ALTER TABLE users DROP COLUMN IF EXISTS passkeys
        `);
        await client.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS users_smart_wallet_address_ci_unique
            ON users (LOWER(smart_wallet_address))
            WHERE smart_wallet_address IS NOT NULL
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS wallet_link_challenges (
                challenge_id UUID PRIMARY KEY,
                supertokens_id VARCHAR(255) NOT NULL REFERENCES users(supertokens_id) ON DELETE CASCADE,
                wallet_address VARCHAR(42) NOT NULL
                    CHECK (wallet_address ~ '^0x[0-9A-Fa-f]{40}$'),
                chain_id INTEGER NOT NULL CHECK (chain_id = 5042002),
                message TEXT NOT NULL,
                issued_at TIMESTAMPTZ NOT NULL,
                expires_at TIMESTAMPTZ NOT NULL CHECK (expires_at > issued_at),
                attempt_count SMALLINT NOT NULL DEFAULT 0 CHECK (attempt_count BETWEEN 0 AND 5),
                consumed_at TIMESTAMPTZ,
                consumed_reason VARCHAR(32),
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS wallet_link_challenges_user_issued_idx
            ON wallet_link_challenges (supertokens_id, issued_at DESC)
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS wallet_link_challenges_expiry_idx
            ON wallet_link_challenges (expires_at)
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS wallet_link_challenges_active_user_idx
            ON wallet_link_challenges (supertokens_id, expires_at)
            WHERE consumed_at IS NULL
        `);
    });
}

export async function initDb(): Promise<void> {
    initialization ??= synchronizeSchema().catch((error) => {
        initialization = undefined;
        throw error;
    });
    return initialization;
}

export default initDb;
