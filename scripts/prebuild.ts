#!/usr/bin/env bun

import { execSync } from 'child_process';
import { existsSync, rmSync } from 'fs';
import { join } from 'path';

console.log('🚀 Running pre-build tasks...');

// Check if database exists, generate if not
const dbPath = join(process.cwd(), 'public/assets/data/ehi.sqlite');
if (!existsSync(dbPath)) {
  console.log('🗄️ Database not found, generating ehi.sqlite...');
  execSync('bun run scripts/prepare-sqlite3-db.ts', { stdio: 'inherit' });
} else {
  console.log('✅ Database ehi.sqlite already exists');
}

// Clean generated chapter files from docs folder
const docsDir = join(process.cwd(), 'src/content/docs');
if (existsSync(docsDir)) {
  console.log('📁 Cleaning generated chapter files...');
  // Only delete files matching the chapter patterns: ##-##-*.mdx or ##-intro.mdx (and old format ##.#-*.mdx)
  const files = execSync(`find ${docsDir} -regex ".*/\\([0-9][0-9]\\.[0-9]\\|[0-9][0-9]-[0-9][0-9]\\|[0-9][0-9]-intro\\).*\\.mdx$"`).toString().trim().split('\n');
  files.forEach(file => {
    if (file && existsSync(file)) {
      rmSync(file);
    }
  });
}

// Run the chapter conversion
console.log('📝 Converting chapters to MDX...');
execSync('bun run scripts/convert-chapters-to-mdx.ts', { stdio: 'inherit' });

// Extract and process queries
console.log('🔍 Extracting queries from chapters...');
execSync('bun run scripts/process-all-queries.ts', { stdio: 'inherit' });

console.log('⚙️ Processing queries against database...');
execSync('bun run scripts/process-all-chapter-queries.ts', { stdio: 'inherit' });

console.log('✅ Pre-build tasks complete!');