'use client';

import { useId, type Ref } from 'react';
import { EDGE_BLEED, EDGE_STOPS } from './geometry';

export interface EdgeLayer {
  width: number;
  color?: string;
  opacity?: number;
  // Lengths measured from 0 to 1, for dashes that draw in or run around.
  normalized?: boolean;
  dash?: string;
}

interface EdgeSvgProps {
  className: string;
  width: number;
  height: number;
  d: string;
  gain: number;
  layers: readonly EdgeLayer[];
  svgRef?: Ref<SVGSVGElement>;
}

// A rim drawn around a measured surface, bleeding past it so glows and strokes are never clipped.
export default function EdgeSvg({ className, width, height, d, gain, layers, svgRef }: EdgeSvgProps) {
  const gradientId = `vt-edge-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const w = width + EDGE_BLEED * 2;
  const h = height + EDGE_BLEED * 2;

  return (
    <svg
      ref={svgRef}
      className={className}
      aria-hidden="true"
      width={w}
      height={h}
      viewBox={`${-EDGE_BLEED} ${-EDGE_BLEED} ${w} ${h}`}
      style={{ top: -EDGE_BLEED, left: -EDGE_BLEED }}
    >
      <defs>
        <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={width} y2={height}>
          {EDGE_STOPS.map(([offset, color, opacity]) => (
            <stop key={offset} offset={offset} stopColor={color} stopOpacity={Math.min(1, opacity * gain).toFixed(3)} />
          ))}
        </linearGradient>
      </defs>
      {layers.map((layer, index) => (
        <path
          key={index}
          d={d}
          fill="none"
          strokeWidth={layer.width}
          stroke={layer.color ?? `url(#${gradientId})`}
          strokeOpacity={layer.opacity}
          pathLength={layer.normalized ? 1 : undefined}
          strokeDasharray={layer.dash}
        />
      ))}
    </svg>
  );
}
