#!/usr/bin/env bun

import { glob } from "glob";
import * as path from "path";
import { ExtractedQuery } from "./extract-queries";

export const processMarkdown = async (queries: ExtractedQuery[]) => {
  const chapters = await glob('src/content/chapters/*.md');
  
  // Create a map for quick lookup
  const queryByChapterAndIndex = new Map<string, string>();
  queries.forEach(q => {
    queryByChapterAndIndex.set(`${q.chapterId}-${q.index}`, q.id);
  });
  
  for (const chapterPath of chapters) {
    let content = await Bun.file(chapterPath).text();
    const chapterId = path.basename(chapterPath, '.md');
    
    let queryIndex = 0;
    
    // Replace example-query blocks with component references
    content = content.replace(
      /<example-query(?:\s+description="[^"]*")?\s*>\s*\n[\s\S]*?<\/example-query>/g,
      (match) => {
        const queryId = queryByChapterAndIndex.get(`${chapterId}-${queryIndex}`);
        queryIndex++;
        return `<SQLWidget queryId="${queryId}" />`;
      }
    );
    
    // Ensure processed directory exists
    const processedDir = path.dirname(chapterPath).replace('chapters', 'processed');
    await Bun.write(
      path.join(processedDir, path.basename(chapterPath)),
      content
    );
  }
  
  console.log(`✅ Processed ${chapters.length} chapters`);
};

// Run if called directly
if (import.meta.main) {
  const queries = JSON.parse(await Bun.file('src/data/queries.json').text());
  await processMarkdown(queries);
}