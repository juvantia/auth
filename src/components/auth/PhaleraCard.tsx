'use client';

import React, { useState } from 'react';
import type { PhaleraSlot } from '@/contracts/phalera';
import PhaleraCanvas from './PhaleraCanvas';

interface PhaleraCardProps {
  slots: Array<PhaleraSlot | null>;
  activePhaleraId?: string | null;
  onSelectPhalera: (phaleraId: string | null) => Promise<void>;
  isLoading?: boolean;
}

export default function PhaleraCard({
  slots,
  activePhaleraId,
  onSelectPhalera,
  isLoading = false,
}: PhaleraCardProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Guarantee 10 slots
  const fullSlots: Array<PhaleraSlot | null> = Array.from({ length: 10 }, (_, i) => slots[i] ?? null);

  const activeSlot = fullSlots.find((s) => s && s.id === activePhaleraId) ?? null;

  const handleSlotClick = async (slot: PhaleraSlot | null) => {
    if (!slot || pendingId !== null) return;
    setError(null);

    const isCurrentlyActive = slot.id === activePhaleraId;
    const targetId = isCurrentlyActive ? null : slot.id;

    setPendingId(slot.id);
    try {
      await onSelectPhalera(targetId);
    } catch (err) {
      console.error('Failed to change active phalera', err);
      setError('Could not update active phalera. Please try again.');
    } finally {
      setPendingId(null);
    }
  };

  const handleUnequip = async () => {
    if (pendingId !== null) return;
    setError(null);
    setPendingId('unequip');
    try {
      await onSelectPhalera(null);
    } catch (err) {
      console.error('Failed to unequip active phalera', err);
      setError('Could not unequip phalera.');
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="neon-card flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-primary/60 rounded-full" />
          <h3 className="font-cinzel text-[11px] uppercase tracking-widest text-text-secondary/70">
            Phalera
          </h3>
        </div>
        <span className="font-grotesk text-[9px] uppercase tracking-widest text-text-secondary/40">
          10 Memory Slots
        </span>
      </div>

      {error && (
        <div className="bg-error/10 border border-error/30 text-error text-[11px] font-grotesk px-3 py-1.5 rounded-sm">
          {error}
        </div>
      )}

      {/* Horizontal scrolling slots row */}
      <div className="flex gap-2.5 overflow-x-auto pb-2 pt-1 -mx-2 px-2 select-none scrollbar-thin">
        {isLoading ? (
          <div className="w-full flex items-center justify-center py-6 text-text-secondary/40 font-grotesk text-xs uppercase tracking-wider animate-pulse">
            Loading memory slots...
          </div>
        ) : (
          fullSlots.map((slot, index) => {
            const slotNum = String(index + 1).padStart(2, '0');
            const isEquipped = Boolean(slot && slot.id === activePhaleraId);
            const isPending = Boolean(slot && (pendingId === slot.id || (pendingId === 'unequip' && isEquipped)));

            if (!slot) {
              return (
                <div
                  key={`empty-slot-${index}`}
                  className="w-[78px] flex-shrink-0 flex flex-col items-center justify-between p-2 rounded-sm border border-dashed border-border/20 bg-surface-lowest/30 opacity-50 cursor-default select-none transition-all"
                >
                  <span className="font-grotesk text-[9px] font-bold uppercase tracking-wider text-text-secondary/30">
                    {slotNum}
                  </span>
                  <div className="w-13 h-13 my-1 rounded-xs border border-dashed border-border/15 flex items-center justify-center bg-surface-lowest/20">
                    <span className="text-text-secondary/20 font-mono text-[9px]">—</span>
                  </div>
                  <span className="font-grotesk text-[8px] font-bold uppercase tracking-wider text-text-secondary/25">
                    Empty
                  </span>
                </div>
              );
            }

            return (
              <button
                key={slot.id || `slot-${index}`}
                type="button"
                onClick={() => handleSlotClick(slot)}
                disabled={pendingId !== null}
                title={isEquipped ? 'Click to unequip' : `Click to equip ${slot.name}`}
                className={`group w-[78px] flex-shrink-0 flex flex-col items-center justify-between p-2 rounded-sm border transition-all duration-200 outline-none text-left ${
                  isEquipped
                    ? 'border-primary bg-primary/5 shadow-[0_0_14px_rgba(0,255,136,0.3)] ring-1 ring-primary/40'
                    : 'border-border/25 bg-surface-lowest/60 hover:bg-surface-low hover:border-secondary/60 cursor-pointer'
                } ${isPending ? 'opacity-60 pointer-events-none' : ''}`}
              >
                <div className="w-full flex items-center justify-between">
                  <span
                    className={`font-grotesk text-[9px] font-bold uppercase tracking-wider ${
                      isEquipped ? 'text-primary' : 'text-text-secondary/50 group-hover:text-secondary'
                    }`}
                  >
                    {slotNum}
                  </span>
                  {isEquipped && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_rgba(0,255,136,0.9)]" />
                  )}
                </div>

                <div
                  className={`w-13 h-13 my-1 rounded-xs overflow-hidden border p-0.5 transition-all ${
                    isEquipped
                      ? 'border-primary/80 bg-surface-lowest'
                      : 'border-border/25 group-hover:border-secondary/50 bg-surface-lowest'
                  }`}
                >
                  <PhaleraCanvas pixels={slot.pixels} palette={slot.palette} />
                </div>

                <p
                  className="w-full truncate text-center font-cinzel text-[9px] uppercase tracking-wider text-text-primary mb-1"
                  title={slot.name}
                >
                  {slot.name}
                </p>

                <div className="w-full flex justify-center">
                  {isEquipped ? (
                    <span className="text-[8px] font-grotesk font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/30 px-1.5 py-0.5 rounded-xs">
                      Equipped
                    </span>
                  ) : (
                    <span className="text-[8px] font-grotesk font-bold uppercase tracking-wider text-text-secondary/40 group-hover:text-secondary border border-border/20 group-hover:border-secondary/40 px-1.5 py-0.5 rounded-xs transition-colors">
                      Equip
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Active seal indicator footer */}
      <div className="flex items-center justify-between bg-surface-container/60 border border-border/15 px-3 py-2 rounded-sm">
        {activeSlot ? (
          <>
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(0,255,136,0.8)] flex-shrink-0" />
              <div className="flex items-center gap-1.5 truncate">
                <span className="font-grotesk text-[10px] uppercase tracking-wider text-text-secondary/60">
                  Active Seal:
                </span>
                <span className="font-cinzel text-[11px] uppercase tracking-wider text-primary font-bold truncate">
                  {activeSlot.name}
                </span>
                <span className="font-grotesk text-[9px] text-text-secondary/40">
                  (Slot {String(activeSlot.slotIndex + 1).padStart(2, '0')})
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleUnequip}
              disabled={pendingId !== null}
              className="font-grotesk text-[9px] uppercase tracking-wider text-error/70 hover:text-error border border-error/30 hover:border-error/60 px-2 py-0.5 rounded-sm transition-all ml-2 flex-shrink-0"
            >
              Unequip
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-text-secondary/30" />
            <span className="font-grotesk text-[10px] uppercase tracking-wider text-text-secondary/50">
              No active seal equipped. Select an insignia slot above to equip.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
