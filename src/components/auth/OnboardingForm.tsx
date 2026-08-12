'use client';

import React from 'react';

interface OnboardingFormProps {
  name: string;
  setName: (name: string) => void;
  username: string;
  setUsername: (username: string) => void;
  avatarUrl: string;
  setAvatarUrl: (avatarUrl: string) => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleOnboardingSubmit: (e?: React.FormEvent) => void;
  isSubmitting: boolean;
  error: string;
}

export default function OnboardingForm({
  name,
  setName,
  username,
  setUsername,
  avatarUrl,
  setAvatarUrl,
  handleImageUpload,
  handleOnboardingSubmit,
  isSubmitting,
  error,
}: OnboardingFormProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="neon-card flex flex-col items-center gap-3 py-8">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-3xl font-bold text-surface-low border-4 border-surface-high overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" onError={() => setAvatarUrl('')} />
            ) : (
              <span style={{ fontFamily: 'var(--font-cinzel)' }}>{name ? name.charAt(0).toUpperCase() : '?'}</span>
            )}
          </div>
          <label className="absolute -bottom-1 -right-1 w-8 h-8 bg-surface-high border border-border/30 rounded-full flex items-center justify-center cursor-pointer hover:border-primary/40 transition-all group shadow-lg">
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            +
          </label>
        </div>
      </div>

      <form onSubmit={handleOnboardingSubmit} className="neon-card flex flex-col gap-4">
        <div>
          <label className="neon-label">Full Name <span className="text-error">*</span></label>
          <input
            type="text" required maxLength={32} value={name}
            onChange={(e) => setName(e.target.value)}
            className="neon-input"
            placeholder="YOUR NAME"
          />
        </div>

        <div>
          <label className="neon-label">Username <span className="text-error">*</span></label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary/60 font-grotesk font-bold text-sm">@</span>
            <input
              type="text" required maxLength={16} value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
              className="neon-input pl-9"
              style={{ textTransform: 'lowercase' }}
              placeholder="username"
            />
          </div>
        </div>

        {error && (
          <div className="border border-error/30 bg-error/5 px-4 py-3 rounded-sm font-inter text-[12px] text-error">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="neon-btn-primary w-full py-4 rounded-sm text-[12px] mt-2"
        >
          {isSubmitting ? 'Processing...' : 'Complete Setup'}
        </button>
      </form>
    </div>
  );
}
