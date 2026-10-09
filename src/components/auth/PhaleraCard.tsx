'use client';

import { useRef, useState } from 'react';
import { X } from 'lucide-react';
import Plate from '@/components/vitrum/Plate';
import FlatKey from '@/components/vitrum/FlatKey';
import GlassKey, { type GlassKeyHandle, type KeyOutcome } from '@/components/vitrum/GlassKey';
import { useSlotRow } from '@/components/vitrum/useSlotRow';
import type { PhaleraSlot } from '@/contracts/phalera';
import PhaleraCanvas from './PhaleraCanvas';
import './citizen.css';

interface PhaleraCardProps {
  slots: Array<PhaleraSlot | null>;
  activePhaleraId?: string | null;
  onSelectPhalera: (phaleraId: string | null) => Promise<void>;
  isLoading?: boolean;
}

const slotNumber = (index: number) => String(index + 1).padStart(2, '0');

// PHALERA: ten memory slots as small glass keys in a row that scrolls sideways. Pressing one equips it (or
// unequips the equipped one); the key waits with the beam, and the equipped slot wears the emblem's ring.
export default function PhaleraCard({ slots, activePhaleraId, onSelectPhalera, isLoading = false }: PhaleraCardProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const keys = useRef(new Map<string, GlassKeyHandle>());
  const unequipping = useRef(false);
  useSlotRow(rowRef, !isLoading);

  // Guarantee 10 slots
  const fullSlots: Array<PhaleraSlot | null> = Array.from({ length: 10 }, (_, i) => slots[i] ?? null);
  const activeSlot = fullSlots.find(slot => slot && slot.id === activePhaleraId) ?? null;

  const select = async (slot: PhaleraSlot): Promise<KeyOutcome> => {
    const message = unequipping.current ? 'Could not unequip phalera.' : 'Could not update active phalera. Please try again.';
    unequipping.current = false;
    setError(null);
    setPendingId(slot.id);
    try {
      await onSelectPhalera(slot.id === activePhaleraId ? null : slot.id);
      return 'done';
    } catch (err) {
      console.error('Failed to change active phalera', err);
      setError(message);
      return 'failed';
    } finally {
      setPendingId(null);
    }
  };

  // UNEQUIP presses the equipped slot itself, so its own rim carries the wait.
  const unequip = () => {
    if (!activeSlot || pendingId !== null) return;
    const key = keys.current.get(activeSlot.id);
    if (!key) return;
    rowRef.current?.querySelector(`[data-slot="${activeSlot.id}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    unequipping.current = true;
    key.trigger();
  };

  return (
    <Plate title="Phalera" delay={120} meta={<span className="vt-plate-label">10 memory slots</span>}>
      {error ? (
        <p className="vt-error" role="alert">
          {error}
        </p>
      ) : null}
      {isLoading ? (
        <p className="vt-slots-wait" role="status">
          Loading memory slots
        </p>
      ) : (
        <div ref={rowRef} className="vt-slots" role="group" aria-label="Memory slots">
          {fullSlots.map((slot, index) => {
            const number = slotNumber(index);
            if (!slot) {
              return (
                <div key={`empty-slot-${index}`} className="vt-slot-cell">
                  <div className="vt-slot-empty" aria-label={`Slot ${number}, empty`}>
                    <span className="vt-slot-num">{number}</span>
                    <span className="vt-slot-art">—</span>
                    <span className="vt-slot-name">—</span>
                    <span className="vt-slot-state">Empty</span>
                  </div>
                </div>
              );
            }
            const equipped = slot.id === activePhaleraId;
            return (
              <div key={slot.id || `slot-${index}`} className="vt-slot-cell" data-slot={slot.id}>
                <GlassKey
                  className="vt-key--slot"
                  pressed={equipped}
                  inert={pendingId !== null && pendingId !== slot.id}
                  label={`${slot.name}, slot ${number}, ${equipped ? 'equipped; press to unequip' : 'press to equip'}`}
                  action={() => select(slot)}
                  handle={handle => {
                    if (handle) keys.current.set(slot.id, handle);
                    else keys.current.delete(slot.id);
                  }}
                >
                  <span className="vt-slot-num">{number}</span>
                  <span className="vt-slot-art">
                    <PhaleraCanvas pixels={slot.pixels} palette={slot.palette} />
                  </span>
                  <span className="vt-slot-name">{slot.name}</span>
                  <span className="vt-slot-state">{equipped ? 'Equipped' : 'Equip'}</span>
                </GlassKey>
              </div>
            );
          })}
        </div>
      )}
      <span className="vt-rule" aria-hidden="true" />
      <div className="vt-seal">
        {activeSlot ? (
          <>
            <div className="vt-seal-copy">
              <span className="vt-label">Active seal</span>
              <span className="vt-seal-line">
                <span className="vt-seal-name">{activeSlot.name}</span>
                <span className="vt-seal-slot">Slot {slotNumber(activeSlot.slotIndex)}</span>
              </span>
            </div>
            <FlatKey label="Unequip" icon={<X strokeWidth={1.8} aria-hidden />} disabled={pendingId !== null} onClick={unequip} />
          </>
        ) : (
          <p className="vt-note">No active seal equipped. Select an insignia slot above to equip.</p>
        )}
      </div>
    </Plate>
  );
}
