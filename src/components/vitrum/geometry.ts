// Neon Vitrum geometry, ported from the Deck and the Citizen prototype.

export const PANEL_RADIUS = 14;
export const TAB_STEP = 9;
export const TAB_AFTER_TITLE = 22;
export const EDGE_BLEED = 16;

export type EdgeStop = readonly [offset: number, color: string, opacity: number];

// The Deck's diagonal edge light: neon catches the top-left and bottom-right corners only.
export const EDGE_STOPS: readonly EdgeStop[] = [
  [0, '#00ff88', 0.42],
  [0.24, '#d2e6de', 0.17],
  [0.5, '#ffffff', 0.13],
  [0.76, '#d0e2e8', 0.17],
  [1, '#00d4ff', 0.46],
];

type Vertex = readonly [x: number, y: number, radius: number];

export function roundedPath(vertices: readonly Vertex[]): string {
  const count = vertices.length;
  const segments = vertices.map(([x, y, radius], index) => {
    const [px, py] = vertices[(index - 1 + count) % count];
    const [nx, ny] = vertices[(index + 1) % count];
    const inLength = Math.hypot(x - px, y - py) || 1;
    const outLength = Math.hypot(nx - x, ny - y) || 1;
    const inRadius = Math.min(radius, inLength / 2);
    const outRadius = Math.min(radius, outLength / 2);
    const sx = x - ((x - px) / inLength) * inRadius;
    const sy = y - ((y - py) / inLength) * inRadius;
    const ex = x + ((nx - x) / outLength) * outRadius;
    const ey = y + ((ny - y) / outLength) * outRadius;
    return `${index === 0 ? 'M' : 'L'}${sx.toFixed(2)} ${sy.toFixed(2)}Q${x.toFixed(2)} ${y.toFixed(2)} ${ex.toFixed(2)} ${ey.toFixed(2)}`;
  });
  return `${segments.join('')}Z`;
}

// Keys: square corners eased by a small radius. The chamfered facets stay with the Deck.
export function keyPath(width: number, height: number, inset: number, radius: number): string {
  return roundedPath([
    [inset, inset, radius],
    [width - inset, inset, radius],
    [width - inset, height - inset, radius],
    [inset, height - inset, radius],
  ]);
}

// Plates, the Civitas silhouette: a raised tab ending at `tab` and a dropped foot starting at `foot`.
export function panelPath(width: number, height: number, tab: number, foot: number, inset: number): string {
  const i = inset;
  return roundedPath([
    [i, i, PANEL_RADIUS],
    [tab, i, 6],
    [tab + TAB_STEP, i + TAB_STEP, 6],
    [width - i, i + TAB_STEP, PANEL_RADIUS],
    [width - i, height - i, PANEL_RADIUS],
    [foot, height - i, 6],
    [foot - TAB_STEP, height - i - TAB_STEP, 6],
    [i, height - i - TAB_STEP, PANEL_RADIUS],
  ]);
}

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
