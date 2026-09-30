import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { Route } from "../types";
import { GradeBadge } from "./GradeBadge";
import { PhotoModal } from "./PhotoModal";
import { groupPhotosByPitch, photoCaption } from "../lib/photoGroups";

interface Props {
  route: Route;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClose: () => void;
}

const SUN_LABEL: Record<string, string> = {
  "sunny-mentioned": "☀️ Sun mentioned in the report",
  "shaded-mentioned": "🌑 Shade mentioned in the report",
  "mixed-mentioned": "🌤️ Both sun & shade mentioned",
};

export function RouteDetail({ route, isFavorite, onToggleFavorite, onClose }: Props) {
  const mapsUrl = route.location
    ? `https://www.google.com/maps?q=${route.location.lat},${route.location.lon}`
    : null;
  const photoGroups = useMemo(() => groupPhotosByPitch(route), [route]);
  // Viewer swipes through photos in group order, labelled with their group.
  const viewerItems = useMemo(
    () => photoGroups.flatMap((g) => g.photos.map((photo) => ({ photo, label: g.label }))),
    [photoGroups],
  );
  // Viewer index of each group's first photo.
  const groupStart = useMemo(() => {
    const m = new Map<string, number>();
    let i = 0;
    for (const g of photoGroups) {
      m.set(g.key, i);
      i += g.photos.length;
    }
    return m;
  }, [photoGroups]);
  const [modalIndex, setModalIndex] = useState<number | null>(null);
  const cover = route.photos[0];

  return (
    <div className="route-detail">
      <div className="route-detail__topbar">
        <button className="route-detail__back" onClick={onClose} aria-label="Back to list">
          ←
        </button>
        <h2 className="route-detail__title">{route.title}</h2>
        <button
          className={`fav-btn ${isFavorite ? "fav-btn--active" : ""}`}
          onClick={onToggleFavorite}
          aria-label={isFavorite ? "Remove from trip list" : "Add to trip list"}
        >
          {isFavorite ? "★" : "☆"}
        </button>
      </div>

      <div className="route-detail__scroll" data-sheet-scroll>
        {cover && (
          <img
            className="route-detail__cover"
            src={`${import.meta.env.BASE_URL}${cover.src}`}
            alt={photoCaption(cover) ?? ""}
            onClick={() => setModalIndex(viewerItems.findIndex((i) => i.photo === cover))}
          />
        )}

        <div className="route-detail__body">
          <div className="route-detail__breadcrumb">{route.zoneChain.join(" › ")}</div>

          <div className="route-detail__stats">
            <div className="stat">
              <span className="stat__label">Grade</span>
              <GradeBadge french={route.overallGradeFrench} raw={route.overallGradeRaw} />
            </div>
            <div className="stat">
              <span className="stat__label">Pitches</span>
              <span>{route.numPitches}</span>
            </div>
            <div className="stat">
              <span className="stat__label">Length</span>
              <span>{route.totalLengthM}m</span>
            </div>
          </div>

          {route.approximateData && (
            <p className="route-detail__note">
              ⚠️ This route's pitch-by-pitch data couldn't be fully parsed from the original
              write-up — grade/length may be approximate. See the source link below.
            </p>
          )}

          {route.sunHint.note && <p className="route-detail__sun">{SUN_LABEL[route.sunHint.note]}</p>}

          {mapsUrl && (
            <a className="route-detail__maps-link" href={mapsUrl} target="_blank" rel="noreferrer">
              📍 Open location in Maps
            </a>
          )}

          {route.pitches.length > 0 && (
            <table className="pitch-table">
              <thead>
                <tr>
                  <th>P</th>
                  <th>Length</th>
                  <th>Grade</th>
                  <th aria-label="Photos" />
                </tr>
              </thead>
              <tbody>
                {route.pitches.map((p) => {
                  const photoIndex = groupStart.get(`pitch-${p.pitch}`);
                  return (
                    <tr key={p.pitch}>
                      <td>{p.pitch}</td>
                      <td>{p.lengthM != null ? `${p.lengthM}m` : "—"}</td>
                      <td>
                        <GradeBadge french={p.gradeFrench} raw={p.gradeRaw} size="sm" />
                      </td>
                      <td className="pitch-table__photo">
                        {photoIndex != null && (
                          <button
                            className="pitch-table__photo-btn"
                            onClick={() => setModalIndex(photoIndex)}
                            aria-label={`Photos of pitch ${p.pitch}`}
                          >
                            📷
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {route.introEn && (
            <section className="route-detail__blurb">
              <h4>Trip notes</h4>
              <p>{route.introEn}</p>
            </section>
          )}
          {route.outroEn && (
            <section className="route-detail__blurb">
              <h4>Overall impression</h4>
              <p>{route.outroEn}</p>
            </section>
          )}

          {photoGroups.length > 0 && (
            <div className="route-detail__photo-groups">
              <h4>Photos</h4>
              {photoGroups.map((group) => (
                <div key={group.key} className="photo-group">
                  <div className="photo-group__label">{group.label}</div>
                  <div className="photo-group__row">
                    {group.photos.map((p, j) => {
                      const caption = photoCaption(p);
                      const viewerIndex = groupStart.get(group.key)! + j;
                      return (
                        <figure key={p.src} className="photo-group__item" onClick={() => setModalIndex(viewerIndex)}>
                          <img
                            src={`${import.meta.env.BASE_URL}${p.src}`}
                            alt={caption ?? ""}
                            loading="lazy"
                            className="photo-group__thumb"
                          />
                          {caption && <figcaption className="photo-group__caption">{caption}</figcaption>}
                        </figure>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <a className="route-detail__source" href={route.sourceUrl} target="_blank" rel="noreferrer">
            Source: howtoreachthesky.com ↗
          </a>
        </div>
      </div>

      {/* Portal: the sheet is transformed, which would trap position:fixed children. */}
      {modalIndex != null &&
        createPortal(
          <PhotoModal
            items={viewerItems}
            index={modalIndex}
            onClose={() => setModalIndex(null)}
            onIndexChange={setModalIndex}
          />,
          document.body,
        )}
    </div>
  );
}
