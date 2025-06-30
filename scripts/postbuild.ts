#!/usr/bin/env bun

import { existsSync, renameSync, mkdirSync } from 'fs';
import { join } from 'path';

console.log('📦 Running post-build tasks...');

const distDir = join(process.cwd(), 'dist');
const tempDir = join(process.cwd(), 'dist-temp');
const finalDir = join(process.cwd(), 'dist-final');

// Check if dist exists
if (!existsSync(distDir)) {
  console.error('❌ No dist directory found. Run build first.');
  process.exit(1);
}

console.log('🚚 Restructuring dist directory...');

// Rename current dist to temp
renameSync(distDir, tempDir);

// Create new dist structure
mkdirSync(finalDir, { recursive: true });
mkdirSync(join(finalDir, 'ehi-living-manual'), { recursive: true });

// Move temp contents into the subdirectory
renameSync(tempDir, join(finalDir, 'ehi-living-manual'));

// Rename final back to dist
renameSync(finalDir, distDir);

console.log('✅ Build output restructured to dist/ehi-living-manual/');
console.log('🚀 You can now test with: bun x http-server dist');
