import { Database } from "bun:sqlite";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

interface Query {
  id: string;
  originalQuery: string;
  description?: string;
  chapterId: string;
  index: number;
}

interface ProcessedQuery extends Query {
  results: any[] | null;
  columns: string[] | null;
  error: string | null;
}

// Read all extracted queries
const queriesPath = join(import.meta.dir, "../src/data/queries.json");
const queries: Query[] = JSON.parse(readFileSync(queriesPath, "utf-8"));

// Connect to the database (use public directory, not dist)
const dbPath = join(import.meta.dir, "../public/assets/data/ehi.sqlite");
const db = new Database(dbPath, { readonly: true });

console.log(`Processing ${queries.length} queries from all chapters...`);

// Group queries by chapter for better organization
const chapterCounts = new Map<string, number>();
queries.forEach(q => {
  chapterCounts.set(q.chapterId, (chapterCounts.get(q.chapterId) || 0) + 1);
});

console.log("\nQueries per chapter:");
Array.from(chapterCounts.entries())
  .sort(([a], [b]) => a.localeCompare(b))
  .forEach(([chapter, count]) => {
    console.log(`  ${chapter}: ${count} queries`);
  });

// Process each query
const processedQueries: ProcessedQuery[] = [];
let successful = 0;
let failed = 0;

queries.forEach((query, index) => {
  if (index % 50 === 0) {
    console.log(`\nProcessing queries ${index + 1}-${Math.min(index + 50, queries.length)} of ${queries.length}...`);
  }
  
  try {
    const stmt = db.query(query.originalQuery);
    const results = stmt.all();
    
    // Get column names from first result if available
    const columns = results.length > 0 ? Object.keys(results[0]) : [];
    
    processedQueries.push({
      ...query,
      results: results.slice(0, 100), // Limit results for file size
      columns,
      error: null
    });
    
    successful++;
  } catch (error) {
    console.error(`Error in ${query.chapterId} query #${query.index}: ${error}`);
    
    processedQueries.push({
      ...query,
      results: null,
      columns: null,
      error: error instanceof Error ? error.message : String(error)
    });
    
    failed++;
  }
});

// Group processed queries by chapter
const queriesByChapter = new Map<string, ProcessedQuery[]>();
processedQueries.forEach(q => {
  if (!queriesByChapter.has(q.chapterId)) {
    queriesByChapter.set(q.chapterId, []);
  }
  queriesByChapter.get(q.chapterId)!.push(q);
});

// Save processed queries (replacing the old processed-queries.json)
const allOutputPath = join(import.meta.dir, "../src/data/processed-queries.json");
writeFileSync(allOutputPath, JSON.stringify(processedQueries, null, 2));

// Save per-chapter files
const chapterDataDir = join(import.meta.dir, "../src/data/chapters");
import { mkdirSync } from "fs";
mkdirSync(chapterDataDir, { recursive: true });

queriesByChapter.forEach((queries, chapterId) => {
  const chapterPath = join(chapterDataDir, `${chapterId}-queries.json`);
  writeFileSync(chapterPath, JSON.stringify(queries, null, 2));
});

console.log(`\n✅ Processing complete!`);
console.log(`  Total: ${queries.length}`);
console.log(`  Successful: ${successful}`);
console.log(`  Failed: ${failed}`);
console.log(`\nProcessed queries saved to:`);
console.log(`  All queries: ${allOutputPath}`);
console.log(`  Per chapter: ${chapterDataDir}/`);

if (failed > 0) {
  console.log(`\n⚠️  ${failed} queries failed. Check the errors above.`);
}

db.close();