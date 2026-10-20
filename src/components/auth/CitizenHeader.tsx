'use client';

import Image from 'next/image';
import { LogOut } from 'lucide-react';
import FlatKey from '@/components/vitrum/FlatKey';

interface CitizenHeaderProps {
  onSignOut?: () => void;
}

// The JUVANTIA AUTH wordmark, one SVG drawn from Cinzel 400 like every Juvantia wordmark (style/brand/juvantia-wordmark),
// at the old type's 22 px, and SIGN OUT once a citizen is in. The land lies flat under the wordmark (data-plain).
export default function CitizenHeader({ onSignOut }: CitizenHeaderProps) {
  return (
    <header className="vt-head">
      <h1 className="vt-brand" data-plain>
        <Image src="/juvantia-auth.svg" alt="Juvantia Auth" width={209} height={22} priority unoptimized />
      </h1>
      {onSignOut ? <FlatKey exit label="Sign out" icon={<LogOut strokeWidth={1.8} aria-hidden />} onClick={onSignOut} /> : null}
    </header>
  );
}
