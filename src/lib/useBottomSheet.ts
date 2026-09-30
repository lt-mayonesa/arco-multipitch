import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * Overlay bottom sheet, Google-Maps style. The sheet always has the full
 * height of its container and is moved with `translateY`, so nothing behind
 * it (the Leaflet map) is ever resized while dragging.
 *
 * Gestures:
 * - Touch drag anywhere on the sheet outside a `[data-sheet-scroll]` area
 *   (grip, filter bar, detail top bar) moves the sheet.
 * - `[data-sheet-scroll="always"]` areas (e.g. the filter panel) scroll at
 *   every snap; a drag they can't scroll any further moves the sheet.
 * - Inside other `[data-sheet-scroll]` areas: when the sheet is not fully expanded
 *   the area doesn't scroll (CSS) and vertical drags move the sheet instead;
 *   when fully expanded it scrolls natively, and pulling down while scrolled
 *   to the top hands the gesture over to the sheet (collapse).
 * - Mouse: drag the non-scrolling, non-interactive parts; wheel down over a
 *   scroll area expands the sheet; click the grip to cycle snaps.
 * - A fast flick moves to the next snap in the flick direction, otherwise the
 *   sheet settles on the nearest snap.
 */

export type SnapKey = "full" | "half" | "peek";

interface Options {
  snap: SnapKey;
  onSnapChange: (snap: SnapKey) => void;
  /** Visible sheet height at the "peek" snap, in px. */
  peekPx: number;
  /** Share (0-1) of the container height the sheet covers at the "half" snap. */
  halfFraction: number;
}

const SNAP_ORDER: SnapKey[] = ["full", "half", "peek"]; // increasing translateY
const TAP_SLOP_PX = 6;
const FLICK_VELOCITY = 0.45; // px/ms
const INTERACTIVE = "input, select, textarea, button, a, label, [role='button']";

