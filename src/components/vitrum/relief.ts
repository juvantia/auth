// The land: a generated relief drawn as contour lines in the emblem's diagonal light, with a massif at the top
// right and a plain under the wordmark, so no contour crosses its letters. Ported from the Citizen prototype.

export interface Plain {
  x: number;
  y: number;
  rx: number;
  ry: number;
}

const mulberry32 = (initial: number) => {
  let seed = initial;
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const makeNoise = (seed: number) => {
  const random = mulberry32(seed);
  const source = Array.from({ length: 256 }, (_, index) => index);
  for (let index = 255; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [source[index], source[swap]] = [source[swap], source[index]];
  }
  const perm = new Uint8Array(512);
  for (let index = 0; index < 512; index += 1) perm[index] = source[index & 255];
  const grad = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
  const F2 = 0.5 * (Math.sqrt(3) - 1);
  const G2 = (3 - Math.sqrt(3)) / 6;
  const corner = (gi: number, x: number, y: number) => {
    let t = 0.5 - x * x - y * y;
    if (t < 0) return 0;
    t *= t;
    const g = grad[gi & 7];
    return t * t * (g[0] * x + g[1] * y);
  };
  return (xin: number, yin: number) => {
    const skew = (xin + yin) * F2;
    const i = Math.floor(xin + skew);
    const j = Math.floor(yin + skew);
    const unskew = (i + j) * G2;
    const x0 = xin - (i - unskew);
    const y0 = yin - (j - unskew);
    const i1 = x0 > y0 ? 1 : 0;
    const j1 = x0 > y0 ? 0 : 1;
    const ii = i & 255;
    const jj = j & 255;
    return 70 * (
      corner(perm[ii + perm[jj]], x0, y0) +
      corner(perm[ii + i1 + perm[jj + j1]], x0 - i1 + G2, y0 - j1 + G2) +
      corner(perm[ii + 1 + perm[jj + 1]], x0 - 1 + 2 * G2, y0 - 1 + 2 * G2)
    );
  };
};

const noise = makeNoise(31);

// A massif at the top right, where the header is empty; the plain under the wordmark is laid over it afterwards.
const heightAt = (x: number, y: number, width: number, height: number) => {
  let value = 0;
  let amplitude = 1;
  let frequency = 1 / 340;
  let norm = 0;
  for (let octave = 0; octave < 4; octave += 1) {
    value += amplitude * noise(x * frequency + octave * 31.7, y * frequency - octave * 17.3);
    norm += amplitude;
    amplitude *= 0.5;
    frequency *= 2.03;
  }
  value /= norm;
  const tilt = x * 0.0005 + y * 0.00065;
  const mu = (x / width - 0.86) / 0.27;
  const mv = (y / height - 0.07) / 0.12;
  return value + tilt + 1.35 * Math.exp(-(mu * mu + mv * mv));
};

const smoothstep = (from: number, to: number, t: number) => {
  const k = Math.max(0, Math.min(1, (t - from) / (to - from)));
  return k * k * (3 - 2 * k);
};

const levelPlain = (field: Float32Array, cols: number, rows: number, cell: number, plain: Plain) => {
  const weights = new Float32Array(field.length);
  let sum = 0;
  let total = 0;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const dx = (c * cell - plain.x) / plain.rx;
      const dy = (r * cell - plain.y) / plain.ry;
      const weight = 1 - smoothstep(0.75, 1.6, Math.hypot(dx, dy));
      weights[r * cols + c] = weight;
      sum += weight * field[r * cols + c];
      total += weight;
    }
  }
  if (!total) return;
  const level = sum / total;
  for (let index = 0; index < field.length; index += 1) field[index] += (level - field[index]) * weights[index];
};

const diagonal = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, 'rgb(0, 255, 136)');
  gradient.addColorStop(0.26, 'rgb(170, 232, 208)');
  gradient.addColorStop(0.5, 'rgb(228, 241, 237)');
  gradient.addColorStop(0.74, 'rgb(168, 222, 238)');
  gradient.addColorStop(1, 'rgb(0, 212, 255)');
  return gradient;
};

const contourPath = (field: Float32Array, cols: number, rows: number, cell: number, level: number) => {
  const path = new Path2D();
  const segment = (a: readonly number[], b: readonly number[]) => {
    path.moveTo(a[0], a[1]);
    path.lineTo(b[0], b[1]);
  };
  for (let r = 0; r < rows - 1; r += 1) {
    for (let c = 0; c < cols - 1; c += 1) {
      const a = field[r * cols + c];
      const b = field[r * cols + c + 1];
      const d = field[(r + 1) * cols + c];
      const e = field[(r + 1) * cols + c + 1];
      const index = (a > level ? 8 : 0) | (b > level ? 4 : 0) | (e > level ? 2 : 0) | (d > level ? 1 : 0);
      if (index === 0 || index === 15) continue;
      const x = c * cell;
      const y = r * cell;
      const top = [x + (cell * (level - a)) / (b - a), y];
      const right = [x + cell, y + (cell * (level - b)) / (e - b)];
      const bottom = [x + (cell * (level - d)) / (e - d), y + cell];
      const left = [x, y + (cell * (level - a)) / (d - a)];
      const centre = (a + b + d + e) / 4 > level;
      switch (index) {
        case 1: case 14: segment(left, bottom); break;
        case 2: case 13: segment(bottom, right); break;
        case 3: case 12: segment(left, right); break;
        case 4: case 11: segment(top, right); break;
        case 6: case 9: segment(top, bottom); break;
        case 7: case 8: segment(left, top); break;
        case 5:
          if (centre) { segment(left, top); segment(bottom, right); } else { segment(left, bottom); segment(top, right); }
          break;
        case 10:
          if (centre) { segment(left, bottom); segment(top, right); } else { segment(left, top); segment(bottom, right); }
          break;
        default: break;
      }
    }
  }
  return path;
};

