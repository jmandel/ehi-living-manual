#!/usr/bin/env bun

import { glob } from "glob";
import * as path from "path";

interface ExtractedQuery {
  id: string;
  chapterId: string;
  originalQuery: string;
  description?: string;
  index: number;
}

const extractDescription = (content: string, position: number): string | undefined => {
  // Look for a description comment or text before the SQL widget
  const before = content.substring(Math.max(0, position - 200), position);
  const lines = before.split('\n').filter(l => l.trim());
  if (lines.length > 0) {
    const lastLine = lines[lines.length - 1];
    if (!lastLine.startsWith('#') && !lastLine.startsWith('```')) {
      return lastLine.trim();
    }
  }
  return undefined;
};

export const extractQueries = async (): Promise<ExtractedQuery[]> => {
  const queries: ExtractedQuery[] = [];
  const chapters = await glob('src/chapters/*.md');
  
  for (const chapterPath of chapters) {
    const content = await Bun.file(chapterPath).text();
    const chapterId = path.basename(chapterPath, '.md');
    
    // Match example-query blocks from the original format
    const regex = /<example-query(?:\s+description="([^"]*)")?\s*>\s*\n([\s\S]*?)<\/example-query>/g;
    let match;
    let index = 0;
    
    while ((match = regex.exec(content)) !== null) {
      const description = match[1]; // Capture group 1 is the description attribute
      const queryContent = match[2].trim(); // Capture group 2 is the query content
      const id = `${chapterId}-${index}`;
      
      queries.push({
        id,
        chapterId,
        originalQuery: queryContent,
        description: description || extractDescription(content, match.index),
        index
      });
      
      index++;
    }
  }
  
  // Save extracted queries
  await Bun.write('src/data/queries.json', JSON.stringify(queries, null, 2));
  console.log(`✅ Extracted ${queries.length} queries from ${chapters.length} chapters`);
  return queries;
};

// Run if called directly
if (import.meta.main) {
  await extractQueries();
}