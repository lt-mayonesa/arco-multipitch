import type { Route } from "../types";
import { GradeBadge } from "./GradeBadge";

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

  return (
    <div className="route-detail-overlay" onClick={onClose}>
      <div className="route-detail" onClick={(e) => e.stopPropagation()}>
        <button className="route-detail__close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <div className="route-detail__header">
          <h2>{route.title}</h2>
          <button
            className={`fav-btn fav-btn--lg ${isFavorite ? "fav-btn--active" : ""}`}
            onClick={onToggleFavorite}
          >
            {isFavorite ? "★ On trip list" : "☆ Add to trip list"}
          </button>
        </div>

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

        {route.sunHint.note && (
          <p className="route-detail__sun">{SUN_LABEL[route.sunHint.note]}</p>
        )}

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
              </tr>
            </thead>
            <tbody>
              {route.pitches.map((p) => (
                <tr key={p.pitch}>
                  <td>{p.pitch}</td>
                  <td>{p.lengthM != null ? `${p.lengthM}m` : "—"}</td>
                  <td>
                    <GradeBadge french={p.gradeFrench} raw={p.gradeRaw} size="sm" />
                  </td>
                </tr>
              ))}
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

        {route.photos.length > 0 && (
          <div className="route-detail__photos">
            {route.photos.map((p) => (
              <img key={p} src={`${import.meta.env.BASE_URL}${p}`} alt="" loading="lazy" />
            ))}
          </div>
        )}

        <a className="route-detail__source" href={route.sourceUrl} target="_blank" rel="noreferrer">
          Source: howtoreachthesky.com ↗
        </a>
      </div>
    </div>
  );
}
