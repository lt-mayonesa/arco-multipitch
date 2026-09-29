import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import type { Route } from "../types";
import { GradeBadge } from "./GradeBadge";
import "leaflet/dist/leaflet.css";
import "../lib/leafletIconFix";

interface Props {
  routes: Route[];
  onOpen: (slug: string) => void;
}

// Roughly centers the Sarca valley / Arco climbing area.
const DEFAULT_CENTER: [number, number] = [45.93, 10.93];

export function MapView({ routes, onOpen }: Props) {
  const withLocation = routes.filter((r) => r.location);

  return (
    <div className="map-view">
      <MapContainer center={DEFAULT_CENTER} zoom={11} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {withLocation.map((r) => (
          <Marker key={r.id} position={[r.location!.lat, r.location!.lon]}>
            <Popup>
              <div className="map-popup">
                <strong>{r.title}</strong>
                <div>{r.crag}</div>
                <div className="map-popup__meta">
                  <GradeBadge french={r.overallGradeFrench} raw={r.overallGradeRaw} size="sm" />
                  <span>{r.numPitches}p · {r.totalLengthM}m</span>
                </div>
                <button onClick={() => onOpen(r.slug)}>Open details</button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <p className="map-view__note">
        Map tiles need a connection; route details still work offline once visited.
      </p>
    </div>
  );
}
