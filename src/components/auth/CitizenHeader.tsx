'use client';

import { LogOut } from 'lucide-react';
import FlatKey from '@/components/vitrum/FlatKey';

interface CitizenHeaderProps {
  onSignOut?: () => void;
}

// The JUVANTIA wordmark exactly as on the Deck and in Citizen (Cinzel 22, 0.12em, never re-tracked), and SIGN OUT
// once a citizen is in. The land lies flat under the wordmark (data-plain).
export default function CitizenHeader({ onSignOut }: CitizenHeaderProps) {
  return (
    <header className="vt-head">
      <h1 className="vt-brand" data-plain>
        JUVANTIA
      </h1>
      {onSignOut ? <FlatKey exit label="Sign out" icon={<LogOut strokeWidth={1.8} aria-hidden />} onClick={onSignOut} /> : null}
    </header>
  );
}
