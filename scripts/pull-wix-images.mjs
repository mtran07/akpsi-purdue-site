// Copies every Wix-hosted photo referenced in src/data/*.json into public/images,
// then rewrites the JSON to point at the local copy.
//
// Run before the Wix plan is cancelled (Dec 21):  npm run images:pull
// Afterwards, remove the static.wixstatic.com entry from next.config.ts.

import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.resolve("src/data");
const OUT_DIR = path.resolve("public/images/wix");
const WIX = /https:\/\/static\.wixstatic\.com\/media\/[^"]+/g;

await mkdir(OUT_DIR, { recursive: true });

let downloaded = 0;
for (const file of await readdir(DATA_DIR)) {
  if (!file.endsWith(".json")) continue;
  const filePath = path.join(DATA_DIR, file);
  let text = await readFile(filePath, "utf8");
  const urls = [...new Set(text.match(WIX) ?? [])];

  for (const url of urls) {
    const name = decodeURIComponent(url.split("/").pop()).replace(/~mv2/, "");
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`✗ ${url} (${res.status})`);
      continue;
    }
    await writeFile(path.join(OUT_DIR, name), Buffer.from(await res.arrayBuffer()));
    text = text.replaceAll(url, `/images/wix/${name}`);
    downloaded++;
    console.log(`✓ ${name}`);
  }

  if (urls.length) await writeFile(filePath, text);
}

console.log(`\nDone: ${downloaded} image(s) saved to public/images/wix.`);
