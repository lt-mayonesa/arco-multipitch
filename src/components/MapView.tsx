import "../lib/leafletPlugins";
import L from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AttributionControl, Circle, CircleMarker, MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import type { GearStyle, Route } from "../types";

interface Props {
  /** Routes drawn on the map (matching + greyed-out). */
  routes: Route[];
  /** Slugs that pass every filter; other routes in `routes` are drawn greyed out. */
  matchSlugs: Set<string>;
  selectedRoute: Route | null;
  onOpen: (slug: string) => void;
  /** Px at the bottom of the map covered by the sheet; used to frame pins in the visible area. */
  bottomInset: number;
}

// Roughly centers the Sarca valley / Arco climbing area.
const DEFAULT_CENTER: [number, number] = [45.93, 10.93];
const SELECT_ZOOM = 14;

// Crag-level zoom from which pins show their "pitches · length" chip.
const LABEL_ZOOM = 13;

const escapeHtml = (t: string) =>
  t.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** e.g. "7p · 250m"; "~" marks approximate data, "?m" an unknown length. */
function chipText(r: Route) {
  const approx = r.approximateData ? "~" : "";
  const len = r.totalLengthM > 0 ? `${approx}${r.totalLengthM}m` : "?m";
  return `${approx}${r.numPitches}p · ${len}`;
}

// Map colours only distinguish bolted vs trad; runout is a detail of bolted
// routes, shown in the list/detail only.
type GearKey = GearStyle | "unknown";
const gearKey = (r: Route): GearKey => r.gear.style ?? "unknown";

// The pin is a 30px rounded square rotated 45°; its tip sits ~21px below the
// icon centre (30 * sqrt(2) / 2), ~28px when the active pin is scaled 1.3x.
function pinIcon(r: Route, { active = false, dim = false } = {}) {
  const cls = ["map-pin", `map-pin--${gearKey(r)}`, active && "map-pin--active", dim && "map-pin--dim"]
    .filter(Boolean)
    .join(" ");
  return L.divIcon({
    className: "",
    html:
      `<div class="${cls}"><div class="map-pin__shape"></div>` +
      `<span class="map-pin__grade">${escapeHtml(r.overallGradeFrench ?? r.overallGradeRaw ?? "?")}</span>` +
      `<span class="map-pin__chip">${escapeHtml(chipText(r))}</span></div>`,
    iconSize: [30, 30],
    iconAnchor: active ? [15, 43] : [15, 36],
  });
}

// Cluster ring: one arc per gear level for matching routes, then grey for the rest.
const RING_ORDER: GearKey[] = ["trad", "bolted", "unknown"];
const RING_COLOR: Record<GearKey | "dim", string> = {
  trad: "var(--trad)",
  bolted: "var(--accent)",
  unknown: "var(--text-dim)",
  dim: "#4a4f59",
};

interface PinMeta {
  gear: GearKey;
  match: boolean;
}

