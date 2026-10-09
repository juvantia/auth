'use client';

import React, { useEffect, useRef } from 'react';
import type { FilamentColor } from '@/contracts/phalera';

interface PhaleraCanvasProps {
  pixels: number[];
  palette: FilamentColor[];
  className?: string;
}

export default function PhaleraCanvas({
  pixels,
  palette,
  className = 'w-full h-full',
}: PhaleraCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, 64, 64);

    if (!Array.isArray(pixels) || !Array.isArray(palette) || palette.length === 0) {
      ctx.fillStyle = '#0F0F0F';
      ctx.fillRect(0, 0, 64, 64);
      return;
    }

    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        const cIdx = pixels[y * 64 + x] ?? 1;
        const color = palette[cIdx]?.hex || '#0F0F0F';
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }, [pixels, palette]);

  return (
    <canvas
      ref={canvasRef}
      width={64}
      height={64}
      className={className}
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
