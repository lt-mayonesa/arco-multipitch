import { useEffect } from "react";
import L from "leaflet";

/**
 * Google-Maps-style one-finger zoom: double-tap, keep the finger down and
 * slide. Down zooms in, up zooms out, anchored at the tap point, with
 * fractional zoom while sliding and a snap to the nearest level on release.
 * A plain double-tap (no slide) still goes to Leaflet's doubleClickZoom.
 *
 * Mirrors Leaflet's TouchZoom handler, which relies on the same private Map
 * methods (`_stop`, `_moveStart`, `_move`, `_animateZoom`, `_resetView`).
 */

const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_SLOP_PX = 30;
const DRAG_SLOP_PX = 8;
const PX_PER_ZOOM_LEVEL = 120;

interface PrivateMap {
  _stop(): void;
  _moveStart(zoomChanged: boolean, noMoveStart: boolean): void;
  _move(center: L.LatLng, zoom: number, data?: { pinch?: boolean; round?: boolean }): void;
  _animateZoom(center: L.LatLng, zoom: number, startAnim?: boolean, noUpdate?: number): void;
  _resetView(center: L.LatLng, zoom: number): void;
  _limitZoom(zoom: number): number;
  _animatingZoom?: boolean;
}

export function useTapDragZoom(map: L.Map) {
  useEffect(() => {
    const el = map.getContainer();
    const pmap = map as unknown as PrivateMap;

    let lastTap: { t: number; x: number; y: number } | null = null;
    let tapStart: { t: number; x: number; y: number } | null = null;
    let gesture: {
      startY: number;
      startZoom: number;
      anchor: L.LatLng;
      delta: L.Point; // anchor offset from the map centre (container px)
      active: boolean;
      zoom: number;
      center: L.LatLng;
      raf: number;
    } | null = null;
    let reenableDblTimer = 0;

    const containerPoint = (t: Touch) => map.mouseEventToContainerPoint(t as unknown as MouseEvent);

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        // Second finger: abandon (pinch takes over), but keep what we zoomed.
        if (gesture) finish();
        tapStart = null;
        return;
      }
      const t = e.touches[0];
      const now = performance.now();
      tapStart = { t: now, x: t.clientX, y: t.clientY };
      const isSecondTap =
        lastTap &&
        now - lastTap.t < DOUBLE_TAP_MS &&
        Math.hypot(t.clientX - lastTap.x, t.clientY - lastTap.y) < DOUBLE_TAP_SLOP_PX;
      if (!isSecondTap || pmap._animatingZoom) return;

      const p = containerPoint(t);
      gesture = {
        startY: t.clientY,
        startZoom: map.getZoom(),
        anchor: map.containerPointToLatLng(p),
        delta: p.subtract(map.getSize().divideBy(2)),
        active: false,
        zoom: map.getZoom(),
        center: map.getCenter(),
        raf: 0,
      };
      // Keep the map from panning under the second tap.
      map.dragging.disable();
    };

    const onMove = (e: TouchEvent) => {
      if (!gesture || e.touches.length !== 1) return;
      const dy = e.touches[0].clientY - gesture.startY;
      if (!gesture.active) {
        if (Math.abs(dy) < DRAG_SLOP_PX) return;
        gesture.active = true;
        window.clearTimeout(reenableDblTimer);
        map.doubleClickZoom.disable();
        pmap._stop();
        pmap._moveStart(true, false);
      }
      e.preventDefault();
      e.stopPropagation();

      const g = gesture;
      g.zoom = Math.min(map.getMaxZoom(), Math.max(map.getMinZoom(), g.startZoom + dy / PX_PER_ZOOM_LEVEL));
      g.center = map.unproject(map.project(g.anchor, g.zoom).subtract(g.delta), g.zoom);
      cancelAnimationFrame(g.raf);
      g.raf = requestAnimationFrame(() => pmap._move(g.center, g.zoom, { pinch: true, round: false }));
    };

    const finish = () => {
      const g = gesture;
      gesture = null;
      map.dragging.enable();
      if (!g?.active) return;
      cancelAnimationFrame(g.raf);
      const zoom = pmap._limitZoom(g.zoom);
      const center = map.unproject(map.project(g.anchor, zoom).subtract(g.delta), zoom);
      if (map.options.zoomAnimation) pmap._animateZoom(center, zoom, true, map.options.zoomSnap);
      else pmap._resetView(center, zoom);
      // Swallow any synthetic dblclick from this gesture's taps.
      reenableDblTimer = window.setTimeout(() => map.doubleClickZoom.enable(), DOUBLE_TAP_MS + 100);
    };

    const onEnd = (e: TouchEvent) => {
      if (e.touches.length > 0) return;
      const wasGesture = !!gesture;
      const s = tapStart;
      tapStart = null;
      finish();
      // Only a short, still touch counts as the first tap of a double-tap.
      const t = e.changedTouches[0];
      lastTap =
        !wasGesture &&
        s &&
        t &&
        performance.now() - s.t < DOUBLE_TAP_MS &&
        Math.hypot(t.clientX - s.x, t.clientY - s.y) < DRAG_SLOP_PX
          ? { t: performance.now(), x: t.clientX, y: t.clientY }
          : null;
    };

    // Capture phase so we run before Leaflet's own drag handlers.
    el.addEventListener("touchstart", onStart, { capture: true, passive: true });
    el.addEventListener("touchmove", onMove, { capture: true, passive: false });
    el.addEventListener("touchend", onEnd, { capture: true });
    el.addEventListener("touchcancel", onEnd, { capture: true });
    return () => {
      window.clearTimeout(reenableDblTimer);
      el.removeEventListener("touchstart", onStart, { capture: true });
      el.removeEventListener("touchmove", onMove, { capture: true });
      el.removeEventListener("touchend", onEnd, { capture: true });
      el.removeEventListener("touchcancel", onEnd, { capture: true });
    };
  }, [map]);
}
