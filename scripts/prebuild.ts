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

// Clean the docs folder (but keep the content config and playground)
const docsDir = join(process.cwd(), 'src/content/docs');
if (existsSync(docsDir)) {
  console.log('📁 Cleaning docs folder...');
  const files = execSync(`find ${docsDir} -name "*.mdx" -o -name "*.md"`).toString().trim().split('\n');
  files.forEach(file => {
    if (file && existsSync(file)) {
      // Don't delete playground.mdx, index.mdx, or other non-chapter files
      const filename = file.split('/').pop();
      if (filename !== 'playground.mdx' && filename !== 'index.mdx') {
        rmSync(file);
      }
    }
  });
}

// Run the chapter conversion
console.log('📝 Converting chapters to MDX...');
execSync('bun run scripts/convert-chapters-to-mdx.ts', { stdio: 'inherit' });

console.log('✅ Pre-build tasks complete!');