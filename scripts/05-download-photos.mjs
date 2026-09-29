// Step 5: download every route photo, resize/re-encode to keep the offline PWA bundle
// a reasonable size, and write final data/routes.json consumed by the app.
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const IN = new URL("../data/routes.translated.json", import.meta.url);
const OUT = new URL("../data/routes.json", import.meta.url);
const PHOTOS_DIR = new URL("../public/photos/", import.meta.url);

const routes = JSON.parse(await fs.readFile(IN, "utf8"));

await fs.mkdir(PHOTOS_DIR, { recursive: true });

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function downloadAndResize(url, destPath) {
  try {
    await fs.access(destPath);
    return true; // already downloaded in a previous run
  } catch {
    /* need to fetch */
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      await sharp(buf)
        .rotate() // respect EXIF orientation
        .resize({ width: 1280, withoutEnlargement: true })
        .webp({ quality: 72 })
        .toFile(destPath);
      return true;
    } catch (e) {
      console.warn(`  retry ${url}: ${e.message}`);
      await sleep(1000 * (attempt + 1));
    }
  }
  return false;
}

const out = [];
for (const [i, route] of routes.entries()) {
  const dir = new URL(`${route.slug}/`, PHOTOS_DIR);
  await fs.mkdir(dir, { recursive: true });
  const localPhotos = [];
  for (const [j, imgUrl] of route.images.entries()) {
    const filename = `${String(j + 1).padStart(2, "0")}.webp`;
    const destPath = path.join(dir.pathname, filename);
    const ok = await downloadAndResize(imgUrl, destPath);
    if (ok) localPhotos.push(`photos/${route.slug}/${filename}`);
  }
  const { images, ...rest } = route;
  out.push({ ...rest, photos: localPhotos });
  console.log(`[${i + 1}/${routes.length}] ${route.title}: ${localPhotos.length}/${route.images.length} photos`);
}

await fs.writeFile(OUT, JSON.stringify(out, null, 2));
console.log(`Wrote ${OUT.pathname}`);
