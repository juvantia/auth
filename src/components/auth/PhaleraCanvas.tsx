'use client';

import { useEffect, useRef } from 'react';
import type { FilamentColor } from '@/contracts/phalera';

interface PhaleraCanvasProps {
  pixels: number[];
  palette: FilamentColor[];
  className?: string;
}

const SIDE = 64;
const FALLBACK = '#0F0F0F';

const toLinear = (value: number) => {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const toSrgb = (value: number) => Math.round(255 * (value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055));

const linearOf = (hex: string | undefined) => {
  const value = /^#?([0-9a-f]{6})$/i.exec(hex ?? '')?.[1] ?? FALLBACK.slice(1);
  return [0, 2, 4].map(at => toLinear(parseInt(value.slice(at, at + 2), 16)));
};

// Each screen pixel takes the light-weighted average of the picture's pixels it covers: a small phalera keeps its
// thin lines, a large one keeps square, even pixels.
function resample(pixels: number[], palette: FilamentColor[], size: number): ImageData {
  const colours = palette.map(colour => linearOf(colour?.hex));
  const fallback = linearOf(FALLBACK);
  const image = new ImageData(size, size);
  const step = SIDE / size;
  for (let oy = 0; oy < size; oy += 1) {
    const y0 = oy * step;
    const y1 = y0 + step;
    for (let ox = 0; ox < size; ox += 1) {
      const x0 = ox * step;
      const x1 = x0 + step;
      let r = 0;
      let g = 0;
      let b = 0;
      let area = 0;
      for (let sy = Math.floor(y0); sy < Math.min(SIDE, Math.ceil(y1)); sy += 1) {
        const wy = Math.min(y1, sy + 1) - Math.max(y0, sy);
        if (wy <= 0) continue;
        for (let sx = Math.floor(x0); sx < Math.min(SIDE, Math.ceil(x1)); sx += 1) {
          const wx = Math.min(x1, sx + 1) - Math.max(x0, sx);
          if (wx <= 0) continue;
          const colour = colours[pixels[sy * SIDE + sx] ?? 1] ?? fallback;
          const weight = wx * wy;
          r += colour[0] * weight;
          g += colour[1] * weight;
          b += colour[2] * weight;
          area += weight;
        }
      }
      const at = (oy * size + ox) * 4;
      image.data[at] = toSrgb(r / area);
      image.data[at + 1] = toSrgb(g / area);
      image.data[at + 2] = toSrgb(b / area);
      image.data[at + 3] = 255;
    }
  }
  return image;
}

// A phalera is a 64 × 64 picture, drawn for the screen's own pixels at whatever size the layout gives it:
// 64 px in a memory slot, or the size of an emoji after a name.
export default function PhaleraCanvas({ pixels, palette, className }: PhaleraCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let drawn = 0;
    const draw = () => {
      const width = canvas.getBoundingClientRect().width;
      if (!width) return;
      const size = Math.max(8, Math.round(width * (window.devicePixelRatio || 1)));
      if (size === drawn) return;
      drawn = size;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      if (!Array.isArray(pixels) || pixels.length < SIDE * SIDE || !Array.isArray(palette) || palette.length === 0) {
        ctx.fillStyle = FALLBACK;
        ctx.fillRect(0, 0, size, size);
        return;
      }
      ctx.putImageData(resample(pixels, palette, size), 0, 0);
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    // A zoom changes the screen's pixels without changing the layout.
    window.addEventListener('resize', draw);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', draw);
    };
  }, [pixels, palette]);

  return <canvas ref={canvasRef} width={SIDE} height={SIDE} className={className} aria-hidden="true" />;
}
