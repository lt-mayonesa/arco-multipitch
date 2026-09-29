import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import type { Route } from "../types";
import { GradeBadge } from "./GradeBadge";
import "leaflet/dist/leaflet.css";
import "../lib/leafletIconFix";

interface Props {
  routes: Route[];
  onOpen: (slug: string) => void;
  selectedSlug?: string | null;
}

// Roughly centers the Sarca valley / Arco climbing area.
const DEFAULT_CENTER: [number, number] = [45.93, 10.93];

function pinIcon(active: boolean) {
  return L.divIcon({
    className: "",
    html: `<div class="map-pin ${active ? "map-pin--active" : ""}"></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -24],
  });
}

function FlyToSelected({ routes, selectedSlug }: { routes: Route[]; selectedSlug?: string | null }) {
  const map = useMap();
  useEffect(() => {
    if (!selectedSlug) return;
    const r = routes.find((x) => x.slug === selectedSlug);
    if (r?.location) {
      map.flyTo([r.location.lat, r.location.lon], Math.max(map.getZoom(), 14), { duration: 0.6 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSlug]);
  return null;
}

export function MapView({ routes, onOpen, selectedSlug }: Props) {
  const withLocation = routes.filter((r) => r.location);

  return (
    <div className="map-view">
      <MapContainer center={DEFAULT_CENTER} zoom={11} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {withLocation.map((r) => (
          <Marker
            key={r.id}
            position={[r.location!.lat, r.location!.lon]}
            icon={pinIcon(r.slug === selectedSlug)}
            eventHandlers={{ click: () => onOpen(r.slug) }}
          >
            <Popup>
              <div className="map-popup">
                <strong>{r.title}</strong>
                <div>{r.crag}</div>
                <div className="map-popup__meta">
                  <GradeBadge french={r.overallGradeFrench} raw={r.overallGradeRaw} size="sm" />
                  <span>
                    {r.numPitches}p · {r.totalLengthM}m
                  </span>
                </div>
                <button onClick={() => onOpen(r.slug)}>Open details</button>
              </div>
            </Popup>
          </Marker>
        ))}
        <FlyToSelected routes={routes} selectedSlug={selectedSlug} />
      </MapContainer>
    </div>
  );
}
