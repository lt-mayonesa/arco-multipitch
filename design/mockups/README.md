# UI mockups — review only

Three static, self-contained HTML proposals for the redesigned layout (map
pinned to the top ~30% of the screen at all times, filterable list below,
tapping a route replaces the list with details while the map stays visible).
Built with real route data/photos from the live site. Not wired into the
actual app yet — pure visual/interaction proposals to pick a direction from.

Open `index.html` in a browser for a side-by-side gallery view, or open each
file directly:

- **a-outdoor-dark.html** — Tailwind CSS, dark rugged theme, orange accent
  (closest to today's app, refined)
- **b-clean-light.html** — Tailwind CSS, light "map app" look (Google Maps /
  AllTrails style), blue accent
- **c-native-ios.html** — iOS system look (large-title search, segmented
  control, grouped list, sheet transition). In the real app this style would
  be implemented with [Konsta UI](https://konstaui.com/) rather than
  hand-rolled Tailwind, since Konsta needs a build step and can't run from a
  plain CDN `<script>` tag the way Tailwind's Play CDN can for this mockup.

All three: tap a route card (or a map pin's popup button) to open details;
the map pans/highlights the matching pin and stays visible the whole time;
back button returns to the list.
