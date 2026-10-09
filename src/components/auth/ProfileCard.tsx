'use client';

import React, { useState } from 'react';
import type { PhaleraSlot } from '@/contracts/phalera';
import PhaleraCanvas from './PhaleraCanvas';

export interface UserProfile {
  _id?: string;
  supertokens_id?: string;
  name: string;
  email?: string;
  smart_wallet_address?: string;
  status_description?: string;
  active_phalera_id?: string | null;
}

interface ProfileCardProps {
  profile: UserProfile;
  civitasId?: string;
  activePhalera?: PhaleraSlot | null;
  onUpdateName: (newName: string) => Promise<void>;
}

export default function ProfileCard({
  profile,
  civitasId: propCivitasId,
  activePhalera,
  onUpdateName,
}: ProfileCardProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSaveName = async () => {
    if (!newName.trim()) return;
    await onUpdateName(newName.trim());
    setIsEditingName(false);
  };

  const civitasId = profile.supertokens_id || profile._id || propCivitasId || '';

  const handleCopyCivitasId = async () => {
    if (!civitasId) return;
    try {
      await navigator.clipboard.writeText(civitasId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="neon-card flex flex-col items-center gap-4 py-8 relative overflow-visible text-center">
      <p className="font-grotesk text-[9px] uppercase tracking-[0.2em] text-text-secondary/30">
        Citizen Profile
      </p>

      {/* Authoritative Phalera Seal (strictly square, never a circle) */}
      {activePhalera && (
        <div className="w-14 h-14 bg-surface-lowest border border-primary/50 shadow-[0_0_16px_rgba(0,255,136,0.25)] rounded-sm overflow-hidden p-0.5 transition-all">
          <PhaleraCanvas pixels={activePhalera.pixels} palette={activePhalera.palette} />
        </div>
      )}

      <div className="flex flex-col items-center gap-2 w-full">
        {isEditingName ? (
          <div className="flex items-center justify-center gap-1.5 mt-1">
            <input
              type="text"
              maxLength={16}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-44 bg-surface-lowest/90 border border-secondary/40 focus:border-secondary focus:ring-1 focus:ring-secondary/30 rounded-sm py-1.5 px-3 text-sm text-center text-text-primary font-cinzel font-semibold uppercase tracking-wider outline-none transition-all"
              placeholder="NAME (MAX 16)"
            />
            <button
              onClick={handleSaveName}
              className="px-2.5 py-1.5 border border-primary/50 hover:border-primary bg-primary/10 hover:bg-primary/20 text-primary text-[9px] font-grotesk font-bold uppercase tracking-wider transition-all rounded-sm"
            >
              Save
            </button>
            <button
              onClick={() => setIsEditingName(false)}
              className="px-2.5 py-1.5 border border-error/50 hover:border-error bg-error/10 hover:bg-error/20 text-error text-[9px] font-grotesk font-bold uppercase tracking-wider transition-all rounded-sm"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <h2 className="text-2xl font-semibold uppercase tracking-widest text-[#E6F0EB]" style={{ fontFamily: 'var(--font-cinzel)' }}>
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

        {civitasId && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container/60 border border-border/15 rounded-sm mt-1">
            <span className="font-grotesk text-[10px] uppercase tracking-wider text-text-secondary/60">
              Civitas ID:
            </span>
            <span className="font-mono text-[11px] text-secondary select-all">
              {civitasId}
            </span>
            <button
              type="button"
              onClick={handleCopyCivitasId}
              title="Copy Civitas ID"
              className="font-grotesk text-[9px] uppercase tracking-wider text-text-secondary/50 hover:text-primary transition-colors ml-1"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
