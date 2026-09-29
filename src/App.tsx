import "./App.css";
import { FilterBar } from "./components/FilterBar";
import { MapView } from "./components/MapView";
import { RouteCard } from "./components/RouteCard";
import { RouteDetail } from "./components/RouteDetail";
import { routeBySlug, routes } from "./data/routes";
import { useFavorites } from "./lib/useFavorites";
import { useFilteredRoutes, useFilters } from "./lib/useFilters";
import { useHashRoute } from "./lib/useHashRoute";
import { useResizableSplit, type SnapPoint } from "./lib/useResizableSplit";

// Map/list split, Google-Maps-Android style: drag the handle at the top of the
// sheet to resize. "fraction" is how much of the available height the MAP gets.
const SNAP_POINTS: SnapPoint[] = [
  { key: "full", fraction: 0 }, // sheet fills the screen, map hidden
  { key: "half", fraction: 0.3 }, // default: map ~30% / sheet ~70%
  { key: "peek", fraction: 0.7 }, // mostly map, sheet just peeking
];

function App() {
  const { filters, set, toggleCrag, reset } = useFilters();
  const { isFavorite, toggle, favorites } = useFavorites();
  const filtered = useFilteredRoutes(routes, filters, isFavorite);
  const { selectedSlug, openRoute, closeRoute } = useHashRoute();
  const selectedRoute = selectedSlug ? routeBySlug(selectedSlug) : null;

  const { containerRef, topHeightPx, isDragging, dragHandleProps } = useResizableSplit({
    snapPoints: SNAP_POINTS,
    defaultKey: "half",
  });

  return (
    <div className="app">
      <header className="app__header">
        <h1>Arco Multipitch</h1>
        <button
          className={`app__trip-btn ${filters.favoritesOnly ? "app__trip-btn--active" : ""}`}
          onClick={() => set("favoritesOnly", !filters.favoritesOnly)}
        >
          ★ Trip list · {favorites.size}
        </button>
      </header>

      <div className="app__body" ref={containerRef}>
        <div
          className="app__map"
          style={{ height: topHeightPx, transition: isDragging ? "none" : "height 0.25s ease" }}
        >
          <MapView routes={filtered} onOpen={openRoute} selectedSlug={selectedSlug} />
        </div>

        <div className="app__sheet">
          <div className="app__sheet-handle" {...dragHandleProps}>
            <div className="app__sheet-grip" />
          </div>

          {!selectedRoute && (
            <FilterBar
              filters={filters}
              set={set}
              toggleCrag={toggleCrag}
              reset={reset}
              resultCount={filtered.length}
            />
          )}

          <div className="app__sheet-content">
            {selectedRoute ? (
              <RouteDetail
                route={selectedRoute}
                isFavorite={isFavorite(selectedRoute.slug)}
                onToggleFavorite={() => toggle(selectedRoute.slug)}
                onClose={closeRoute}
              />
            ) : (
              <div className="route-list">
                {filtered.map((r) => (
                  <RouteCard
                    key={r.id}
                    route={r}
                    isFavorite={isFavorite(r.slug)}
                    onToggleFavorite={() => toggle(r.slug)}
                    onOpen={() => openRoute(r.slug)}
                  />
                ))}
                {filtered.length === 0 && (
                  <p className="route-list__empty">No routes match these filters.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
