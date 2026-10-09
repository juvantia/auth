'use client';

import React from 'react';

interface OnboardingFormProps {
  name: string;
  setName: (name: string) => void;
  handleOnboardingSubmit: (e?: React.FormEvent) => void;
  isSubmitting: boolean;
  error: string;
}

export default function OnboardingForm({
  name,
  setName,
  handleOnboardingSubmit,
  isSubmitting,
  error,
}: OnboardingFormProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="neon-card flex flex-col items-center gap-3 py-8">
        <div className="w-20 h-20 rounded-full bg-surface-container border border-primary/30 flex items-center justify-center text-3xl font-bold text-primary shadow-[0_0_20px_rgba(0,255,136,0.1)]">
          <span style={{ fontFamily: 'var(--font-cinzel)' }}>{name ? name.charAt(0).toUpperCase() : '?'}</span>
        </div>
        <p className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-text-secondary/60">
          Citizen Registration
        </p>
      </div>

      <form onSubmit={handleOnboardingSubmit} className="neon-card flex flex-col gap-4">
        <div>
          <label className="neon-label">Citizen Name <span className="text-error">*</span></label>
          <input
            type="text"
            required
            maxLength={16}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="neon-input"
            placeholder="YOUR NAME (1-16 CHARACTERS)"
          />
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
