import { useCallback, useState } from "react";
import "./App.css";
import { FilterBar } from "./components/FilterBar";
import { MapView } from "./components/MapView";
import { RouteCard } from "./components/RouteCard";
import { RouteDetail } from "./components/RouteDetail";
import { routeBySlug, routes } from "./data/routes";
import { useBackStack } from "./lib/useBackStack";
import { useBottomSheet, type SnapKey } from "./lib/useBottomSheet";
import { useFilteredRoutes, useFilters, useMapRoutes } from "./lib/useFilters";
import { useMapGreyOut } from "./lib/useMapGreyOut";
import { routeHash, useHashRoute } from "./lib/useHashRoute";
import { shareTrip } from "./lib/share";
import { useTripList } from "./lib/useTripList";
import { useToast } from "./lib/useToast";
import { Toast } from "./components/Toast";

// Map fills the screen; the sheet slides over it (Google Maps style).
const PEEK_PX = 112; // grip + search row / detail title bar
const HALF_FRACTION = 0.55; // sheet share of the screen at "half"

function App() {
  const trip = useTripList();
  const { isFavorite, toggle, favorites } = trip;
  // A shared trip link opens straight onto the trip's routes.
  const { filters, set, toggleCrag, reset } = useFilters(trip.isShared ? { favoritesOnly: true } : undefined);
  const toast = useToast();
  const onShareTrip = async () => {
    const result = await shareTrip(trip.list.map(routeBySlug).filter((r) => r != null));
    if (result === "copied") toast.show("Trip copied");
    else if (result === "failed") toast.show("Couldn't share the trip");
  };
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
  // Searching/filtering keeps the map in view: only lift a collapsed sheet.
  const reveal = useCallback(() => setSnap((s) => (s === "peek" ? "half" : s)), []);

  // Back button: collapse a fully expanded sheet first, then close the detail.
  useBackStack(!!selectedRoute || snap === "full", routeHash(selectedRoute?.slug ?? null), () => {
    if (snap === "full") setSnap("half");
    else closeRoute();
  }, trip.search);

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
          ★ {trip.isShared ? "Shared trip" : "Trip list"} · {favorites.size}
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
            ["--sheet-visible" as string]: `${visibleHeightAt(snap)}px`,
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
                onRevealRequest={reveal}
              />
              <div className="app__sheet-content" data-sheet-scroll>
                {trip.isShared && (
                  <div className="trip-bar trip-bar--shared">
                    <span className="trip-bar__label">
                      Shared trip · {favorites.size} route{favorites.size === 1 ? "" : "s"}
                    </span>
                    <button className="trip-bar__btn" onClick={trip.leaveShared}>
                      Back to my list
                    </button>
                  </div>
                )}
                {filters.favoritesOnly && favorites.size > 0 && (
                  <div className="trip-bar">
                    <button className="trip-bar__share" onClick={onShareTrip}>
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          d="M12 3v12M7.5 7.5 12 3l4.5 4.5M6 11H5v10h14V11h-1"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Share trip list ({favorites.size})
                    </button>
                  </div>
                )}
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
      <Toast message={toast.message} />
    </div>
  );
}

export default App;
