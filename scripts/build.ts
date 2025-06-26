#!/usr/bin/env bun

import { $ } from "bun";
import { processChapters } from "./process-markdown";
import { generateTableOfContents } from "./generate-toc";
import { copyStaticAssets } from "./copy-assets";
import { buildSearchIndex } from "./build-search-index";

async function build() {
  console.log("🔨 Building Epic EHI Missing Manual...");

  // Clean and create dist directory
  console.log("📁 Cleaning dist directory...");
  await $`rm -rf dist`;
  await $`mkdir -p dist/{chapters,assets/{css,js,data,markdown},lib}`;

  // Process markdown chapters
  console.log("📝 Processing markdown chapters...");
  const chapters = await processChapters();

  // Generate index page with table of contents
  console.log("📚 Generating table of contents...");
  await generateTableOfContents(chapters);

  // Build search index
  console.log("🔍 Building search index...");
  await buildSearchIndex('src/chapters', 'dist/assets/data/search-index.json');

  // Copy static assets
  console.log("📦 Copying static assets...");
  await copyStaticAssets();

  console.log("✅ Build complete! Site generated in dist/");
  console.log("🚀 Run 'bun run serve' to preview the site");
}

// Handle watch mode
const isWatchMode = process.argv.includes("--watch");

if (isWatchMode) {
  console.log("👀 Watch mode enabled...");
  // Initial build
  await build();
  
  // Watch for changes
  const watcher = Bun.watch("src", async (event, filename) => {
    console.log(`\n📝 File changed: ${filename}`);
    await build();
  });
  
  process.on("SIGINT", () => {
    console.log("\n👋 Stopping watch mode...");
    watcher.stop();
    process.exit(0);
  });
} else {
  await build();
}