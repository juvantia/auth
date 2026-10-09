'use client';

import { useEffect, useRef } from 'react';
import { paintRelief, type Plain } from './relief';

interface WorldProps {
  // Changes whenever the wordmark may have moved, so the plain under it moves too.
  screen: string;
}

// The world behind every screen: the land, two carriers of light from beyond the window, grain, and the broadcast
// raster. The land drifts a little slower than the page, and ends where Civitas ends (the element with data-frontier).
export default function World({ screen }: WorldProps) {
  const worldRef = useRef<HTMLDivElement>(null);
  const reliefRef = useRef<HTMLCanvasElement>(null);
  const redrawRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    const world = worldRef.current;
    const relief = reliefRef.current;
    if (!world || !relief) return;
    const cache = new Map<string, HTMLCanvasElement>();
    let alive = true;
    let extra = 0;
    let drawn = { key: '', width: 0, height: 0 };
    let scrollFrame = 0;
    let resizeTimer = 0;

    const parallax = () => {
      const range = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const shift = Math.min(extra, (window.scrollY / range) * extra * 0.6);
      relief.style.transform = `translate3d(0, ${(-shift).toFixed(1)}px, 0)`;
    };

    const frontier = () => {
      const line = document.querySelector('[data-frontier]');
      if (!line) {
        world.style.removeProperty('--vt-frontier');
        return;
      }
      world.style.setProperty('--vt-frontier', `${Math.round(line.getBoundingClientRect().top + 6)}px`);
    };

    const draw = (force: boolean) => {
      if (!alive) return;
      const width = document.documentElement.clientWidth;
      const height = window.innerHeight;
      if (!width || !height) return;
      const brand = document.querySelector('[data-plain]')?.getBoundingClientRect();
      const plain: Plain | null = brand
        ? {
            x: Math.round(brand.left + brand.width / 2),
            y: Math.round(brand.top + brand.height / 2 + window.scrollY),
            rx: Math.round(brand.width / 2 + 70),
            ry: 70,
          }
        : null;
      // A phone's toolbar changes the height as it scrolls; the extra height covers that without a redraw.
      const sameWindow = width === drawn.width && height <= drawn.height + extra && height >= drawn.height * 0.85;
      const key = `${width}x${sameWindow ? drawn.height : height}:${plain ? `${plain.x},${plain.y}` : 'none'}`;
      if (!force && key === drawn.key) return;
      const drawHeight = sameWindow ? drawn.height : height;
      extra = Math.round(drawHeight * 0.32);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      let layer = cache.get(key);
      if (!layer) {
        layer = paintRelief(width, drawHeight, extra, plain, dpr);
        cache.set(key, layer);
      }
      drawn = { key, width, height: drawHeight };
      relief.width = layer.width;
      relief.height = layer.height;
      relief.style.width = `${width}px`;
      relief.style.height = `${drawHeight + extra}px`;
      const ctx = relief.getContext('2d');
      ctx?.clearRect(0, 0, layer.width, layer.height);
      ctx?.drawImage(layer, 0, 0);
      relief.classList.add('is-ready');
      parallax();
    };

    const redraw = () => {
      requestAnimationFrame(() => {
        draw(false);
        frontier();
      });
    };
    redrawRef.current = redraw;

    const onScroll = () => {
      if (scrollFrame) return;
      scrollFrame = requestAnimationFrame(() => {
        scrollFrame = 0;
        parallax();
        frontier();
      });
    };
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(redraw, 120);
      frontier();
    };
    // The content changes height as plates enter and edits open; the border moves with it.
    const content = new ResizeObserver(frontier);
    content.observe(document.body);

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    if (document.fonts) void document.fonts.ready.then(redraw);
    else redraw();

    return () => {
      alive = false;
      cancelAnimationFrame(scrollFrame);
      window.clearTimeout(resizeTimer);
      content.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  useEffect(() => {
    redrawRef.current();
  }, [screen]);

  return (
    <div ref={worldRef} className="vt-world" aria-hidden="true">
      <div className="vt-world-land">
        <canvas ref={reliefRef} className="vt-relief" />
      </div>
      <div className="vt-carriers" />
      <div className="vt-grain" />
      <div className="vt-raster" />
    </div>
  );
}
