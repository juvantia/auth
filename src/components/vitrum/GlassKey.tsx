'use client';

import { useEffect, useImperativeHandle, useRef, type ReactNode, type Ref } from 'react';
import EdgeSvg, { type EdgeLayer } from './EdgeSvg';
import { BEAM_LAYERS, startBeam, type Beam } from './beam';
import { EDGE_BLEED, keyPath, prefersReducedMotion } from './geometry';
import { useElementSize } from './useElementSize';
import './key.css';

// What a key's operation came to: done flashes the rim green, failed and invalid flash it red.
export type KeyOutcome = 'done' | 'failed' | 'invalid';

export interface GlassKeyHandle {
  // Runs the operation as if the key were pressed in its middle, for Enter in a field.
  trigger(): void;
}

// A row that starts to move under a held key releases it without acting.
export interface KeyElement extends HTMLButtonElement {
  vtCancelPress?: () => void;
}

interface GlassKeyProps {
  action: () => KeyOutcome | Promise<KeyOutcome>;
  // Called once the green flash has been seen, for the change the operation brings to the screen.
  onDone?: () => void;
  title?: string;
  icon?: ReactNode;
  children?: ReactNode;
  className?: string;
  label?: string;
  pressed?: boolean;
  disabled?: boolean;
  // Ignores presses without changing its look, while another key of its group waits for an answer.
  inert?: boolean;
  handle?: Ref<GlassKeyHandle>;
}

const GLOW: readonly EdgeLayer[] = [{ width: 3 }];
const EDGE: readonly EdgeLayer[] = [{ width: 0.8 }];
const SPARK: readonly EdgeLayer[] = [{ width: 1.1, color: '#eafff6' }];
const FLARE: readonly EdgeLayer[] = [{ width: 2.2 }, { width: 0.9, color: '#effff9', opacity: 0.7 }];
const ALARM: readonly EdgeLayer[] = [{ width: 2, color: '#ff4757' }];
const DONE_PAUSE = 760;

