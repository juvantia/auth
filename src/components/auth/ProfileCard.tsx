'use client';

import React, { useState } from 'react';

export interface UserProfile {
  _id?: string;
  supertokens_id?: string;
  name: string;
  username: string;
  email?: string;
  avatar_url?: string;
  smart_wallet_address?: string;
  status_description?: string;
}

interface ProfileCardProps {
  profile: UserProfile;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUpdateName: (newName: string) => Promise<void>;
}

export default function ProfileCard({
  profile,
  handleImageUpload,
  onUpdateName,
}: ProfileCardProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');

  const handleSaveName = async () => {
    if (!newName.trim()) return;
    await onUpdateName(newName);
    setIsEditingName(false);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="neon-card flex flex-col items-center gap-4 py-8 relative overflow-visible">
        <p className="absolute top-4 left-4 font-grotesk text-[9px] uppercase tracking-[0.2em] text-text-secondary/25">
          Profile
        </p>
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-3xl font-bold text-surface-low border-4 border-surface-high overflow-hidden shadow-[0_0_30px_rgba(0,255,136,0.15)]">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span style={{ fontFamily: 'var(--font-cinzel)' }}>{profile.name?.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <label className="absolute -bottom-1 -right-1 w-8 h-8 bg-surface-high border border-border/30 rounded-full flex items-center justify-center cursor-pointer hover:border-primary/40 transition-all group shadow-lg">
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            +
          </label>
        </div>

        <div className="flex flex-col items-center gap-1">
          {isEditingName ? (
            <div className="flex items-center gap-1.5 mt-1">
              <input
                type="text"
                maxLength={32}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-40 bg-surface-lowest/90 border border-secondary/40 focus:border-secondary focus:ring-1 focus:ring-secondary/30 rounded-sm py-1 px-2 text-sm text-center text-text-primary font-cinzel font-semibold uppercase tracking-wider outline-none transition-all"
                placeholder="NAME"
              />
              <button
                onClick={handleSaveName}
                className="px-2.5 py-1 border border-primary/50 hover:border-primary bg-primary/10 hover:bg-primary/20 text-primary text-[9px] font-grotesk font-bold uppercase tracking-wider transition-all rounded-sm"
              >
                Save
              </button>
              <button
                onClick={() => setIsEditingName(false)}
                className="px-2.5 py-1 border border-error/50 hover:border-error bg-error/10 hover:bg-error/20 text-error text-[9px] font-grotesk font-bold uppercase tracking-wider transition-all rounded-sm"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold uppercase tracking-widest text-[#E6F0EB]" style={{ fontFamily: 'var(--font-cinzel)' }}>
                {profile.name}
              </h2>
              <button
                onClick={() => {
                  setNewName(profile.name || '');
                  setIsEditingName(true);
                }}
                className="text-[9px] text-secondary/70 hover:text-secondary font-grotesk font-bold uppercase tracking-widest border border-secondary/30 hover:border-secondary/60 bg-secondary/5 px-2.5 py-1 rounded-sm transition-all"
              >
                Edit
              </button>
            </div>
          )}
          <p className="font-grotesk text-[13px] font-medium tracking-wider text-secondary">
            @{profile.username}
          </p>
        </div>
      </div>

      <div className="neon-card flex flex-col gap-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1 h-4 bg-secondary/60 rounded-full" />
          <h3 className="font-cinzel text-[11px] uppercase tracking-widest text-text-secondary/70">
            Sign-In Method
          </h3>
        </div>
        <div className="flex items-center justify-between bg-surface-container border border-border/10 px-4 py-3 rounded-sm">
          <div>
            <p className="font-grotesk text-[9px] uppercase tracking-widest text-text-secondary/40 mb-0.5">Email</p>
            <p className="font-inter text-[13px] text-text-primary">{profile.email}</p>
          </div>
          <button
            disabled
            className="font-grotesk text-[8px] uppercase tracking-widest text-text-secondary/40 border border-border/20 bg-surface-lowest/50 px-2.5 py-1 rounded-sm opacity-60 cursor-not-allowed select-none"
          >
            Change
          </button>
        </div>
      </div>
    </div>
  );
}