export function useBottomSheet({ snap, onSnapChange, peekPx, halfFraction }: Options) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  const [dragOffset, setDragOffset] = useState<number | null>(null);

  const offsetFor = useCallback(
    (key: SnapKey, h: number) => {
      if (key === "full") return 0;
      if (key === "half") return Math.round(h * (1 - halfFraction));
      return Math.max(0, h - peekPx);
    },
    [halfFraction, peekPx],
  );

  // Latest values for native event listeners (attached once).
  const live = useRef({ snap, containerHeight, offsetFor, onSnapChange });
  useEffect(() => {
    live.current = { snap, containerHeight, offsetFor, onSnapChange };
  });

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setContainerHeight(el.clientHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Shared drag state machine used by touch + mouse paths.
  const drag = useRef<{
    startY: number;
    startOffset: number;
    lastY: number;
    lastT: number;
    velocity: number;
    moved: boolean;
  } | null>(null);
  const suppressClickUntil = useRef(0);

  const beginDrag = useCallback((y: number) => {
    const { snap: s, containerHeight: h, offsetFor: off } = live.current;
    drag.current = {
      startY: y,
      startOffset: off(s, h),
      lastY: y,
      lastT: performance.now(),
      velocity: 0,
      moved: false,
    };
  }, []);

  const moveDrag = useCallback((y: number) => {
    const d = drag.current;
    if (!d) return;
    const { containerHeight: h, offsetFor: off } = live.current;
    const now = performance.now();
    const dt = Math.max(1, now - d.lastT);
    // Exponential smoothing so one jittery sample doesn't dominate the flick.
    d.velocity = 0.7 * ((y - d.lastY) / dt) + 0.3 * d.velocity;
    d.lastY = y;
    d.lastT = now;
    if (Math.abs(y - d.startY) > TAP_SLOP_PX) d.moved = true;
    const max = off("peek", h);
    setDragOffset(Math.min(max, Math.max(0, d.startOffset + (y - d.startY))));
  }, []);

  const endDrag = useCallback(() => {
    const d = drag.current;
    drag.current = null;
    setDragOffset(null);
    if (!d || !d.moved) return;
    suppressClickUntil.current = performance.now() + 350;

    const { containerHeight: h, offsetFor: off, onSnapChange: change } = live.current;
    const current = Math.min(off("peek", h), Math.max(0, d.startOffset + (d.lastY - d.startY)));
    const stale = performance.now() - d.lastT > 120; // finger rested before release
    const v = stale ? 0 : d.velocity;
    const offsets = SNAP_ORDER.map((k) => ({ k, o: off(k, h) }));

    let next: SnapKey;
    if (v > FLICK_VELOCITY) {
      next = (offsets.find((s) => s.o > current + 1) ?? offsets[offsets.length - 1]).k;
    } else if (v < -FLICK_VELOCITY) {
      next = ([...offsets].reverse().find((s) => s.o < current - 1) ?? offsets[0]).k;
    } else {
      next = offsets.reduce((a, b) => (Math.abs(b.o - current) < Math.abs(a.o - current) ? b : a)).k;
    }
    change(next);
  }, []);

  // Touch: native, non-passive listeners so we can preventDefault once we own the gesture.
  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;

    let mode: "pending" | "drag" | "ignore" = "ignore";
    let startX = 0;
    let startY = 0;
    let scrollEl: HTMLElement | null = null;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        if (mode === "drag") endDrag();
        mode = "ignore";
        return;
      }
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      scrollEl = (e.target as Element).closest<HTMLElement>("[data-sheet-scroll]");
      mode = "pending";
    };

    const onMove = (e: TouchEvent) => {
      if (mode === "ignore") return;
      const t = e.touches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;

      if (mode === "pending") {
        // Decide on the first move: later moves may no longer be cancelable
        // once the browser has started a native scroll.
        if (dx === 0 && dy === 0) return;
        if (Math.abs(dx) > Math.abs(dy)) {
          mode = "ignore"; // horizontal: photo rows, etc.
          return;
        }
        const expanded = live.current.snap === "full";
        if (scrollEl?.dataset.sheetScroll === "always") {
          const canScroll =
            dy > 0 ? scrollEl.scrollTop > 0 : scrollEl.scrollTop + scrollEl.clientHeight < scrollEl.scrollHeight - 1;
          if (canScroll) {
            mode = "ignore"; // native scroll
            return;
          }
        } else if (scrollEl && expanded && !(dy > 0 && scrollEl.scrollTop <= 0)) {
          mode = "ignore"; // native scroll
          return;
        }
        mode = "drag";
        beginDrag(startY);
      }

      if (e.cancelable) e.preventDefault();
      moveDrag(t.clientY);
    };

    const onEnd = () => {
      if (mode === "drag") endDrag();
      mode = "ignore";
    };

    // Swallow the click that some browsers still fire at the end of a drag.
    const onClickCapture = (e: MouseEvent) => {
      if (performance.now() < suppressClickUntil.current) {
        e.stopPropagation();
        e.preventDefault();
      }
    };

    sheet.addEventListener("touchstart", onStart, { passive: true });
    sheet.addEventListener("touchmove", onMove, { passive: false });
    sheet.addEventListener("touchend", onEnd);
    sheet.addEventListener("touchcancel", onEnd);
    sheet.addEventListener("click", onClickCapture, true);
    return () => {
      sheet.removeEventListener("touchstart", onStart);
      sheet.removeEventListener("touchmove", onMove);
      sheet.removeEventListener("touchend", onEnd);
      sheet.removeEventListener("touchcancel", onEnd);
      sheet.removeEventListener("click", onClickCapture, true);
    };
  }, [beginDrag, moveDrag, endDrag]);

  // Mouse drag (desktop).
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      const target = e.target as Element;
      // Ignore events bubbling through React portals (e.g. the photo viewer).
      if (!sheetRef.current?.contains(target)) return;
      const onGrip = !!target.closest("[data-sheet-grip]");
      if (!onGrip && (target.closest("[data-sheet-scroll]") || target.closest(INTERACTIVE))) return;
      e.preventDefault();
      beginDrag(e.clientY);
      const onMove = (ev: PointerEvent) => moveDrag(ev.clientY);
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        endDrag();
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [beginDrag, moveDrag, endDrag],
  );

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      if (snap === "full" || e.deltaY <= 0) return;
      const area = (e.target as Element).closest<HTMLElement>("[data-sheet-scroll]");
      if (area && area.dataset.sheetScroll !== "always") onSnapChange("full");
    },
    [snap, onSnapChange],
  );

  const onGripClick = useCallback(() => {
    onSnapChange(snap === "peek" ? "half" : snap === "half" ? "full" : "half");
  }, [snap, onSnapChange]);

  const settledOffset = offsetFor(snap, containerHeight);

  return {
    containerRef,
    sheetRef,
    containerHeight,
    /** Current translateY of the sheet (live while dragging). */
    offsetPx: dragOffset ?? settledOffset,
    /** Visible sheet height at the current (settled) snap. */
    visibleHeightAt: (key: SnapKey) => containerHeight - offsetFor(key, containerHeight),
    isDragging: dragOffset !== null,
    sheetProps: { onPointerDown, onWheel },
    onGripClick,
  };
}
