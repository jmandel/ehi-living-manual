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

// Read the extracted queries
const queriesPath = join(import.meta.dir, "../src/data/queries.json");
const queries: Query[] = JSON.parse(readFileSync(queriesPath, "utf-8"));

// Connect to the database
const dbPath = join(import.meta.dir, "../../dist/assets/data/ehi.sqlite");
const db = new Database(dbPath, { readonly: true });

console.log(`Processing ${queries.length} queries...`);

// Process each query
const processedQueries: ProcessedQuery[] = queries.map((query, index) => {
  console.log(`[${index + 1}/${queries.length}] Processing query ${query.id}...`);
  
  try {
    const stmt = db.query(query.originalQuery);
    const results = stmt.all();
    
    // Get column names from first result if available
    const columns = results.length > 0 ? Object.keys(results[0]) : [];
    
    return {
      ...query,
      results: results.slice(0, 100), // Limit results for file size
      columns,
      error: null
    };
  } catch (error) {
    console.error(`Error processing query ${query.id}:`, error);
    return {
      ...query,
      results: null,
      columns: null,
      error: error instanceof Error ? error.message : String(error)
    };
  }
});

// Write processed queries
const outputPath = join(import.meta.dir, "../src/data/processed-queries.json");
writeFileSync(outputPath, JSON.stringify(processedQueries, null, 2));

console.log(`✅ Processed queries written to: ${outputPath}`);

// Summary
const successful = processedQueries.filter(q => q.error === null).length;
const failed = processedQueries.filter(q => q.error !== null).length;

console.log(`\nSummary:`);
console.log(`  Successful: ${successful}`);
console.log(`  Failed: ${failed}`);

if (failed > 0) {
  console.log(`\nFailed queries:`);
  processedQueries
    .filter(q => q.error !== null)
    .forEach(q => console.log(`  - ${q.id}: ${q.error}`));
}

db.close();