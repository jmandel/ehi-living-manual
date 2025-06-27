import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { cwd } from 'process';

interface ChapterInfo {
  filename: string;
  number: string;
  slug: string;
  title: string;
}

function parseChapterInfo(filename: string): ChapterInfo {
  // Extract number and slug from filename like "00.1-read-me-first.md"
  const match = filename.match(/^(\d+\.\d+)-(.+)\.md$/);
  if (!match) throw new Error(`Invalid filename format: ${filename}`);
  
  const [_, number, slug] = match;
  
  // Convert slug to title
  const title = slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  return { filename, number, slug, title: `${number} ${title}` };
}

async function extractTitle(content: string): Promise<string> {
  // Extract the actual title from the markdown content
  const lines = content.split('\n');
  
  // Find the first heading line
  for (const line of lines) {
    if (line.startsWith('#')) {
      // Remove the # prefix and "Chapter X.X: " prefix if present
      return line
        .replace(/^#+\s*/, '')
        .replace(/^Chapter\s+\d+\.\d+:\s*/i, '')
        .trim();
    }
  }
  
  // Fallback to filename-based title
  return '';
}

async function extractDescription(content: string): Promise<string> {
  // Try to find the first paragraph after the title
  const lines = content.split('\n');
  
  // Skip title and empty lines
  let i = 0;
  while (i < lines.length && (lines[i].startsWith('#') || lines[i].trim() === '')) {
    i++;
  }
  
  // Look for description in italics
  if (i < lines.length && lines[i].startsWith('*Purpose:')) {
    return lines[i].replace(/^\*Purpose:\s*/, '').replace(/\*$/, '').trim();
  }
  
  // Otherwise use first non-empty line
  while (i < lines.length && lines[i].trim() === '') i++;
  if (i < lines.length) {
    let desc = lines[i].trim();
    // Truncate at word boundary if too long
    if (desc.length > 150) {
      desc = desc.substring(0, 150);
      const lastSpace = desc.lastIndexOf(' ');
      if (lastSpace > 100) {
        desc = desc.substring(0, lastSpace) + '...';
      }
    }
    return desc;
  }
  
  return 'Learn about ' + parseChapterInfo(content).title;
}

async function convertChapterToMdx(sourcePath: string, destPath: string) {
  const content = await readFile(sourcePath, 'utf-8');
  const filename = sourcePath.split('/').pop()!;
  const info = parseChapterInfo(filename);
  const extractedTitle = await extractTitle(content);
  const description = await extractDescription(content);
  
  // Use the extracted title if available, otherwise fall back to the parsed title
  const finalTitle = extractedTitle || info.title;
  
  let queryCounter = 0;
  let mermaidCounter = 0;
  
  // Convert SQL widget placeholders
  let mdxContent = content
    // Remove the markdown title since it'll be in frontmatter
    .replace(/^#\s+Chapter\s+\d+\.\d+:.*\n/, '')
    // Convert {{query-N}} to <SQLWidget queryId="chapter-N" />
    .replace(/\{\{query-(\d+)\}\}/g, (match, num) => {
      return `<SQLWidget queryId="${info.number}-${info.slug}-${num}" />`;
    })
    // Convert <example-query> blocks to SQLWidget components
    .replace(/<example-query[^>]*>[\s\S]*?<\/example-query>/g, (match) => {
      const widgetId = `${info.number}-${info.slug}-${queryCounter}`;
      queryCounter++;
      return `<SQLWidget queryId="${widgetId}" />`;
    })
    // Convert mermaid code blocks to MermaidDiagram components
    .replace(/```mermaid\n([\s\S]*?)```/g, (match, diagram) => {
      const mermaidId = `${info.slug}-diagram-${mermaidCounter}`;
      mermaidCounter++;
      return `<MermaidDiagram code={\`${diagram.trim()}\`} id="${mermaidId}" />`;
    });
  
  // Escape angle brackets that aren't part of HTML tags or components
  mdxContent = mdxContent
    // Escape standalone < and > that aren't part of tags
    .replace(/(<)(?![A-Za-z\/!])/g, '&lt;')
    .replace(/(?<![A-Za-z\/"])>/g, '&gt;');
  
  // Check if we need additional imports
  const hasMermaid = mdxContent.includes('<MermaidDiagram ');
  const imports = ['import SQLWidget from \'../../components/SQLWidgetStarlight.astro\';'];
  if (hasMermaid) {
    imports.push('import MermaidDiagram from \'../../components/MermaidDiagram.astro\';');
  }
  
  // Escape quotes in title and description for YAML
  const escapeYaml = (str: string) => str.replace(/"/g, '\\"');
  
  // Build the MDX file
  const mdx = `---
title: "${escapeYaml(finalTitle)}"
description: "${escapeYaml(description)}"
---

${imports.join('\n')}

${mdxContent.trim()}
`;
  
  await writeFile(destPath, mdx, 'utf-8');
  console.log(`Converted ${filename} -> ${info.number}-${info.slug}.mdx`);
}

async function main() {
  const chaptersDir = join(cwd(), 'src/chapters');
  const docsDir = join(cwd(), 'src/content/docs');
  
  const files = await readdir(chaptersDir);
  const chapterFiles = files.filter(f => f.endsWith('.md') && /^\d+\.\d+-/.test(f));
  
  console.log(`Found ${chapterFiles.length} chapter files to convert`);
  
  for (const file of chapterFiles) {
    const sourcePath = join(chaptersDir, file);
    const info = parseChapterInfo(file);
    const destPath = join(docsDir, `${info.number}-${info.slug}.mdx`);
    
    try {
      await convertChapterToMdx(sourcePath, destPath);
    } catch (error) {
      console.error(`Error converting ${file}:`, error);
    }
  }
  
  console.log('Conversion complete!');
}

main().catch(console.error);