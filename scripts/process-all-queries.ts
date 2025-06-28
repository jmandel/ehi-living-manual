import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { writeFileSync } from "fs";

interface Query {
  id: string;
  originalQuery: string;
  description?: string;
  chapterId: string;
  index: number;
}

async function extractQueriesFromMarkdown(content: string, chapterId: string): Promise<Query[]> {
  const queries: Query[] = [];
  
  // Match example-query tags in the format:
  // <example-query description="Description here">
  // SELECT * FROM table;
  // </example-query>
  const queryRegex = /<example-query(?:\s+description="([^"]+)")?\s*>([\s\S]*?)<\/example-query>/g;
  
  let match;
  let index = 0;
  
  while ((match = queryRegex.exec(content)) !== null) {
    const [, description, query] = match;
    
    queries.push({
      id: `${chapterId}-${index}`,
      originalQuery: query.trim(),
      description: description || undefined,
      chapterId,
      index
    });
    
    index++;
  }
  
  return queries;
}

async function processAllChapters() {
  console.log("Extracting queries from all chapters...");
  
  const chaptersDir = join(import.meta.dir, "../src/chapters");
  const chapters = await readdir(chaptersDir);
  // Only process new format chapters (XX-YY-*.md or XX-intro.md)
  const mdFiles = chapters.filter(f => f.endsWith('.md') && /^\d{2}(-\d{2}|-intro)/.test(f));
  
  const allQueries: Query[] = [];
  
  for (const file of mdFiles) {
    const chapterId = file.replace('.md', '');
    const content = await readFile(join(chaptersDir, file), 'utf-8');
    const queries = await extractQueriesFromMarkdown(content, chapterId);
    
    if (queries.length > 0) {
      console.log(`Found ${queries.length} queries in ${file}`);
      allQueries.push(...queries);
    } else if (content.includes('<example-query')) {
      console.log(`Warning: ${file} contains <example-query> tags but no queries were extracted`);
    }
  }
  
  console.log(`\nTotal queries found: ${allQueries.length}`);
  
  // Save all queries (replacing the old queries.json)
  const outputPath = join(import.meta.dir, "../src/data/queries.json");
  writeFileSync(outputPath, JSON.stringify(allQueries, null, 2));
  console.log(`Queries saved to: ${outputPath}`);
  
  return allQueries;
}

// Run the extraction
processAllChapters().catch(console.error);