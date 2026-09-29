import type { Route } from "../types";
import { GradeBadge } from "./GradeBadge";

interface Props {
  route: Route;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onOpen: () => void;
}

export function RouteCard({ route, isFavorite, onToggleFavorite, onOpen }: Props) {
  const cover = route.photos[0];
  return (
    <article className="route-card" onClick={onOpen}>
      {cover ? (
        <img
          className="route-card__thumb"
          src={`${import.meta.env.BASE_URL}${cover}`}
          alt=""
          loading="lazy"
        />
      ) : (
        <div className="route-card__thumb route-card__thumb--placeholder" />
      )}
      <div className="route-card__body">
        <div className="route-card__title-row">
          <h3 className="route-card__title">{route.title}</h3>
          <button
            className={`fav-btn ${isFavorite ? "fav-btn--active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            aria-label={isFavorite ? "Remove from trip list" : "Add to trip list"}
          >
            {isFavorite ? "★" : "☆"}
          </button>
        </div>
        <div className="route-card__crag">{route.crag}</div>
        <div className="route-card__meta">
          <GradeBadge french={route.overallGradeFrench} raw={route.overallGradeRaw} size="sm" />
          <span>{route.numPitches} pitches</span>
          <span>{route.totalLengthM}m</span>
        </div>
      </div>
    </article>
  );
}
