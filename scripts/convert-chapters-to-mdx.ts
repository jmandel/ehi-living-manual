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
  // Extract number and slug from filename like "00-01-read-me-first.md" or "00-intro.md"
  const match = filename.match(/^(\d{2}(?:-\d{2}|-intro))-(.+)\.md$/);
  if (!match) {
    // Try the intro pattern without additional slug
    const introMatch = filename.match(/^(\d{2}-intro)\.md$/);
    if (introMatch) {
      const [_, number] = introMatch;
      const partNum = number.substring(0, 2);
      return { 
        filename, 
        number, 
        slug: 'intro', 
        title: `Part ${parseInt(partNum)} Introduction` 
      };
    }
    throw new Error(`Invalid filename format: ${filename}`);
  }
  
  const [_, number, slug] = match;
  
  // Convert slug to title
  const title = slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  // Format number for display (e.g., "00-01" -> "0.1")
  const displayNumber = number.includes('intro') ? number : number.replace('-', '.');
  
  return { filename, number, slug, title: `${displayNumber} ${title}` };
}

async function extractTitle(content: string): Promise<string> {
  // Extract the actual title from the markdown content
  const lines = content.split('\n');
  
  // Find the first heading line
  for (const line of lines) {
    if (line.startsWith('#')) {
      // Remove the # prefix and "Chapter X.X: " or "Part X: " prefix if present
      return line
        .replace(/^#+\s*/, '')
        .replace(/^Chapter\s+\d+\.\d+:\s*/i, '')
        .replace(/^Part\s+\d+:\s*/i, '')
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
    .replace(/^#\s+Part\s+\d+:.*\n/, '')
    // Also remove any H1 heading at the start (new format)
    .replace(/^#\s+.*\n/, '')
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
    })
    // Also convert <mermaid> tags to MermaidDiagram components
    .replace(/<mermaid>\n?([\s\S]*?)<\/mermaid>/g, (match, diagram) => {
      const mermaidId = `${info.slug}-diagram-${mermaidCounter}`;
      mermaidCounter++;
      // Store the original diagram content without any escaping
      const diagramContent = diagram.trim();
      return `<MermaidDiagram code={\`${diagramContent}\`} id="${mermaidId}" />`;
    });
  
  // Store components and template literals temporarily to protect them from escaping
  const placeholders: { placeholder: string; content: string }[] = [];
  
  // Protect template literals inside components
  mdxContent = mdxContent.replace(/\{`[\s\S]*?`\}/g, (match) => {
    const placeholder = `__TEMPLATE_LITERAL_${placeholders.length}__`;
    placeholders.push({ placeholder, content: match });
    return placeholder;
  });
  
  // Protect React components
  mdxContent = mdxContent.replace(/<(SQLWidget|MermaidDiagram)[^>]*\/>/g, (match) => {
    const placeholder = `__COMPONENT_${placeholders.length}__`;
    placeholders.push({ placeholder, content: match });
    return placeholder;
  });
  
  // Escape angle brackets that aren't part of HTML tags or components
  mdxContent = mdxContent
    // Escape standalone < and > that aren't part of tags
    .replace(/(<)(?![A-Za-z\/!])/g, '&lt;')
    .replace(/(?<![A-Za-z\/"])>/g, '&gt;');
  
  // Restore all placeholders in reverse order to handle nested cases
  for (let i = placeholders.length - 1; i >= 0; i--) {
    const { placeholder, content } = placeholders[i];
    mdxContent = mdxContent.replace(placeholder, content);
  }
  
  // Check if we need additional imports
  const hasMermaid = mdxContent.includes('<MermaidDiagram ');
  const imports = ['import SQLWidget from \'../../components/SQLWidgetStarlight.astro\';'];
  if (hasMermaid) {
    imports.push('import MermaidDiagram from \'../../components/MermaidDiagram.astro\';');
  }
  
  // Escape quotes in title and description for YAML
  // Also strip backticks from titles since Starlight doesn't render them
  const escapeYaml = (str: string) => str
    .replace(/`/g, '')
    .replace(/"/g, '\\"');
  
  // Build the MDX file
  const mdx = `---
title: "${escapeYaml(finalTitle)}"
description: "${escapeYaml(description)}"
---

${imports.join('\n')}

${mdxContent.trim()}
`;
  
  await writeFile(destPath, mdx, 'utf-8');
  const outputName = info.number.includes('intro') 
    ? `${info.number}.mdx` 
    : `${info.number}-${info.slug}.mdx`;
  console.log(`Converted ${filename} -> ${outputName}`);
}

async function main() {
  const chaptersDir = join(cwd(), 'src/chapters');
  const docsDir = join(cwd(), 'src/content/docs');
  
  const files = await readdir(chaptersDir);
  // Skip intro files entirely
  const chapterFiles = files.filter(f => f.endsWith('.md') && /^\d{2}-\d{2}/.test(f));
  
  console.log(`Found ${chapterFiles.length} chapter files to convert`);
  
  for (const file of chapterFiles) {
    const sourcePath = join(chaptersDir, file);
    const info = parseChapterInfo(file);
    // For intro files, don't duplicate the "intro" in the filename
    const destFilename = info.number.includes('intro') 
      ? `${info.number}.mdx` 
      : `${info.number}-${info.slug}.mdx`;
    const destPath = join(docsDir, destFilename);
    
    try {
      await convertChapterToMdx(sourcePath, destPath);
    } catch (error) {
      console.error(`Error converting ${file}:`, error);
    }
  }
  
  console.log('Conversion complete!');
}

main().catch(console.error);