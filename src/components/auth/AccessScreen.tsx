'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Plate, { type PlateHandle } from '@/components/vitrum/Plate';
import CitizenHeader from './CitizenHeader';
import './citizen.css';

interface AccessScreenProps {
  // False while the session is being issued (AUTHENTICATING), true once a client that asked is granted access.
  granted: boolean;
}

// The beam runs once the plate's rim has drawn in.
const BEAM_AFTER = 1300;

type Word = 'waiting' | 'leaving' | 'granted';

// One plate in the middle of the screen, the same for every client. While SuperTokens' session is issued, ACCESS
// waits with a key's white beam on its rim. Granted in place, the beam closes its circle, the rim flashes green
// and the word becomes GRANTED. Arriving granted (after registration), the plate rises and flashes once.
export default function AccessScreen({ granted }: AccessScreenProps) {
  const plate = useRef<PlateHandle>(null);
  const mountedAt = useRef(0);
  const [arrivedGranted] = useState(granted);
  const [word, setWord] = useState<Word>(granted ? 'granted' : 'waiting');

  useEffect(() => {
    mountedAt.current = performance.now();
  }, []);

  useEffect(() => {
    if (arrivedGranted) return;
    const timers: number[] = [];
    if (!granted) {
      timers.push(window.setTimeout(() => plate.current?.wait(), BEAM_AFTER));
    } else {
      const grant = () =>
        plate.current?.grant(() => {
          setWord('leaving');
          timers.push(window.setTimeout(() => setWord('granted'), 170));
        });
      timers.push(window.setTimeout(grant, Math.max(0, BEAM_AFTER - (performance.now() - mountedAt.current))));
    }
    return () => timers.forEach(timer => window.clearTimeout(timer));
  }, [granted, arrivedGranted]);

  const wordClass =
    word === 'waiting'
      ? 'vt-status-word is-waiting vt-rise'
      : word === 'leaving'
        ? 'vt-status-word is-waiting is-out'
        : arrivedGranted
          ? 'vt-status-word vt-rise'
          : 'vt-status-word is-in';

  return (
    <>
      <CitizenHeader />
      <div className="vt-moment-land" />
      <Plate title="Access" delay={160} enterFlash={arrivedGranted} canWait={!arrivedGranted} handle={plate}>
        <p className={wordClass} style={{ '--at': '320ms' } as CSSProperties} role="status">
          {word === 'granted' ? 'Granted' : 'Authenticating'}
        </p>
      </Plate>
      <div className="vt-moment-land vt-moment-land--after" />
      <p className="vt-foot">Juvantia Auth</p>
    </>
  );
}
