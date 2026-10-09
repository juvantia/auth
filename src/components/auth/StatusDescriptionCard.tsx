'use client';

import { useState } from 'react';
import { Check, Pencil, X } from 'lucide-react';
import Plate from '@/components/vitrum/Plate';
import FlatKey from '@/components/vitrum/FlatKey';
import GlassKey, { type KeyOutcome } from '@/components/vitrum/GlassKey';
import { STATUS_DESCRIPTION_FIELD_MAX } from '@/contracts/limits';
import type { UserProfile } from './ProfileCard';
import { at, focusField } from './fields';
import './citizen.css';

function renderFormattedText(text: string) {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  const parts = text.split(urlRegex);
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      const href = part.toLowerCase().startsWith('www.') ? `https://${part}` : part;
      return (
        <a key={index} href={href} target="_blank" rel="noopener noreferrer" onClick={event => event.stopPropagation()}>
          {part}
        </a>
      );
    }
    return part;
  });
}

interface StatusDescriptionCardProps {
  profile: UserProfile;
  editing: boolean;
  // Another plate is being edited, so this one waits.
  locked: boolean;
  onEdit: () => void;
  onClose: () => void;
  onUpdateDesc: (newDesc: string) => Promise<KeyOutcome>;
}

const ICON = { strokeWidth: 1.8, 'aria-hidden': true } as const;

// STATUS DESCRIPTION: the citizen's own words, links lit in cyan. EDIT opens the recess and SAVE.
export default function StatusDescriptionCard({ profile, editing, locked, onEdit, onClose, onUpdateDesc }: StatusDescriptionCardProps) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const startEditing = () => {
    setDraft(profile.status_description || '');
    setError(null);
    onEdit();
  };

  const save = () => {
    setError(null);
    return onUpdateDesc(draft).then(outcome => {
      if (outcome !== 'done') setError('Could not save the status description. Please try again.');
      return outcome;
    });
  };

  const meta = editing ? (
    <FlatKey label="Cancel" icon={<X {...ICON} />} onClick={onClose} />
  ) : (
    <FlatKey label="Edit" icon={<Pencil {...ICON} />} disabled={locked} onClick={startEditing} />
  );

  return (
    <Plate title="Status description" delay={240} meta={meta} bodyKey={editing ? 'edit' : 'view'}>
      {editing ? (
        <>
          <div className="vt-field vt-field--area" onPointerDown={focusField}>
            <textarea
              className="vt-field-input"
              maxLength={STATUS_DESCRIPTION_FIELD_MAX}
              rows={5}
              placeholder="Tell us about your status, goals or links..."
              aria-label="Status description"
              value={draft}
              autoFocus
              onChange={event => setDraft(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Escape') onClose();
              }}
            />
          </div>
          <div className="vt-label-row">
            <span className="vt-note vt-note--quiet">Supports links, emojis &amp; multiline text</span>
            <span className={draft.length >= 240 ? 'vt-counter is-near' : 'vt-counter'}>
              {draft.length}/{STATUS_DESCRIPTION_FIELD_MAX}
            </span>
          </div>
          {error ? (
            <p className="vt-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="vt-key-slot">
            <GlassKey icon={<Check strokeWidth={1.6} aria-hidden />} title="Save" action={save} onDone={onClose} />
          </div>
        </>
      ) : profile.status_description ? (
        <p className="vt-status-text vt-rise" style={at(320)}>
          {renderFormattedText(profile.status_description)}
        </p>
      ) : (
        <p className="vt-status-text is-empty vt-rise" style={at(320)}>
          No status description provided.
        </p>
      )}
    </Plate>
  );
}
