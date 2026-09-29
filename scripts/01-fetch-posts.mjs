// Step 1: crawl howtoreachthesky.com WordPress REST API for every post under the
// "Multipitch" category tree (and all its nested crag/sector sub-categories),
// and dump raw post JSON + resolved category chains to data/raw-posts.json.
import fs from "node:fs/promises";

const SITE = "https://howtoreachthesky.com";
const ROOT_SLUG = "multipitch";
const OUT = new URL("../data/raw-posts.json", import.meta.url);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJsonSafe(url) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url);
    if (res.status === 400) return null; // WP: past last page
    if (res.status === 429) {
      const wait = 2000 * (attempt + 1);
      console.warn(`429 rate limited, waiting ${wait}ms...`);
      await sleep(wait);
      continue;
    }
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("application/json")) {
      const body = await res.text();
      throw new Error(`Unexpected response (${res.status}) from ${url}: ${body.slice(0, 200)}`);
    }
    return res.json();
  }
  throw new Error(`Giving up after retries: ${url}`);
}

async function fetchAllCategories() {
  const all = [];
  for (let page = 1; ; page++) {
    const batch = await fetchJsonSafe(`${SITE}/wp-json/wp/v2/categories?per_page=100&page=${page}`);
    if (!Array.isArray(batch) || batch.length === 0) break;
    all.push(...batch);
    if (batch.length < 100) break;
    await sleep(300);
  }
  return all;
}

function descendantsOf(rootId, categories) {
  const children = new Map();
  for (const c of categories) {
    if (!children.has(c.parent)) children.set(c.parent, []);
    children.get(c.parent).push(c.id);
  }
  const out = new Set([rootId]);
  const stack = [rootId];
  while (stack.length) {
    const cur = stack.pop();
    for (const ch of children.get(cur) ?? []) {
      if (!out.has(ch)) {
        out.add(ch);
        stack.push(ch);
      }
    }
  }
  return out;
}

async function fetchAllPosts(categoryIds) {
  const ids = [...categoryIds].join(",");
  const posts = [];
  for (let page = 1; ; page++) {
    const url = `${SITE}/wp-json/wp/v2/posts?categories=${ids}&per_page=20&page=${page}&_fields=id,date,slug,link,title,content,categories`;
    const batch = await fetchJsonSafe(url);
    if (!Array.isArray(batch) || batch.length === 0) break;
    posts.push(...batch);
    if (batch.length < 20) break;
    await sleep(500);
  }
  return posts;
}

const categories = await fetchAllCategories();
const byId = new Map(categories.map((c) => [c.id, c]));
const root = categories.find((c) => c.slug === ROOT_SLUG);
if (!root) throw new Error("multipitch category not found");

const descendantIds = descendantsOf(root.id, categories);
console.log(`Found ${descendantIds.size} categories under "${ROOT_SLUG}"`);

const posts = await fetchAllPosts(descendantIds);
console.log(`Fetched ${posts.length} posts`);

// Build a lightweight category lookup for step 2 (id -> {name, slug, parent, chain}).
function chainFor(id) {
  const chain = [];
  let cur = byId.get(id);
  while (cur) {
    chain.unshift({ id: cur.id, name: cur.name, slug: cur.slug });
    cur = byId.get(cur.parent);
  }
  return chain;
}

const categoryIndex = {};
for (const id of descendantIds) {
  categoryIndex[id] = chainFor(id);
}

await fs.mkdir(new URL("../data/", import.meta.url), { recursive: true });
await fs.writeFile(OUT, JSON.stringify({ posts, categoryIndex }, null, 2));
console.log(`Wrote ${OUT.pathname}`);
