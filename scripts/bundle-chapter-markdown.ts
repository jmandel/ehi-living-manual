#!/usr/bin/env bun

import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

async function bundleChapterMarkdown() {
  const chaptersDir = join(process.cwd(), 'src/chapters');
  const outputDir = join(process.cwd(), 'src/data');
  const outputFile = join(outputDir, 'chapter-markdown.json');

  // Ensure output directory exists
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true });
  }

  // Read all markdown files
  const files = await readdir(chaptersDir);
  const markdownFiles = files
    .filter(f => f.endsWith('.md') && /^\d{2}(-\d{2}|-intro)/.test(f))
    .sort();

  // Build the content object
  const content: Record<string, string> = {};
  
  for (const file of markdownFiles) {
    const filePath = join(chaptersDir, file);
    const markdown = await readFile(filePath, 'utf-8');
    // Use filename without extension as key
    const key = file.replace('.md', '');
    content[key] = markdown;
  }

  // Write to JSON file
  await writeFile(outputFile, JSON.stringify(content, null, 2));
  
  console.log(`✅ Bundled ${Object.keys(content).length} chapter markdown files to ${outputFile}`);
}

bundleChapterMarkdown().catch(console.error);