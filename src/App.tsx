import { useCallback, useState } from "react";
import "./App.css";
import { FilterBar } from "./components/FilterBar";
import { MapView } from "./components/MapView";
import { RouteCard } from "./components/RouteCard";
import { RouteDetail } from "./components/RouteDetail";
import { routeBySlug, routes } from "./data/routes";
import { useBackStack } from "./lib/useBackStack";
import { useBottomSheet, type SnapKey } from "./lib/useBottomSheet";
import { useFavorites } from "./lib/useFavorites";
import { useFilteredRoutes, useFilters, useMapRoutes } from "./lib/useFilters";
import { useMapGreyOut } from "./lib/useMapGreyOut";
import { routeHash, useHashRoute } from "./lib/useHashRoute";

// Map fills the screen; the sheet slides over it (Google Maps style).
const PEEK_PX = 112; // grip + search row / detail title bar
const HALF_FRACTION = 0.55; // sheet share of the screen at "half"

function App() {
  const { filters, set, toggleCrag, reset } = useFilters();
  const { isFavorite, toggle, favorites } = useFavorites();
  const filtered = useFilteredRoutes(routes, filters, isFavorite);
  const [greyOut, setGreyOut] = useMapGreyOut();
  const { mapRoutes, matchSlugs } = useMapRoutes(routes, filtered, filters, isFavorite, greyOut);
  const { selectedSlug, openRoute, closeRoute } = useHashRoute();
  const selectedRoute = (selectedSlug && routeBySlug(selectedSlug)) || null;

  const [snap, setSnap] = useState<SnapKey>("half");
  const { containerRef, sheetRef, containerHeight, offsetPx, visibleHeightAt, isDragging, sheetProps, onGripClick } =
    useBottomSheet({ snap, onSnapChange: setSnap, peekPx: PEEK_PX, halfFraction: HALF_FRACTION });

  const open = useCallback(
    (slug: string) => {
      openRoute(slug);
      setSnap("half");
    },
    [openRoute],
  );
  const expand = useCallback(() => setSnap("full"), []);

  // Back button: collapse a fully expanded sheet first, then close the detail.
  useBackStack(!!selectedRoute || snap === "full", routeHash(selectedRoute?.slug ?? null), () => {
    if (snap === "full") setSnap("half");
    else closeRoute();
  });

  // Frame pins above the sheet, but never assume more than "half" coverage so
  // the view still makes sense when the user collapses a full sheet.
  const bottomInset = Math.min(visibleHeightAt(snap), visibleHeightAt("half"));

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
        <div className="app__map">
          <MapView
            routes={mapRoutes}
            matchSlugs={matchSlugs}
            selectedRoute={selectedRoute} onOpen={open} bottomInset={bottomInset} />
        </div>

        <div
          ref={sheetRef}
          className={`app__sheet app__sheet--${snap} ${isDragging ? "app__sheet--dragging" : ""}`}
          style={{
            transform: `translate3d(0, ${offsetPx}px, 0)`,
            visibility: containerHeight ? "visible" : "hidden",
          }}
          {...sheetProps}
        >
          <button
            type="button"
            className="app__sheet-handle"
            data-sheet-grip
            onClick={onGripClick}
            aria-label={snap === "full" ? "Collapse panel" : "Expand panel"}
          >
            <span className="app__sheet-grip" />
          </button>

          {selectedRoute ? (
            <div className="app__sheet-content app__sheet-content--static">
              <RouteDetail
                key={selectedRoute.slug}
                route={selectedRoute}
                isFavorite={isFavorite(selectedRoute.slug)}
                onToggleFavorite={() => toggle(selectedRoute.slug)}
                onClose={closeRoute}
              />
            </div>
          ) : (
            <>
              <FilterBar
                filters={filters}
                set={set}
                toggleCrag={toggleCrag}
                reset={reset}
                greyOut={greyOut}
                onGreyOutChange={setGreyOut}
                resultCount={filtered.length}
                onExpandRequest={expand}
              />
              <div className="app__sheet-content" data-sheet-scroll>
                <div className="route-list">
                  {filtered.map((r) => (
                    <RouteCard
                      key={r.id}
                      route={r}
                      isFavorite={isFavorite(r.slug)}
                      onToggleFavorite={() => toggle(r.slug)}
                      onOpen={() => open(r.slug)}
                    />
                  ))}
                  {filtered.length === 0 && <p className="route-list__empty">No routes match these filters.</p>}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
