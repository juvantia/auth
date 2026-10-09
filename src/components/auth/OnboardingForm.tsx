'use client';

import React from 'react';

interface OnboardingFormProps {
  name: string;
  setName: (name: string) => void;
  statusDescription: string;
  setStatusDescription: (desc: string) => void;
  civitasId?: string;
  handleOnboardingSubmit: (e?: React.FormEvent) => void;
  isSubmitting: boolean;
  error: string;
}

export default function OnboardingForm({
  name,
  setName,
  statusDescription,
  setStatusDescription,
  civitasId,
  handleOnboardingSubmit,
  isSubmitting,
  error,
}: OnboardingFormProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="neon-card flex flex-col items-center gap-2 py-6 text-center">
        <p className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-primary">
          Citizen Registration
        </p>
        <p className="font-inter text-[12px] text-text-secondary/60 max-w-xs">
          Establish your citizen profile in the Juvantia ecosystem.
        </p>
        {civitasId && (
          <div className="flex items-center gap-2 px-3 py-1 bg-surface-container/60 border border-border/15 rounded-sm mt-1">
            <span className="font-grotesk text-[10px] uppercase tracking-wider text-text-secondary/60">
              Civitas ID:
            </span>
            <span className="font-mono text-[11px] text-secondary select-all">
              {civitasId}
            </span>
          </div>
        )}
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

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="neon-label mb-0">Status Description <span className="text-error">*</span></label>
            <span className="font-grotesk text-[9px] text-text-secondary/40">
              {statusDescription.length}/250
            </span>
          </div>
          <textarea
            required
            maxLength={250}
            rows={3}
            value={statusDescription}
            onChange={(e) => setStatusDescription(e.target.value)}
            className="w-full bg-surface-lowest/90 border border-secondary/40 focus:border-secondary focus:ring-1 focus:ring-secondary/30 rounded-sm p-3 text-text-primary font-inter text-[12px] font-normal normal-case tracking-normal leading-relaxed placeholder:text-text-secondary/30 outline-none transition-all resize-y min-h-[75px]"
            placeholder="Tell us about your status, goals, or bio..."
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
