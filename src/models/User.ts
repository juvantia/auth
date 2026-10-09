import { query } from "@/lib/db";
import type { ProfileMutation } from "@/contracts/profile";

export interface IUser {
    supertokens_id: string;
    email: string;
    name: string;
    status_description: string | null;
    active_phalera_id: string | null;
    created_at?: Date;
    updated_at?: Date;
}

export type ProfileUpdate = ProfileMutation & { email: string };

const PROFILE_COLUMNS = "supertokens_id, email, name, status_description, active_phalera_id";

export const User = {
    findOne: async (criteria: { supertokens_id?: string }): Promise<IUser | null> => {
        if (criteria.supertokens_id) {
            const result = await query<IUser>(`SELECT ${PROFILE_COLUMNS} FROM users WHERE supertokens_id = $1`, [
                criteria.supertokens_id,
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
                    (supertokens_id, email, name, status_description, active_phalera_id)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING ${PROFILE_COLUMNS}`,
                [
                    userId,
                    update.email,
                    update.name,
                    update.status_description ?? null,
                    update.active_phalera_id ?? null,
                ],
            );
            return result.rows[0];
        }

        const result = await query<IUser>(
            `UPDATE users
             SET email = $2,
                 name = $3,
                 status_description = $4,
                 active_phalera_id = $5,
                 updated_at = NOW()
             WHERE supertokens_id = $1
             RETURNING ${PROFILE_COLUMNS}`,
            [
                userId,
                update.email,
                update.name,
                update.status_description !== undefined
                    ? update.status_description
                    : existing.status_description,
                update.active_phalera_id !== undefined
                    ? update.active_phalera_id
                    : existing.active_phalera_id,
            ],
        );
        return result.rows[0];
    },
};

export default User;