function clusterIcon(cluster: L.MarkerCluster) {
  const metas = cluster.getAllChildMarkers().map((m) => (m.options as { meta: PinMeta }).meta);
  const total = metas.length;
  const counts = new Map<GearKey | "dim", number>();
  for (const { gear, match } of metas) {
    const k = match ? gear : "dim";
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const matches = total - (counts.get("dim") ?? 0);
  let acc = 0;
  const stops = [...RING_ORDER, "dim" as const]
    .filter((k) => counts.get(k))
    .map((k) => {
      const from = (acc / total) * 360;
      acc += counts.get(k)!;
      return `${RING_COLOR[k]} ${from}deg ${(acc / total) * 360}deg`;
    });
  const label = matches === total ? `${total}` : `${matches}/${total}`;
  return L.divIcon({
    className: "",
    html:
      `<div class="map-cluster ${matches === 0 ? "map-cluster--dim" : ""}" ` +
      `style="background: conic-gradient(${stops.join(", ")})"><span>${label}</span></div>`,
    iconSize: [42, 42],
  });
}

/** Always-on colour key, top-right under the attribution (bottom corners sit under the sheet). */
function Legend({ showFiltered }: { showFiltered: boolean }) {
  const map = useMap();
  const [container] = useState(() => L.DomUtil.create("div", "leaflet-control map-legend"));
  useEffect(() => {
    const control = new (L.Control.extend({ onAdd: () => container }))({ position: "topright" });
    control.addTo(map);
    L.DomEvent.disableClickPropagation(container);
    return () => {
      control.remove();
    };
  }, [map, container]);
  return createPortal(
    <>
      <span className="map-legend__item">
        <i className="map-legend__dot map-legend__dot--bolted" />
        Bolted
      </span>
      <span className="map-legend__item">
        <i className="map-legend__dot map-legend__dot--trad" />
        Trad
      </span>
      <span className="map-legend__item">
        <i className="map-legend__dot map-legend__dot--unknown" />
        Unknown
      </span>
      {showFiltered && (
        <span className="map-legend__item">
          <i className="map-legend__dot map-legend__dot--dim" />
          Filtered out
        </span>
      )}
    </>,
    container,
  );
}

/** Toggles the chip labels on the map container by zoom level. */
function LabelZoomClass() {
  const map = useMap();
  useEffect(() => {
    const update = () => map.getContainer().classList.toggle("map-view--labels", map.getZoom() >= LABEL_ZOOM);
    update();
    map.on("zoomend", update);
    return () => {
      map.off("zoomend", update);
    };
  }, [map]);
  return null;
}

/** Map centre that puts `latlng` in the middle of the part of the map not covered by the sheet. */
function centerAbove(map: L.Map, latlng: L.LatLngExpression, zoom: number, inset: number) {
  return map.unproject(map.project(latlng, zoom).add([0, inset / 2]), zoom);
}

function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}

/** Leaflet only measures its container on init; keep it in sync (orientation, keyboard, etc). */
function InvalidateOnResize() {
  const map = useMap();
  useEffect(() => {
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(map.getContainer());
    return () => ro.disconnect();
  }, [map]);
  return null;
}

function ClusteredPins({
  routes,
  matchSlugs,
  selectedSlug,
  onOpen,
}: {
  routes: Route[];
  matchSlugs: Set<string>;
  selectedSlug: string | null;
  onOpen: (slug: string) => void;
}) {
  const map = useMap();
  const onOpenRef = useLatest(onOpen);
  const [group] = useState(() =>
    L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 45,
      spiderfyDistanceMultiplier: 1.8,
      iconCreateFunction: clusterIcon,
    }),
  );

  useEffect(() => {
    map.addLayer(group);
    return () => {
      map.removeLayer(group);
    };
  }, [map, group]);

  useEffect(() => {
    group.clearLayers();
    group.addLayers(
      routes
        .filter((r) => r.location && r.slug !== selectedSlug)
        .map((r) => {
          const match = matchSlugs.has(r.slug);
          const meta: PinMeta = { gear: gearKey(r), match };
          return L.marker([r.location!.lat, r.location!.lon], {
            icon: pinIcon(r, { dim: !match }),
            title: r.title,
            riseOnHover: true,
            // Greyed-out pins stay below matching ones.
            zIndexOffset: match ? 0 : -1000,
            meta,
          } as L.MarkerOptions).on("click", () => onOpenRef.current(r.slug));
        }),
    );
  }, [group, routes, matchSlugs, selectedSlug, onOpenRef]);

  return null;
}

