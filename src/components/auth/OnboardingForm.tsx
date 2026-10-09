'use client';

import { useRef, type KeyboardEvent } from 'react';
import { Stamp } from 'lucide-react';
import Plate from '@/components/vitrum/Plate';
import GlassKey, { type GlassKeyHandle, type KeyOutcome } from '@/components/vitrum/GlassKey';
import { CALLSIGN_MAX, STATUS_DESCRIPTION_FIELD_MAX } from '@/contracts/limits';
import CitizenHeader from './CitizenHeader';
import { at, focusField } from './fields';
import './citizen.css';

interface OnboardingFormProps {
  name: string;
  setName: (value: string) => void;
  statusDescription: string;
  setStatusDescription: (value: string) => void;
  civitasId: string;
  onSubmit: () => KeyOutcome | Promise<KeyOutcome>;
  onDone: () => void;
  onSignOut: () => void;
  error: string;
  invalidField: 'name' | 'status' | null;
}

// A first visit: one plate, CITIZEN REGISTRATION. COMPLETE SETUP waits with the beam.
export default function OnboardingForm({
  name,
  setName,
  statusDescription,
  setStatusDescription,
  civitasId,
  onSubmit,
  onDone,
  onSignOut,
  error,
  invalidField,
}: OnboardingFormProps) {
  const key = useRef<GlassKeyHandle>(null);

  const submitOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    key.current?.trigger();
  };

  return (
    <>
      <CitizenHeader onSignOut={onSignOut} />
      <Plate title="Citizen registration">
        <p className="vt-note vt-rise" style={at(320)}>
          Establish your citizen profile in the Juvantia ecosystem.
        </p>
        <div className="vt-civitas vt-rise" style={at(380)}>
          <span className="vt-label">Civitas ID</span>
          <p className="vt-civitas-id">{civitasId}</p>
        </div>
        <span className="vt-rule" aria-hidden="true" />
        <div className="vt-field-block vt-rise" style={at(440)}>
          <label className="vt-label" htmlFor="vt-reg-name">
            Callsign <span className="vt-mark">*</span>
          </label>
          <div className={invalidField === 'name' ? 'vt-field is-invalid' : 'vt-field'} onPointerDown={focusField}>
            <input
              className="vt-field-input"
              id="vt-reg-name"
              maxLength={CALLSIGN_MAX}
              autoComplete="nickname"
              spellCheck={false}
              placeholder={`Your callsign (1-${CALLSIGN_MAX} characters)`}
              value={name}
              onChange={event => setName(event.target.value)}
              onKeyDown={submitOnEnter}
            />
          </div>
        </div>
        <div className="vt-field-block vt-rise" style={at(500)}>
          <div className="vt-label-row">
            <label className="vt-label" htmlFor="vt-reg-status">
              Status description <span className="vt-mark">*</span>
            </label>
            <span className={statusDescription.length >= 240 ? 'vt-counter is-near' : 'vt-counter'}>
              {statusDescription.length}/{STATUS_DESCRIPTION_FIELD_MAX}
            </span>
          </div>
          <div className={invalidField === 'status' ? 'vt-field vt-field--area is-invalid' : 'vt-field vt-field--area'} onPointerDown={focusField}>
            <textarea
              className="vt-field-input"
              id="vt-reg-status"
              maxLength={STATUS_DESCRIPTION_FIELD_MAX}
              rows={4}
              placeholder="Tell us about your status, goals, or bio..."
              value={statusDescription}
              onChange={event => setStatusDescription(event.target.value)}
            />
          </div>
        </div>
        {error ? (
          <p className="vt-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="vt-key-slot">
          <GlassKey handle={key} icon={<Stamp strokeWidth={1.6} aria-hidden />} title="Complete setup" action={onSubmit} onDone={onDone} />
        </div>
      </Plate>
    </>
  );
}
