import { useState } from "react";
import "./App.css";
import { FilterBar } from "./components/FilterBar";
import { MapView } from "./components/MapView";
import { RouteCard } from "./components/RouteCard";
import { RouteDetail } from "./components/RouteDetail";
import { routeBySlug, routes } from "./data/routes";
import { useFavorites } from "./lib/useFavorites";
import { useFilteredRoutes, useFilters } from "./lib/useFilters";
import { useHashRoute } from "./lib/useHashRoute";

type Tab = "list" | "map";

function App() {
  const [tab, setTab] = useState<Tab>("list");
  const { filters, set, toggleCrag, reset } = useFilters();
  const { isFavorite, toggle } = useFavorites();
  const filtered = useFilteredRoutes(routes, filters, isFavorite);
  const { selectedSlug, openRoute, closeRoute } = useHashRoute();
  const selectedRoute = selectedSlug ? routeBySlug(selectedSlug) : null;

  return (
    <div className="app">
      <header className="app__header">
        <h1>Arco Multipitch</h1>
        <p className="app__subtitle">Trip crib sheet · from howtoreachthesky.com</p>
      </header>

      <FilterBar
        filters={filters}
        set={set}
        toggleCrag={toggleCrag}
        reset={reset}
        resultCount={filtered.length}
      />

      <main className="app__main">
        {tab === "list" ? (
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
            {filtered.length === 0 && <p className="route-list__empty">No routes match these filters.</p>}
          </div>
        ) : (
          <MapView routes={filtered} onOpen={openRoute} />
        )}
      </main>

      <nav className="app__tabs">
        <button className={tab === "list" ? "active" : ""} onClick={() => setTab("list")}>
          📋 List
        </button>
        <button className={tab === "map" ? "active" : ""} onClick={() => setTab("map")}>
          🗺️ Map
        </button>
      </nav>

      {selectedRoute && (
        <RouteDetail
          route={selectedRoute}
          isFavorite={isFavorite(selectedRoute.slug)}
          onToggleFavorite={() => toggle(selectedRoute.slug)}
          onClose={closeRoute}
        />
      )}
    </div>
  );
}

export default App;
