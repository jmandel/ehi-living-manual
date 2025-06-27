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

// Clean the docs folder (but keep the content config)
const docsDir = join(process.cwd(), 'src/content/docs');
if (existsSync(docsDir)) {
  console.log('📁 Cleaning docs folder...');
  const files = execSync(`find ${docsDir} -name "*.mdx" -o -name "*.md"`).toString().trim().split('\n');
  files.forEach(file => {
    if (file && existsSync(file)) {
      rmSync(file);
    }
  });
}

// Run the chapter conversion
console.log('📝 Converting chapters to MDX...');
execSync('bun run scripts/convert-chapters-to-mdx.ts', { stdio: 'inherit' });

// Create an index.mdx file for the home page
console.log('🏠 Creating home page...');
const indexContent = `---
title: "Epic EHI Missing Manual"
description: "The definitive guide to Epic's Electronic Health Information export format"
---

import { Card, CardGrid } from '@astrojs/starlight/components';

# Welcome to the Epic EHI Missing Manual

This is your comprehensive guide to understanding and working with Epic's Electronic Health Information (EHI) export format.

## What You'll Learn

<CardGrid stagger>
  <Card title="Core Concepts" icon="open-book">
    Master Epic's data model, naming conventions, and the three-tier architecture.
  </Card>
  <Card title="Interactive SQL" icon="terminal">
    Run live SQL queries directly in your browser against a sample dataset.
  </Card>
  <Card title="Real Patterns" icon="puzzle">
    Learn practical patterns for joining tables and navigating relationships.
  </Card>
  <Card title="Best Practices" icon="rocket">
    Discover optimization techniques and common pitfalls to avoid.
  </Card>
</CardGrid>

## Quick Start

Ready to dive in? Start with [Read Me First](/0.1-read-me-first/) for essential context, then take the [Five Minute Test Drive](/0.2-five-minute-test-drive/) to see the most important tables in action.

## Interactive Learning

This entire manual is interactive. Every SQL example can be edited and run in your browser:
- ✏️ Edit queries to experiment
- ▶️ Run with Ctrl+Enter
- 🔄 Reset to original
- 💾 Everything runs locally in your browser

## About This Manual

This guide fills the gaps left by official documentation, providing the context and patterns you need to be productive with Epic EHI data. Whether you're working with your personal health records or integrating enterprise-scale exports, you'll find practical guidance here.
`;

import { writeFileSync } from 'fs';
writeFileSync(join(docsDir, 'index.mdx'), indexContent);

console.log('✅ Pre-build tasks complete!');