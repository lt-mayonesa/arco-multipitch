// Leaflet setup shared by the map:
// - Vite doesn't resolve Leaflet's default marker image URLs automatically;
//   wire them up explicitly so pins render in dev and on GitHub Pages.
// - leaflet.markercluster is a UMD plugin that patches the global `L`, so make
//   sure it exists before the plugin module is evaluated (see leafletPlugins.ts).
import L from "leaflet";
import marker from "leaflet/dist/images/marker-icon.png";
import marker2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconUrl: marker,
  iconRetinaUrl: marker2x,
  shadowUrl: markerShadow,
});

(window as unknown as { L: typeof L }).L = L;