// Citizen's light glass key. CONTACT under the finger, the white beam while it waits for an answer, then one green
// or red flash; with a mouse it also answers as the Deck's keys do, a glint crossing it (key.css).
export default function GlassKey({ action, onDone, title, icon, children, className, label, pressed, disabled, inert, handle }: GlassKeyProps) {
  const keyRef = useRef<KeyElement>(null);
  const edgeRef = useRef<SVGSVGElement>(null);
  const beamRef = useRef<SVGSVGElement>(null);
  const actionRef = useRef(action);
  const onDoneRef = useRef(onDone);
  const triggerRef = useRef<() => void>(() => undefined);
  const size = useElementSize(keyRef);

  useEffect(() => {
    actionRef.current = action;
    onDoneRef.current = onDone;
  });

  useImperativeHandle(handle, () => ({ trigger: () => triggerRef.current() }), []);

  useEffect(() => {
    const key = keyRef.current;
    if (!key) return;
    const timers = new Set<number>();
    let alive = true;
    let pointer: number | null = null;
    let settleTimer = 0;
    let touch = { x: key.offsetWidth / 2, y: 0 };
    let beam: Beam | null = null;

    const later = (ms: number, fn: () => void) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
    };
    const blocked = () => key.getAttribute('aria-disabled') === 'true' || key.dataset.inert === 'true' || key.classList.contains('is-busy');

    // The escaping light takes the colour of the rim nearest to it: green toward the top left, cyan toward the bottom right.
    const setContact = (x: number, y: number) => {
      const width = key.offsetWidth;
      const height = key.offsetHeight;
      const tone = Math.max(0, Math.min(1, (x / width + y / height) / 2));
      const rgb = [0, 255 - 43 * tone, 136 + 119 * tone].map(channel => Math.round(channel * 0.65 + 255 * 0.35));
      const spot = Math.round(Math.max(120, Math.min(200, Math.min(width, height) * 1.5 + 40)));
      key.style.setProperty('--contact-size', `${spot}px`);
      key.style.setProperty('--cx', `${x.toFixed(1)}px`);
      key.style.setProperty('--cy', `${y.toFixed(1)}px`);
      key.style.setProperty('--fx', `${(x + EDGE_BLEED).toFixed(1)}px`);
      key.style.setProperty('--fy', `${(y + EDGE_BLEED).toFixed(1)}px`);
      key.style.setProperty('--contact-rgb', rgb.join(', '));
      touch = { x, y };
    };

    const place = (clientX: number, clientY: number) => {
      const rect = key.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left)) * (key.offsetWidth / rect.width);
      const y = Math.max(0, Math.min(rect.height, clientY - rect.top)) * (key.offsetHeight / rect.height);
      setContact(x, y);
    };

    const flashFailed = () => {
      key.classList.remove('is-failed');
      void key.offsetWidth;
      key.classList.add('is-failed');
      later(900, () => key.classList.remove('is-failed'));
    };

    const flashDone = () => {
      key.classList.add('is-done');
      later(DONE_PAUSE, () => onDoneRef.current?.());
    };

    const settle = () => {
      beam?.stop();
      beam = null;
      key.classList.remove('is-busy');
      key.removeAttribute('aria-busy');
    };

    const operate = () => {
      let result: KeyOutcome | Promise<KeyOutcome>;
      try {
        result = actionRef.current();
      } catch {
        result = 'failed';
      }
      if (typeof result === 'string') {
        if (result === 'done') flashDone();
        else flashFailed();
        return;
      }
      key.classList.add('is-busy');
      key.setAttribute('aria-busy', 'true');
      const edge = edgeRef.current?.querySelector('path');
      const paths = beamRef.current ? Array.from(beamRef.current.querySelectorAll('path')) : [];
      if (!prefersReducedMotion() && edge && paths.length) beam = startBeam(paths, edge, touch.x, touch.y);
      result.then(
        outcome => {
          if (!alive) return;
          if (outcome !== 'done') {
            settle();
            flashFailed();
            return;
          }
          const finish = () => {
            if (!alive) return;
            settle();
            flashDone();
          };
          if (beam) beam.close(finish);
          else finish();
        },
        () => {
          if (!alive) return;
          settle();
          flashFailed();
        },
      );
    };

    const press = () => {
      window.clearTimeout(settleTimer);
      key.classList.remove('is-commit', 'is-cancel', 'is-commit-wait', 'is-failed', 'is-done');
      void key.offsetWidth;
      key.classList.add('is-contact');
    };

    const release = (commit: boolean) => {
      key.classList.remove('is-contact');
      if (commit) {
        key.classList.add('is-commit-wait');
        settleTimer = window.setTimeout(() => key.classList.remove('is-commit-wait'), 400);
        operate();
        return;
      }
      key.classList.add('is-cancel');
      settleTimer = window.setTimeout(() => key.classList.remove('is-cancel'), 360);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (blocked() || (event.pointerType === 'mouse' && event.button !== 0)) return;
      pointer = event.pointerId;
      try {
        key.setPointerCapture(event.pointerId);
      } catch {
        // Capture is unavailable; the press still works while the pointer stays on the key.
      }
      place(event.clientX, event.clientY);
      press();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerId !== pointer) return;
      const rect = key.getBoundingClientRect();
      const margin = 14;
      if (event.clientX < rect.left - margin || event.clientX > rect.right + margin || event.clientY < rect.top - margin || event.clientY > rect.bottom + margin) {
        pointer = null;
        release(false);
        return;
      }
      place(event.clientX, event.clientY);
    };

    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerId !== pointer) return;
      pointer = null;
      release(true);
    };

    const onPointerCancel = (event: PointerEvent) => {
      if (event.pointerId !== pointer) return;
      pointer = null;
      release(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      if (blocked() || event.repeat) return;
      setContact(key.offsetWidth / 2, key.offsetHeight / 2);
      press();
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if ((event.key === 'Enter' || event.key === ' ') && key.classList.contains('is-contact')) release(true);
    };

    const onContextMenu = (event: Event) => event.preventDefault();

    key.addEventListener('pointerdown', onPointerDown);
    key.addEventListener('pointermove', onPointerMove);
    key.addEventListener('pointerup', onPointerUp);
    key.addEventListener('pointercancel', onPointerCancel);
    key.addEventListener('keydown', onKeyDown);
    key.addEventListener('keyup', onKeyUp);
    key.addEventListener('contextmenu', onContextMenu);
    key.vtCancelPress = () => {
      if (pointer === null) return;
      pointer = null;
      release(false);
    };
    triggerRef.current = () => {
      if (blocked()) return;
      setContact(key.offsetWidth / 2, key.offsetHeight / 2);
      operate();
    };

    return () => {
      alive = false;
      beam?.stop();
      window.clearTimeout(settleTimer);
      timers.forEach(id => window.clearTimeout(id));
      key.removeEventListener('pointerdown', onPointerDown);
      key.removeEventListener('pointermove', onPointerMove);
      key.removeEventListener('pointerup', onPointerUp);
      key.removeEventListener('pointercancel', onPointerCancel);
      key.removeEventListener('keydown', onKeyDown);
      key.removeEventListener('keyup', onKeyUp);
      key.removeEventListener('contextmenu', onContextMenu);
      delete key.vtCancelPress;
    };
  }, []);

  const { width, height } = size;
  const measured = width > 0 && height > 0;
  const d = measured ? keyPath(width, height, 0.5, 6) : '';

  return (
    <button
      ref={keyRef}
      type="button"
      className={className ? `vt-key ${className}` : 'vt-key'}
      aria-label={label ?? title}
      aria-pressed={pressed}
      aria-disabled={disabled ? true : undefined}
      data-inert={inert ? 'true' : undefined}
    >
      {measured && <EdgeSvg className="vt-key-glow" width={width} height={height} d={d} gain={1} layers={GLOW} />}
      <span
        className="vt-key-plate"
        aria-hidden="true"
        style={measured ? { clipPath: `path('${keyPath(width, height, 0, 6)}')` } : undefined}
      >
        <span className="vt-key-sheen" />
        <span className="vt-key-lit" />
        <span className="vt-key-contact" />
      </span>
      <span className="vt-key-body">
        {children ?? (
          <>
            {icon ? <span className="vt-key-icon">{icon}</span> : null}
            <span className="vt-key-copy">
              <span className="vt-key-title">{title}</span>
            </span>
          </>
        )}
      </span>
      {measured && (
        <>
          <EdgeSvg className="vt-key-edge" width={width} height={height} d={d} gain={0.95} layers={EDGE} svgRef={edgeRef} />
          <EdgeSvg className="vt-key-spark" width={width} height={height} d={d} gain={1} layers={SPARK} />
          <EdgeSvg className="vt-key-flare" width={width} height={height} d={d} gain={1.9} layers={FLARE} />
          <EdgeSvg className="vt-key-beam" width={width} height={height} d={d} gain={1.9} layers={BEAM_LAYERS} svgRef={beamRef} />
          <EdgeSvg className="vt-key-alarm" width={width} height={height} d={d} gain={1} layers={ALARM} />
        </>
      )}
    </button>
  );
}
