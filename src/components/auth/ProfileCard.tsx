'use client';

import { useRef, useState, type KeyboardEvent } from 'react';
import { Check, Copy, Pencil, X } from 'lucide-react';
import Plate from '@/components/vitrum/Plate';
import FlatKey from '@/components/vitrum/FlatKey';
import GlassKey, { type GlassKeyHandle, type KeyOutcome } from '@/components/vitrum/GlassKey';
import { CALLSIGN_MAX } from '@/contracts/limits';
import type { PhaleraSlot } from '@/contracts/phalera';
import CitizenName from './CitizenName';
import { at, focusField } from './fields';
import './citizen.css';

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
  editing: boolean;
  // Another plate is being edited, so this one waits.
  locked: boolean;
  onEdit: () => void;
  onClose: () => void;
  onUpdateName: (newName: string) => Promise<KeyOutcome>;
}

const ICON = { strokeWidth: 1.8, 'aria-hidden': true } as const;

// CITIZEN PROFILE: the callsign with its phalera, and the Civitas ID. EDIT turns the name into a field and SAVE.
export default function ProfileCard({ profile, civitasId: propCivitasId, activePhalera, editing, locked, onEdit, onClose, onUpdateName }: ProfileCardProps) {
  const [draft, setDraft] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const key = useRef<GlassKeyHandle>(null);
  const civitasId = profile.supertokens_id || profile._id || propCivitasId || '';

  const startEditing = () => {
    setDraft(profile.name || '');
    setInvalid(false);
    setError(null);
    onEdit();
  };

  const save = (): KeyOutcome | Promise<KeyOutcome> => {
    const name = draft.trim();
    if (!name) {
      setInvalid(true);
      return 'invalid';
    }
    setInvalid(false);
    setError(null);
    return onUpdateName(name).then(outcome => {
      if (outcome !== 'done') setError('Could not save the callsign. Please try again.');
      return outcome;
    });
  };

  const onFieldKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      key.current?.trigger();
    }
    if (event.key === 'Escape') onClose();
  };

  const copyCivitasId = async () => {
    if (!civitasId) return;
    try {
      await navigator.clipboard.writeText(civitasId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // The clipboard refused; the ID stays selectable.
    }
  };

  const meta = editing ? (
    <FlatKey label="Cancel" icon={<X {...ICON} />} onClick={onClose} />
  ) : (
    <FlatKey label="Edit" icon={<Pencil {...ICON} />} disabled={locked} onClick={startEditing} />
  );

  const civitas = civitasId ? (
    <div className="vt-civitas vt-rise" style={at(400)}>
      <div className="vt-label-row">
        <span className="vt-label">Civitas ID</span>
        <FlatKey
          label={copied ? 'Copied' : 'Copy'}
          icon={copied ? <Check {...ICON} /> : <Copy {...ICON} />}
          confirmed={copied}
          ariaLabel="Copy Civitas ID"
          onClick={copyCivitasId}
        />
      </div>
      <p className="vt-civitas-id">{civitasId}</p>
    </div>
  ) : null;

  return (
    <Plate title="Citizen profile" meta={meta} bodyKey={editing ? 'edit' : 'view'}>
      {editing ? (
        <>
          <div className={invalid ? 'vt-field is-invalid' : 'vt-field'} onPointerDown={focusField}>
            <input
              className="vt-field-input"
              maxLength={CALLSIGN_MAX}
              spellCheck={false}
              placeholder={`Callsign (max ${CALLSIGN_MAX})`}
              aria-label="Callsign"
              value={draft}
              autoFocus
              onChange={event => setDraft(event.target.value)}
              onKeyDown={onFieldKey}
            />
          </div>
          {error ? (
            <p className="vt-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="vt-key-slot">
            <GlassKey handle={key} icon={<Check strokeWidth={1.6} aria-hidden />} title="Save" action={save} onDone={onClose} />
          </div>
          {civitas}
        </>
      ) : (
        <>
          <div className="vt-rise" style={at(320)}>
            <CitizenName name={profile.name} phalera={activePhalera} />
          </div>
          {civitas}
        </>
      )}
    </Plate>
  );
}
