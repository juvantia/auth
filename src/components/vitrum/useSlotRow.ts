'use client';

import { useEffect, type RefObject } from 'react';
import { prefersReducedMotion } from './geometry';
import type { KeyElement } from './GlassKey';

// A finger scrolls the row natively. A mouse drags it, or turns the wheel over it once the page has stopped
// scrolling; at either end the row lets go and the wheel scrolls the page again. The row comes to rest on a slot.
let lastPageWheel = -Infinity;
let listening = false;
const rowWheels = new WeakSet<Event>();

const listenToPage = () => {
  if (listening) return;
  listening = true;
  window.addEventListener('wheel', event => {
    if (!rowWheels.has(event)) lastPageWheel = event.timeStamp;
  }, { passive: true });
};

export function useSlotRow(ref: RefObject<HTMLElement | null>, ready: boolean) {
  useEffect(() => {
    const row = ref.current;
    if (!ready || !row) return;
    listenToPage();
    const max = () => Math.max(0, row.scrollWidth - row.clientWidth);
    const scaleOf = () => row.getBoundingClientRect().width / row.offsetWidth || 1;
    let frame = 0;
    let idle = 0;
    let wheelTo: number | null = null;
    let drag: { id: number; x: number; left: number; moved: boolean; trail: Array<[number, number]> } | null = null;

    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      window.clearTimeout(idle);
      wheelTo = null;
    };

    const settle = () => {
      stop();
      const pad = parseFloat(getComputedStyle(row).paddingLeft) || 0;
      const from = row.scrollLeft;
      const to = Array.from(row.querySelectorAll<HTMLElement>('.vt-slot-cell'))
        .map(cell => Math.min(max(), Math.max(0, cell.offsetLeft - pad)))
        .reduce((best, value) => (Math.abs(value - from) < Math.abs(best - from) ? value : best), from);
      const done = () => row.classList.remove('is-moving', 'is-grabbing');
      if (prefersReducedMotion() || Math.abs(to - from) < 1) {
        row.scrollLeft = to;
        done();
        return;
      }
      const start = performance.now();
      const step = (time: number) => {
        const t = Math.min(1, (time - start) / 280);
        row.scrollLeft = from + (to - from) * (1 - Math.pow(1 - t, 3));
        if (t < 1) {
          frame = requestAnimationFrame(step);
          return;
        }
        frame = 0;
        done();
      };
      frame = requestAnimationFrame(step);
    };

    const move = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      const dx = event.clientX - drag.x;
      if (!drag.moved) {
        if (Math.abs(dx) < 6) return;
        drag.moved = true;
        row.classList.add('is-moving', 'is-grabbing');
        const target = event.target instanceof Element ? event.target.closest<KeyElement>('.vt-key') : null;
        target?.vtCancelPress?.();
      }
      row.scrollLeft = drag.left - dx / scaleOf();
      drag.trail.push([event.timeStamp, event.clientX]);
      if (drag.trail.length > 8) drag.trail.shift();
    };

    const end = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      const { moved, trail } = drag;
      drag = null;
      if (!moved) return;
      row.classList.remove('is-grabbing');
      const last = trail[trail.length - 1];
      const first = trail.find(([time]) => last[0] - time <= 90) ?? trail[0];
      let velocity = -((last[1] - first[1]) / Math.max(1, last[0] - first[0])) / scaleOf();
      if (prefersReducedMotion() || Math.abs(velocity) < 0.08) {
        settle();
        return;
      }
      let before = performance.now();
      const glide = (time: number) => {
        const elapsed = Math.min(32, time - before);
        before = time;
        row.scrollLeft += velocity * elapsed;
        velocity *= Math.pow(0.92, elapsed / 16);
        if (Math.abs(velocity) < 0.08 || row.scrollLeft <= 0 || row.scrollLeft >= max() - 0.5) {
          frame = 0;
          settle();
          return;
        }
        frame = requestAnimationFrame(glide);
      };
      frame = requestAnimationFrame(glide);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || event.button !== 0 || max() <= 0) return;
      stop();
      drag = { id: event.pointerId, x: event.clientX, left: row.scrollLeft, moved: false, trail: [[event.timeStamp, event.clientX]] };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', end);
      window.addEventListener('pointercancel', end);
    };

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || max() <= 0 || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
      if (event.timeStamp - lastPageWheel < 320) return;
      const unit = event.deltaMode === 1 ? 40 : event.deltaMode === 2 ? row.clientWidth : 1;
      const delta = event.deltaY * unit;
      const from = wheelTo ?? row.scrollLeft;
      if ((delta < 0 && from <= 0.5) || (delta > 0 && from >= max() - 0.5)) return;
      event.preventDefault();
      rowWheels.add(event);
      stop();
      row.classList.add('is-moving');
      wheelTo = Math.max(0, Math.min(max(), from + delta));
      const step = () => {
        if (wheelTo === null) return;
        const gap = wheelTo - row.scrollLeft;
        if (Math.abs(gap) < 0.6) {
          row.scrollLeft = wheelTo;
          wheelTo = null;
          frame = 0;
          idle = window.setTimeout(settle, 140);
          return;
        }
        row.scrollLeft += gap * 0.22;
        frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    };

    row.addEventListener('pointerdown', onPointerDown);
    row.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      stop();
      row.removeEventListener('pointerdown', onPointerDown);
      row.removeEventListener('wheel', onWheel);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
  }, [ref, ready]);
}
