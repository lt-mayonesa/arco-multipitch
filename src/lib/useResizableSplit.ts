import { useCallback, useEffect, useRef, useState } from "react";

export interface SnapPoint {
  key: string;
  /** Fraction (0-1) of the container height occupied by the top pane (e.g. the map). */
  fraction: number;
}

interface Options {
  snapPoints: SnapPoint[];
  defaultKey: string;
}

/**
 * Drag-to-resize split (map on top, sheet below), Google-Maps-Android style:
 * a handle at the top of the bottom sheet can be dragged to resize the top
 * pane, snapping to the nearest configured snap point on release.
 */
export function useResizableSplit({ snapPoints, defaultKey }: Options) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const containerHeightRef = useRef(0);
  const dragStateRef = useRef<{ startY: number; startHeightPx: number } | null>(null);

  const defaultFraction = snapPoints.find((s) => s.key === defaultKey)?.fraction ?? 0.3;
  const [topHeightPx, setTopHeightPx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [activeSnapKey, setActiveSnapKey] = useState(defaultKey);

  const measure = useCallback(() => {
    const h = containerRef.current?.clientHeight ?? 0;
    containerHeightRef.current = h;
    return h;
  }, []);

  // Initialize + keep in sync with viewport/container size changes.
  useEffect(() => {
    const h = measure();
    setTopHeightPx(h * defaultFraction);

    const onResize = () => {
      const newH = measure();
      setTopHeightPx((prev) => {
        // Keep the same relative snap fraction rather than the same pixel value.
        const prevFraction = containerHeightRef.current > 0 ? prev / (containerHeightRef.current || 1) : defaultFraction;
        return newH * prevFraction;
      });
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const snapTo = useCallback(
    (key: string) => {
      const point = snapPoints.find((s) => s.key === key);
      if (!point) return;
      const h = containerHeightRef.current || measure();
      setTopHeightPx(h * point.fraction);
      setActiveSnapKey(key);
    },
    [snapPoints, measure],
  );

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragStateRef.current = { startY: e.clientY, startHeightPx: topHeightPx };
    setIsDragging(true);
  }, [topHeightPx]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const drag = dragStateRef.current;
    if (!drag) return;
    const h = containerHeightRef.current || measure();
    const delta = e.clientY - drag.startY;
    const next = Math.min(h, Math.max(0, drag.startHeightPx + delta));
    setTopHeightPx(next);
  }, [measure]);

  const endDrag = useCallback(() => {
    if (!dragStateRef.current) return;
    dragStateRef.current = null;
    setIsDragging(false);
    // Snap to nearest configured point.
    const h = containerHeightRef.current || measure();
    setTopHeightPx((current) => {
      const currentFraction = h > 0 ? current / h : 0;
      let nearest = snapPoints[0];
      let bestDist = Infinity;
      for (const p of snapPoints) {
        const d = Math.abs(p.fraction - currentFraction);
        if (d < bestDist) {
          bestDist = d;
          nearest = p;
        }
      }
      setActiveSnapKey(nearest.key);
      return h * nearest.fraction;
    });
  }, [snapPoints, measure]);

  return {
    containerRef,
    topHeightPx,
    isDragging,
    activeSnapKey,
    snapTo,
    dragHandleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    },
  };
}
