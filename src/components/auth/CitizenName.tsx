'use client';

import type { PhaleraSlot } from '@/contracts/phalera';
import PhaleraCanvas from './PhaleraCanvas';
import './citizen.css';

interface CitizenNameProps {
  name: string;
  phalera?: PhaleraSlot | null;
}

// The callsign as written, on one line that loses its end to the room it has, and the phalera after it at the size
// of an emoji, whatever size the name is set in.
export default function CitizenName({ name, phalera }: CitizenNameProps) {
  return (
    <h3 className="vt-name">
      <span className="vt-name-text">{name}</span>
      {phalera ? <PhaleraCanvas className="vt-phalera" pixels={phalera.pixels} palette={phalera.palette} /> : null}
    </h3>
  );
}
