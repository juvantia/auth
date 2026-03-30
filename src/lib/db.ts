import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URI || 'postgresql://supertokens_user:supertokens_password@db:5432/juvantia'
});

export const query = (text: string, params?: any[]) => pool.query(text, params);

/**
 * Sync Ecosystem Tables
 */
export async function initDb() {
  console.log('📡 [Auth DB] Initializing shared PostgreSQL tables...');
  try {
    // 1. Unified Users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        supertokens_id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        username VARCHAR(255) UNIQUE,
        avatar_url TEXT,
        smart_wallet_address VARCHAR(255) UNIQUE,
        passkeys JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('✅ [Auth DB] Tables synchronized.');
  } catch (err: any) {
    console.error('❌ [Auth DB] Sync failed:', err.message);
  }
}

export default initDb;
