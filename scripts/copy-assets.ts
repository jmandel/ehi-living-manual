import { $ } from "bun";
import { exists } from "node:fs/promises";

export async function copyStaticAssets() {
  // Copy CSS files
  if (await exists("src/assets/css")) {
    await $`cp -r src/assets/css/* dist/assets/css/`;
  }
  
  // Copy JavaScript files
  if (await exists("src/assets/js")) {
    await $`cp -r src/assets/js/* dist/assets/js/`;
  }
  
  // Copy SQLite database
  await $`cp src/data/ehi.sqlite dist/assets/data/`;
  
  // Download and copy SQL.js WASM files
  console.log("📥 Downloading SQL.js WASM files...");
  
  const sqlJsVersion = "1.8.0";
  const sqlJsFiles = [
    "sql-wasm.js",
    "sql-wasm.wasm"
  ];
  
  await $`mkdir -p dist/lib/sql.js`;
  
  for (const file of sqlJsFiles) {
    const url = `https://cdnjs.cloudflare.com/ajax/libs/sql.js/${sqlJsVersion}/${file}`;
    await $`curl -L ${url} -o dist/lib/sql.js/${file}`;
  }
  
  // Download Fuse.js for search functionality
  console.log("📥 Downloading Fuse.js...");
  const fuseVersion = "6.6.2";
  await $`curl -L https://cdn.jsdelivr.net/npm/fuse.js@${fuseVersion}/dist/fuse.min.js -o dist/lib/fuse.min.js`;
  
  // Copy any additional static files (favicon, etc.)
  if (await exists("src/assets/favicon.ico")) {
    await $`cp src/assets/favicon.ico dist/`;
  }
}