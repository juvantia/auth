import { query } from "../lib/db";

export interface IUser {
  supertokens_id: string;
  email: string;
  name: string;
  username: string;
  avatar_url?: string;
  smart_wallet_address?: string;
  passkeys: string[];
  created_at?: Date;
  updated_at?: Date;
}

export const User = {
  /**
   * findOne based on supertokens_id
   */
  findOne: async (criteria: { supertokens_id?: string; username?: string }): Promise<IUser | null> => {
    if (criteria.supertokens_id) {
      const res = await query('SELECT * FROM users WHERE supertokens_id = $1', [criteria.supertokens_id]);
      return res.rows.length > 0 ? res.rows[0] : null;
    }
    if (criteria.username) {
      const res = await query('SELECT * FROM users WHERE username = $1', [criteria.username]);
      return res.rows.length > 0 ? res.rows[0] : null;
    }
    return null;
  },

  /**
   * findOneAndUpdate or Create (UPSERT)
   */
  findOneAndUpdate: async (
    filter: { supertokens_id: string },
    update: Partial<IUser>,
    options: { upsert?: boolean; new?: boolean } = {}
  ): Promise<IUser | null> => {
    const existing = await User.findOne({ supertokens_id: filter.supertokens_id });
    
    if (!existing) {
      if (options.upsert) {
         const res = await query(
           `INSERT INTO users (supertokens_id, email, name, username, avatar_url, smart_wallet_address, passkeys)
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
           [
             filter.supertokens_id,
             update.email || '',
             update.name || '',
             update.username || (update.email ? update.email.split('@')[0] : null),
             update.avatar_url || null,
             update.smart_wallet_address || null,
             JSON.stringify(update.passkeys || [])
           ]
         );
         return res.rows[0];
      }
      return null;
    }

    // UPDATE
    const name = update.name !== undefined ? update.name : existing.name;
    const email = update.email !== undefined ? update.email : existing.email;
    const avatar_url = update.avatar_url !== undefined ? update.avatar_url : existing.avatar_url;
    const smart_wallet_address = update.smart_wallet_address !== undefined ? update.smart_wallet_address : existing.smart_wallet_address;
    const passkeys = update.passkeys !== undefined ? JSON.stringify(update.passkeys) : JSON.stringify(existing.passkeys);

    const res = await query(
      `UPDATE users SET name = $1, email = $2, avatar_url = $3, smart_wallet_address = $4, passkeys = $5, updated_at = NOW()
       WHERE supertokens_id = $6 RETURNING *`,
      [name, email, avatar_url, smart_wallet_address, passkeys, filter.supertokens_id]
    );
    return res.rows[0];
  }
};

export default User;
