'use client';

import React, { useState } from 'react';
import { UserProfile } from './ProfileCard';

function renderFormattedText(text: string) {
  if (!text) return null;

  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      const href = part.toLowerCase().startsWith('www.') ? `https://${part}` : part;
      return (
        <a
          key={index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-secondary underline hover:text-primary transition-colors font-medium break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

interface StatusDescriptionCardProps {
  profile: UserProfile;
  onUpdateDesc: (newDesc: string) => Promise<void>;
}

export default function StatusDescriptionCard({
  profile,
  onUpdateDesc,
}: StatusDescriptionCardProps) {
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [newDesc, setNewDesc] = useState('');

  const handleSaveDesc = async () => {
    await onUpdateDesc(newDesc);
    setIsEditingDesc(false);
  };

  return (
    <div className="neon-card flex flex-col gap-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-secondary/60 rounded-full" />
          <h3 className="font-cinzel text-[11px] uppercase tracking-widest text-text-secondary/70">
            Status Description
          </h3>
        </div>
        {isEditingDesc ? (
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleSaveDesc}
              className="px-2.5 py-1 border border-primary/50 hover:border-primary bg-primary/10 hover:bg-primary/20 text-primary text-[9px] font-grotesk font-bold uppercase tracking-wider transition-all rounded-sm"
            >
              Save
            </button>
            <button
              onClick={() => setIsEditingDesc(false)}
              className="px-2.5 py-1 border border-error/50 hover:border-error bg-error/10 hover:bg-error/20 text-error text-[9px] font-grotesk font-bold uppercase tracking-wider transition-all rounded-sm"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setNewDesc(profile.status_description || '');
              setIsEditingDesc(true);
            }}
            className="text-[9px] text-secondary/70 hover:text-secondary font-grotesk font-bold uppercase tracking-widest border border-secondary/30 hover:border-secondary/60 bg-secondary/5 px-2.5 py-1 rounded-sm transition-all"
          >
            Edit
          </button>
        )}
      </div>

      {isEditingDesc ? (
        <div className="flex flex-col gap-1.5">
          <textarea
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            maxLength={250}
            rows={4}
            className="w-full bg-surface-lowest/90 border border-secondary/40 focus:border-secondary focus:ring-1 focus:ring-secondary/30 rounded-sm p-3 text-text-primary font-inter text-[12px] font-normal normal-case tracking-normal leading-relaxed placeholder:text-text-secondary/30 outline-none transition-all resize-y min-h-[85px]"
            placeholder="Tell us about your status, goals or links..."
          />
          <div className="flex items-center justify-between px-0.5">
            <span className="font-grotesk text-[9px] uppercase tracking-wider text-text-secondary/40">
              Supports links, emojis & multiline text
            </span>
            <span className={`font-grotesk text-[9px] tracking-wider ${newDesc.length >= 240 ? 'text-error font-bold' : 'text-text-secondary/40'}`}>
              {newDesc.length}/250
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-surface-container/70 border border-border/15 px-4 py-3 rounded-sm min-h-[46px] flex items-center">
          {profile.status_description ? (
            <p className="font-inter text-[12px] text-text-primary leading-relaxed whitespace-pre-wrap break-words w-full">
              {renderFormattedText(profile.status_description)}
            </p>
          ) : (
            <p className="font-inter text-[12px] text-text-secondary/40 italic leading-relaxed">
              No status description provided.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