const LAND = {
  base: 0.78,
  corners: [[1, 0, 0.3], [1, 1, 0.22]] as const,
  top: [0.75, 0.9, 120] as const,
  contour: [0.1, 0.2] as const,
  width: [0.65, 0.9] as const,
  shade: 0.09,
  shadeFrom: 0.55,
};

// Paints the land for a window `width` × `height`, `extra` taller for the parallax, at `dpr` device pixels.
export function paintRelief(width: number, height: number, extra: number, plain: Plain | null, dpr: number): HTMLCanvasElement {
  const canvasHeight = height + extra;
  const pixelWidth = Math.round(width * dpr);
  const pixelHeight = Math.round(canvasHeight * dpr);
  const cell = 4;
  const cols = Math.ceil(width / cell) + 2;
  const rows = Math.ceil(canvasHeight / cell) + 2;
  const field = new Float32Array(cols * rows);
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) field[r * cols + c] = heightAt(c * cell, r * cell, width, height);
  }
  if (plain) levelPlain(field, cols, rows, cell, plain);
  let min = Infinity;
  let max = -Infinity;
  for (const value of field) {
    if (value < min) min = value;
    if (value > max) max = value;
  }

  const layer = document.createElement('canvas');
  layer.width = pixelWidth;
  layer.height = pixelHeight;
  const ctx = layer.getContext('2d');
  if (!ctx) return layer;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Hill shading, lit from the top left, tinted by the emblem's diagonal.
  const shade = document.createElement('canvas');
  shade.width = cols;
  shade.height = rows;
  const shadeCtx = shade.getContext('2d');
  if (shadeCtx) {
    const image = shadeCtx.createImageData(cols, rows);
    const lightLength = Math.hypot(-0.62, -0.78, 0.9);
    const light = [-0.62 / lightLength, -0.78 / lightLength, 0.9 / lightLength];
    const relief = 9;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const gx = (field[r * cols + Math.min(cols - 1, c + 1)] - field[r * cols + Math.max(0, c - 1)]) * relief;
        const gy = (field[Math.min(rows - 1, r + 1) * cols + c] - field[Math.max(0, r - 1) * cols + c]) * relief;
        const dot = (-gx * light[0] - gy * light[1] + light[2]) / Math.hypot(gx, gy, 1);
        const lit = Math.max(0, dot - LAND.shadeFrom) / (1 - LAND.shadeFrom);
        const offset = (r * cols + c) * 4;
        image.data[offset] = 255;
        image.data[offset + 1] = 255;
        image.data[offset + 2] = 255;
        image.data[offset + 3] = Math.round(Math.pow(lit, 1.6) * 255 * LAND.shade);
      }
    }
    shadeCtx.putImageData(image, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(shade, 0, 0, cols * cell, rows * cell);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = diagonal(ctx, width, canvasHeight);
    ctx.fillRect(0, 0, width, canvasHeight);
    ctx.globalCompositeOperation = 'source-over';
  }

  // Contours every 0.09 of height; every fifth is an index contour, a little brighter and wider.
  const step = 0.09;
  ctx.strokeStyle = diagonal(ctx, width, canvasHeight);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let n = Math.ceil(min / step); n * step < max; n += 1) {
    const indexContour = n % 5 === 0;
    ctx.globalAlpha = indexContour ? LAND.contour[1] : LAND.contour[0];
    ctx.lineWidth = indexContour ? LAND.width[1] : LAND.width[0];
    ctx.stroke(contourPath(field, cols, rows, cell, n * step));
  }
  ctx.globalAlpha = 1;

  // The land is quieter at the top (OPEN TOP) and brighter toward the right-hand corners.
  const mask = document.createElement('canvas');
  mask.width = pixelWidth;
  mask.height = pixelHeight;
  const maskCtx = mask.getContext('2d');
  if (maskCtx) {
    maskCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    maskCtx.fillStyle = `rgba(0, 0, 0, ${LAND.base})`;
    maskCtx.fillRect(0, 0, width, canvasHeight);
    maskCtx.globalCompositeOperation = 'lighter';
    LAND.corners.forEach(([fx, fy, strength]) => {
      const x = width * fx;
      const y = height * fy;
      const radius = Math.max(width, height) * 0.9;
      const glow = maskCtx.createRadialGradient(x, y, 0, x, y, radius);
      glow.addColorStop(0, `rgba(0, 0, 0, ${strength})`);
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      maskCtx.fillStyle = glow;
      maskCtx.fillRect(0, 0, width, canvasHeight);
    });
    maskCtx.globalCompositeOperation = 'destination-in';
    const top = maskCtx.createLinearGradient(0, 0, 0, LAND.top[2]);
    top.addColorStop(0, `rgba(0, 0, 0, ${LAND.top[0]})`);
    top.addColorStop(0.45, `rgba(0, 0, 0, ${LAND.top[1]})`);
    top.addColorStop(1, 'rgba(0, 0, 0, 1)');
    maskCtx.fillStyle = top;
    maskCtx.fillRect(0, 0, width, canvasHeight);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(mask, 0, 0);
  }
  return layer;
}
