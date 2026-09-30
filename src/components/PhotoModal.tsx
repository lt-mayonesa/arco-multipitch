import { useEffect, useRef, useState } from "react";
import type { Photo } from "../types";
import { photoCaption } from "../lib/photoGroups";

export interface PhotoViewerItem {
  photo: Photo;
  /** Group the photo belongs to, e.g. "Pitch 3 · 6a". */
  label: string;
}

interface Props {
  items: PhotoViewerItem[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

const BASE = import.meta.env.BASE_URL;

export function PhotoModal({ items, index, onClose, onIndexChange }: Props) {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const gesture = useRef<{
    mode: "none" | "pinch" | "pan" | "swipe";
    startDist: number;
    startScale: number;
    startX: number;
    startY: number;
    startTranslate: { x: number; y: number };
    lastTapTime: number;
  }>({
    mode: "none",
    startDist: 0,
    startScale: 1,
    startX: 0,
    startY: 0,
    startTranslate: { x: 0, y: 0 },
    lastTapTime: 0,
  });

  const resetZoom = () => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  };

  useEffect(() => {
    resetZoom();
  }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, items.length]);

  const go = (delta: number) => {
    const next = index + delta;
    if (next >= 0 && next < items.length) onIndexChange(next);
  };

  const dist = (touches: React.TouchList) => {
    const [a, b] = [touches[0], touches[1]];
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      gesture.current.mode = "pinch";
      gesture.current.startDist = dist(e.touches);
      gesture.current.startScale = scale;
    } else if (e.touches.length === 1) {
      const now = Date.now();
      const isDoubleTap = now - gesture.current.lastTapTime < 280;
      gesture.current.lastTapTime = now;
      if (isDoubleTap) {
        if (scale > 1) resetZoom();
        else {
          setScale(2.5);
        }
        gesture.current.mode = "none";
        return;
      }
      gesture.current.mode = scale > 1 ? "pan" : "swipe";
      gesture.current.startX = e.touches[0].clientX;
      gesture.current.startY = e.touches[0].clientY;
      gesture.current.startTranslate = translate;
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (gesture.current.mode === "pinch" && e.touches.length === 2) {
      const d = dist(e.touches);
      const next = Math.min(4, Math.max(1, gesture.current.startScale * (d / gesture.current.startDist)));
      setScale(next);
    } else if (gesture.current.mode === "pan" && e.touches.length === 1) {
      const dx = e.touches[0].clientX - gesture.current.startX;
      const dy = e.touches[0].clientY - gesture.current.startY;
      setTranslate({ x: gesture.current.startTranslate.x + dx, y: gesture.current.startTranslate.y + dy });
    } else if (gesture.current.mode === "swipe" && e.touches.length === 1) {
      const dx = e.touches[0].clientX - gesture.current.startX;
      setTranslate({ x: dx, y: 0 });
    }
  };

  const onTouchEnd = () => {
    if (gesture.current.mode === "swipe") {
      const dx = translate.x;
      if (dx < -60) go(1);
      else if (dx > 60) go(-1);
      setTranslate({ x: 0, y: 0 });
    }
    gesture.current.mode = "none";
  };

  const item = items[index];
  const src = item ? `${BASE}${item.photo.src}` : "";
  const caption = item ? photoCaption(item.photo) : null;

  return (
    <div className="photo-modal" onClick={onClose}>
      <button className="photo-modal__close" onClick={onClose} aria-label="Close">
        ✕
      </button>
      {items.length > 1 && (
        <>
          <button
            className="photo-modal__nav photo-modal__nav--prev"
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            disabled={index === 0}
            aria-label="Previous photo"
          >
            ‹
          </button>
          <button
            className="photo-modal__nav photo-modal__nav--next"
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            disabled={index === items.length - 1}
            aria-label="Next photo"
          >
            ›
          </button>
        </>
      )}
      <img
        src={src}
        alt={caption ?? ""}
        className="photo-modal__img"
        style={{ transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})` }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onDoubleClick={(e) => {
          e.stopPropagation();
          scale > 1 ? resetZoom() : setScale(2.5);
        }}
      />
      {item && (
        <div className="photo-modal__info" onClick={(e) => e.stopPropagation()}>
          <div className="photo-modal__label">
            {item.label}
            {items.length > 1 && (
              <span className="photo-modal__counter">
                {index + 1} / {items.length}
              </span>
            )}
          </div>
          {caption && <div className="photo-modal__caption">{caption}</div>}
        </div>
      )}
    </div>
  );
}
