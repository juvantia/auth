import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  supertokens_id: string;
  email: string;
  name: string;
  username: string;
  avatar_url?: string;
  smart_wallet_address?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    supertokens_id: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true, maxlength: 32 },
    username: { 
      type: String, 
      required: true, 
      unique: true, 
      maxlength: 16,
      match: /^[a-zA-Z0-9_-]+$/ 
    },
    avatar_url: { type: String },
    smart_wallet_address: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

// Индекс для быстрого поиска по username
UserSchema.index({ username: 1 });

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
