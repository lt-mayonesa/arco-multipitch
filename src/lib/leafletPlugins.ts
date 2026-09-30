// Import order matters: leafletIconFix sets window.L, which the markercluster
// UMD bundle reads at evaluation time.
import "./leafletIconFix";
import "leaflet.markercluster";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