/** Fit to the filtered routes when the filter result changes, fly to the selected route. */
function ViewController({ routes, matchSlugs, selectedRoute, bottomInset }: Omit<Props, "onOpen">) {
  const map = useMap();
  // Frame only matching routes; greyed-out ones may end up off-screen.
  const matching = routes.filter((r) => matchSlugs.has(r.slug));
  const insetRef = useLatest(bottomInset);
  const selectedRef = useLatest(selectedRoute);
  const ready = bottomInset > 0;
  const routesKey = matching.map((r) => r.slug).join("|");

  useEffect(() => {
    if (!ready || selectedRef.current) return;
    const pts = matching.filter((r) => r.location).map((r) => L.latLng(r.location!.lat, r.location!.lon));
    if (pts.length === 0) return;
    // Debounced so typing in the search box doesn't queue a zoom per keystroke.
    const id = window.setTimeout(() => {
      map.fitBounds(L.latLngBounds(pts), {
        // Top padding clears the legend strip.
        paddingTopLeft: [40, 80],
        paddingBottomRight: [40, insetRef.current + 30],
        maxZoom: SELECT_ZOOM,
      });
    }, 250);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routesKey, ready]);

  const selectedSlug = selectedRoute?.slug;
  useEffect(() => {
    const loc = selectedRef.current?.location;
    if (!ready || !loc) return;
    const zoom = Math.max(map.getZoom(), SELECT_ZOOM);
    map.flyTo(centerAbove(map, [loc.lat, loc.lon], zoom, insetRef.current), zoom, { duration: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSlug, ready]);

  return null;
}

function LocateControl({ bottomInset }: { bottomInset: number }) {
  const map = useMap();
  const insetRef = useLatest(bottomInset);
  const [container] = useState(() => L.DomUtil.create("div", "leaflet-bar leaflet-control map-locate"));
  const [pos, setPos] = useState<{ lat: number; lon: number; acc: number } | null>(null);
  const [status, setStatus] = useState<"idle" | "locating">("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const control = new (L.Control.extend({ onAdd: () => container }))({ position: "topleft" });
    control.addTo(map);
    L.DomEvent.disableClickPropagation(container);
    return () => {
      control.remove();
    };
  }, [map, container]);

  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(() => setMessage(null), 3500);
    return () => window.clearTimeout(id);
  }, [message]);

  const locate = () => {
    if (!("geolocation" in navigator)) {
      setMessage("Location not available on this device");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setStatus("idle");
        setPos({ lat: coords.latitude, lon: coords.longitude, acc: coords.accuracy });
        const zoom = Math.max(map.getZoom(), 13);
        map.flyTo(centerAbove(map, [coords.latitude, coords.longitude], zoom, insetRef.current), zoom, {
          duration: 0.6,
        });
      },
      (err) => {
        setStatus("idle");
        setMessage(err.code === err.PERMISSION_DENIED ? "Location permission denied" : "Couldn't get your location");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  };

  return (
    <>
      {createPortal(
        <>
          <a
            href="#"
            role="button"
            className={`map-locate__btn ${status === "locating" ? "map-locate__btn--busy" : ""}`}
            title="Show my location"
            aria-label="Show my location"
            onClick={(e) => {
              e.preventDefault();
              locate();
            }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <circle cx="12" cy="12" r="4" fill="currentColor" />
              <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M12 1v3M12 20v3M1 12h3M20 12h3" stroke="currentColor" strokeWidth="2" />
            </svg>
          </a>
          {message && <div className="map-locate__msg">{message}</div>}
        </>,
        container,
      )}
      {pos && (
        <>
          <Circle
            center={[pos.lat, pos.lon]}
            radius={pos.acc}
            interactive={false}
            pathOptions={{ color: "#3b82f6", weight: 1, fillOpacity: 0.12 }}
          />
          <CircleMarker
            center={[pos.lat, pos.lon]}
            radius={7}
            interactive={false}
            pathOptions={{ color: "#fff", weight: 2, fillColor: "#3b82f6", fillOpacity: 1 }}
          />
        </>
      )}
    </>
  );
}

export function MapView({ routes, matchSlugs, selectedRoute, onOpen, bottomInset }: Props) {
  const activeIcon = useMemo(() => (selectedRoute ? pinIcon(selectedRoute, { active: true }) : null), [selectedRoute]);
  return (
    <div className="map-view">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={11}
        scrollWheelZoom
        attributionControl={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {/* Bottom corners are under the sheet, so keep controls at the top. */}
        <AttributionControl position="topright" prefix={false} />
        <InvalidateOnResize />
        <Legend showFiltered={routes.some((r) => !matchSlugs.has(r.slug))} />
        <LabelZoomClass />
        <ClusteredPins routes={routes} matchSlugs={matchSlugs} selectedSlug={selectedRoute?.slug ?? null} onOpen={onOpen} />
        {selectedRoute?.location && (
          <Marker
            position={[selectedRoute.location.lat, selectedRoute.location.lon]}
            icon={activeIcon!}
            zIndexOffset={1000}
            title={selectedRoute.title}
          />
        )}
        <ViewController routes={routes} matchSlugs={matchSlugs} selectedRoute={selectedRoute} bottomInset={bottomInset} />
        <LocateControl bottomInset={bottomInset} />
      </MapContainer>
    </div>
  );
}
