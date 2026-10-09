import type { EdgeLayer } from './EdgeSvg';

// Waiting: a white beam a fifth of the rim long runs clockwise until the answer comes. It is never a percentage.
const BEAM_SLICES = 18;
const BEAM_SHARE = 0.2;
const BEAM_SPEED = 480;

// Faint white layers that all end at the head and reach back to different lengths.
export const BEAM_LAYERS: readonly EdgeLayer[] = Array.from({ length: BEAM_SLICES }, (_, index) => ({
  width: +(1.2 + 1.1 * (1 - (index + 1) / BEAM_SLICES)).toFixed(2),
  normalized: true,
  color: '#effff9',
  opacity: 0.14,
  dash: '0 1',
}));

export interface Beam {
  // The beam grows to close the circle, then calls `done`.
  close(done: () => void): void;
  stop(): void;
}

function rimFraction(edge: SVGPathElement, x: number, y: number): number {
  const total = edge.getTotalLength();
  let best = 0;
  let bestDistance = Infinity;
  for (let index = 0; index < 96; index += 1) {
    const point = edge.getPointAtLength((index / 96) * total);
    const distance = Math.hypot(point.x - x, point.y - y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index / 96;
    }
  }
  return best;
}

// The beam enters the rim nearest to (x, y) and runs clockwise.
export function startBeam(paths: readonly SVGPathElement[], edge: SVGPathElement, x: number, y: number): Beam {
  const total = edge.getTotalLength();
  const lap = Math.min(2000, Math.max(1000, (total / BEAM_SPEED) * 1000));
  const start = rimFraction(edge, x, y);
  const began = performance.now();
  let grow = 1;
  let frame = 0;

  const tick = (now: number) => {
    const head = (start + (now - began) / lap) % 1;
    const beam = Math.min(1, BEAM_SHARE * grow);
    paths.forEach((path, index) => {
      const length = (beam * (index + 1)) / paths.length;
      path.setAttribute('stroke-dasharray', `${length.toFixed(5)} ${(1 - length).toFixed(5)}`);
      path.setAttribute('stroke-dashoffset', (length - head).toFixed(5));
    });
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);

  return {
    close(done) {
      const target = 1 / BEAM_SHARE;
      const from = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - from) / 340);
        grow = 1 + (target - 1) * t * t;
        if (t < 1) requestAnimationFrame(step);
        else done();
      };
      requestAnimationFrame(step);
    },
    stop() {
      cancelAnimationFrame(frame);
    },
  };
}
