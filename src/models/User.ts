import { query } from "@/lib/db";
import type { ProfileMutation } from "@/contracts/profile";

export interface IUser {
    supertokens_id: string;
    email: string;
    name: string;
    username: string | null;
    avatar_url: string | null;
    readonly smart_wallet_address: string | null;
    readonly passkeys: unknown[];
    status_description: string | null;
    created_at?: Date;
    updated_at?: Date;
}

export type ProfileUpdate = ProfileMutation & { email: string };

export const User = {
    findOne: async (criteria: { supertokens_id?: string; username?: string }): Promise<IUser | null> => {
        if (criteria.supertokens_id) {
            const result = await query<IUser>("SELECT * FROM users WHERE supertokens_id = $1", [
                criteria.supertokens_id,
            ]);
            return result.rows[0] ?? null;
        }
        if (criteria.username) {
            const result = await query<IUser>("SELECT * FROM users WHERE username = $1", [
                criteria.username.toLowerCase(),
            ]);
            return result.rows[0] ?? null;
        }
        return null;
    },

    upsertProfile: async (userId: string, update: ProfileUpdate): Promise<IUser> => {
        const existing = await User.findOne({ supertokens_id: userId });
        if (!existing) {
            const result = await query<IUser>(
                `INSERT INTO users
                    (supertokens_id, email, name, username, avatar_url, status_description, smart_wallet_address)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING *`,
                [
                    userId,
                    update.email,
                    update.name,
                    update.username,
                    update.avatar_url ?? null,
                    update.status_description ?? "Citizen of Juvantia Technopark.",
                    update.smart_wallet_address ?? null,
                ],
            );
            return result.rows[0];
        }

        const result = await query<IUser>(
            `UPDATE users
             SET email = $2,
                 name = $3,
                 username = $4,
                 avatar_url = $5,
                 status_description = $6,
                 smart_wallet_address = $7,
                 updated_at = NOW()
             WHERE supertokens_id = $1
             RETURNING *`,
            [
                userId,
                update.email,
                update.name,
                update.username,
                update.avatar_url !== undefined ? update.avatar_url : existing.avatar_url,
                update.status_description !== undefined
                    ? update.status_description
                    : existing.status_description,
                update.smart_wallet_address !== undefined
                    ? update.smart_wallet_address
                    : existing.smart_wallet_address,
            ],
        );
        return result.rows[0];
    },
};

export default User;
