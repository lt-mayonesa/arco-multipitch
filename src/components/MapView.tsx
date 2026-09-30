import "../lib/leafletPlugins";
import L from "leaflet";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AttributionControl, Circle, CircleMarker, MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import type { Route } from "../types";

interface Props {
  routes: Route[];
  selectedRoute: Route | null;
  onOpen: (slug: string) => void;
  /** Px at the bottom of the map covered by the sheet; used to frame pins in the visible area. */
  bottomInset: number;
}

// Roughly centers the Sarca valley / Arco climbing area.
const DEFAULT_CENTER: [number, number] = [45.93, 10.93];
const SELECT_ZOOM = 14;

// The pin is a rotated rounded square; its tip sits ~18px below the icon
// centre (26 * sqrt(2) / 2), scaled 1.3x when active.
const pinIcon = (active: boolean) =>
  L.divIcon({
    className: "",
    html: `<div class="map-pin ${active ? "map-pin--active" : ""}"></div>`,
    iconSize: [26, 26],
    iconAnchor: active ? [13, 37] : [13, 31],
  });
const PIN = pinIcon(false);
const PIN_ACTIVE = pinIcon(true);

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

function ClusteredPins({ routes, selectedSlug, onOpen }: { routes: Route[]; selectedSlug: string | null; onOpen: (slug: string) => void }) {
  const map = useMap();
  const onOpenRef = useLatest(onOpen);
  const [group] = useState(() =>
    L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 45,
      spiderfyDistanceMultiplier: 1.8,
      iconCreateFunction: (cluster) =>
        L.divIcon({
          className: "",
          html: `<div class="map-cluster">${cluster.getChildCount()}</div>`,
          iconSize: [36, 36],
        }),
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
        .map((r) =>
          L.marker([r.location!.lat, r.location!.lon], { icon: PIN, title: r.title, riseOnHover: true }).on(
            "click",
            () => onOpenRef.current(r.slug),
          ),
        ),
    );
  }, [group, routes, selectedSlug, onOpenRef]);

  return null;
}

/** Fit to the filtered routes when the filter result changes, fly to the selected route. */
function ViewController({ routes, selectedRoute, bottomInset }: Omit<Props, "onOpen">) {
  const map = useMap();
  const insetRef = useLatest(bottomInset);
  const selectedRef = useLatest(selectedRoute);
  const ready = bottomInset > 0;
  const routesKey = routes.map((r) => r.slug).join("|");

  useEffect(() => {
    if (!ready || selectedRef.current) return;
    const pts = routes.filter((r) => r.location).map((r) => L.latLng(r.location!.lat, r.location!.lon));
    if (pts.length === 0) return;
    // Debounced so typing in the search box doesn't queue a zoom per keystroke.
    const id = window.setTimeout(() => {
      map.fitBounds(L.latLngBounds(pts), {
        paddingTopLeft: [40, 40],
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

export function MapView({ routes, selectedRoute, onOpen, bottomInset }: Props) {
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
        <ClusteredPins routes={routes} selectedSlug={selectedRoute?.slug ?? null} onOpen={onOpen} />
        {selectedRoute?.location && (
          <Marker
            position={[selectedRoute.location.lat, selectedRoute.location.lon]}
            icon={PIN_ACTIVE}
            zIndexOffset={1000}
            title={selectedRoute.title}
          />
        )}
        <ViewController routes={routes} selectedRoute={selectedRoute} bottomInset={bottomInset} />
        <LocateControl bottomInset={bottomInset} />
      </MapContainer>
    </div>
  );
}
