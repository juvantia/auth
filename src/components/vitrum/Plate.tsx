'use client';

import { useEffect, useId, useImperativeHandle, useRef, useState, type CSSProperties, type ReactNode, type Ref } from 'react';
import EdgeSvg, { type EdgeLayer } from './EdgeSvg';
import { BEAM_LAYERS, startBeam, type Beam } from './beam';
import { TAB_AFTER_TITLE, panelPath, prefersReducedMotion } from './geometry';
import './plate.css';

export interface PlateHandle {
  // The white beam runs around the rim while the answer is awaited.
  wait(): void;
  // The beam closes the circle and the rim flashes green, then `onFlash` runs.
  grant(onFlash?: () => void): void;
  // The light goes back into the rim without a flash: the screen that opens is the answer.
  release(): void;
}

interface PlateProps {
  title: string;
  meta?: ReactNode;
  // Entrance delay in milliseconds, to stagger plates.
  delay?: number;
  // Flashes green once its rim has drawn in (ACCESS GRANTED arriving with its plate).
  enterFlash?: boolean;
  // Carries a key's waiting light: only ACCESS, the one plate that waits for an answer.
  canWait?: boolean;
  // A new key swaps the body in place, without replaying the screen's entrance.
  bodyKey?: string;
  className?: string;
  handle?: Ref<PlateHandle>;
  children: ReactNode;
}

interface Shape {
  width: number;
  height: number;
  tab: number;
  foot: number;
}

const GLOW: readonly EdgeLayer[] = [{ width: 3 }];
const FRAME: readonly EdgeLayer[] = [{ width: 0.8, normalized: true }];
const FLASH: readonly EdgeLayer[] = [{ width: 2.2, color: '#00ff88', opacity: 0.85 }, { width: 0.9, color: '#e6fff1' }];

// Smoked glass in the Civitas silhouette: the title stands in a raised tab that ends 22 px after it, and the foot
// drops from 42 % of the width. Plates reflect light rather than emit it: no raster, no haze, a dim rim.
export default function Plate({ title, meta, delay = 0, enterFlash = false, canWait = false, bodyKey, className, handle, children }: PlateProps) {
  const titleId = `vt-plate-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const sectionRef = useRef<HTMLElement>(null);
  const glassRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const glowRef = useRef<SVGSVGElement>(null);
  const beamRef = useRef<SVGSVGElement>(null);
  const beam = useRef<Beam | null>(null);
  const [shape, setShape] = useState<Shape | null>(null);
  const [firstBody] = useState(bodyKey);

  useEffect(() => {
    const glass = glassRef.current;
    const heading = titleRef.current;
    if (!glass || !heading) return;
    const measure = () => {
      const width = glass.offsetWidth;
      const height = glass.offsetHeight;
      if (!width || !height) return;
      let edge = heading.offsetLeft + heading.offsetWidth;
      for (let parent = heading.offsetParent as HTMLElement | null; parent && parent !== glass; parent = parent.offsetParent as HTMLElement | null) {
        edge += parent.offsetLeft;
      }
      const tab = Math.round(Math.min(width * 0.82, edge + TAB_AFTER_TITLE));
      const foot = Math.round(width * 0.42);
      setShape(previous =>
        previous && previous.width === width && previous.height === height && previous.tab === tab && previous.foot === foot
          ? previous
          : { width, height, tab, foot },
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(glass);
    observer.observe(heading);
    const running = beam;
    return () => {
      observer.disconnect();
      running.current?.stop();
    };
  }, []);

  useImperativeHandle(handle, () => ({
    wait() {
      const section = sectionRef.current;
      if (!section) return;
      section.classList.add('is-waiting');
      section.setAttribute('aria-busy', 'true');
      if (prefersReducedMotion() || beam.current) return;
      const edge = glowRef.current?.querySelector('path');
      const paths = beamRef.current ? Array.from(beamRef.current.querySelectorAll('path')) : [];
      if (edge && paths.length) beam.current = startBeam(paths, edge, 0, 0);
    },
    grant(onFlash) {
      const section = sectionRef.current;
      if (!section) return;
      const flash = () => {
        beam.current?.stop();
        beam.current = null;
        section.classList.remove('is-waiting');
        section.removeAttribute('aria-busy');
        section.classList.add('is-granted');
        onFlash?.();
      };
      if (beam.current) beam.current.close(flash);
      else flash();
    },
    release() {
      beam.current?.stop();
      beam.current = null;
      sectionRef.current?.classList.remove('is-waiting');
      sectionRef.current?.removeAttribute('aria-busy');
    },
  }), []);

  const swapped = bodyKey !== firstBody;
  const edge = shape ? panelPath(shape.width, shape.height, shape.tab, shape.foot, 0.5) : '';

  return (
    <section
      ref={sectionRef}
      className={className ? `vt-plate ${className}` : 'vt-plate'}
      data-flash={enterFlash ? 'done' : undefined}
      style={{ '--enter-delay': `${delay}ms` } as CSSProperties}
      aria-labelledby={titleId}
    >
      <div className="vt-plate-stage">
        {shape && <EdgeSvg className="vt-plate-glow" width={shape.width} height={shape.height} d={edge} gain={1} layers={GLOW} svgRef={glowRef} />}
        <div
          ref={glassRef}
          className="vt-plate-glass"
          style={shape ? { clipPath: `path('${panelPath(shape.width, shape.height, shape.tab, shape.foot, 0)}')` } : undefined}
        >
          <span className="vt-plate-signal" aria-hidden="true" />
          <div className="vt-plate-content">
            <header className="vt-plate-head">
              <h2 ref={titleRef} className="vt-plate-title" id={titleId}>
                {title}
              </h2>
              {meta ? <div className="vt-plate-meta">{meta}</div> : null}
            </header>
            <div key={bodyKey} className={swapped ? 'vt-plate-body is-swapped' : 'vt-plate-body'}>
              {children}
            </div>
          </div>
        </div>
        {shape && <EdgeSvg className="vt-plate-frame" width={shape.width} height={shape.height} d={edge} gain={0.55} layers={FRAME} />}
        {shape && (enterFlash || canWait) && (
          <EdgeSvg className="vt-plate-flash" width={shape.width} height={shape.height} d={edge} gain={1} layers={FLASH} />
        )}
        {shape && canWait && (
          <EdgeSvg className="vt-plate-beam" width={shape.width} height={shape.height} d={edge} gain={1} layers={BEAM_LAYERS} svgRef={beamRef} />
        )}
      </div>
    </section>
  );
}
