#!/usr/bin/env bun

import { Database } from "bun:sqlite";
import { readdir, readFile, access, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { $ } from "bun";
import { constants } from "fs";

// Get the directory where this script is located
const SCRIPT_DIR = dirname(new URL(import.meta.url).pathname);
const BOOK_DIR = dirname(SCRIPT_DIR);

const REPO_URL = "https://github.com/jmandel/my-health-data-ehi-wip";
const REPO_DIR = join(SCRIPT_DIR, "my-health-data-ehi-wip");
const TSV_DIR = join(REPO_DIR, "tsv");
const SCHEMA_DIR = join(REPO_DIR, "schemas");
const DB_FILE = join(BOOK_DIR, "src", "data", "ehi.sqlite");

// Helper to parse TSV content
function parseTSV(content: string): { headers: string[], rows: string[][] } {
  const lines = content.trim().split('\n');
  if (lines.length === 0) return { headers: [], rows: [] };
  
  const headers = lines[0].split('\t');
  const rows = lines.slice(1).map(line => line.split('\t'));
  
  return { headers, rows };
}

// Helper to sanitize column names for SQLite
function sanitizeColumnName(name: string): string {
  // Replace special characters with underscores
  return name
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/^(\d)/, '_$1') // Prefix with _ if starts with number
    .toUpperCase();
}

// Helper to create table name from filename
function getTableName(filename: string): string {
  return filename.replace('.tsv', '').toUpperCase();
}

// Helper to infer SQLite type from value
function inferSQLiteType(values: string[]): string {
  // Sample up to 100 non-empty values
  const samples = values.filter(v => v && v !== '').slice(0, 100);
  
  if (samples.length === 0) return 'TEXT';
  
  // Check if all samples are integers
  if (samples.every(v => /^-?\d+$/.test(v))) {
    return 'INTEGER';
  }
  
  // Check if all samples are numbers (including decimals)
  if (samples.every(v => /^-?\d*\.?\d+$/.test(v))) {
    return 'REAL';
  }
  
  // Check if looks like dates (YYYY-MM-DD or YYYY-MM-DD HH:MM:SS)
  if (samples.every(v => /^\d{4}-\d{2}-\d{2}(\s\d{2}:\d{2}:\d{2})?$/.test(v))) {
    return 'TEXT'; // SQLite stores dates as TEXT
  }
  
  return 'TEXT';
}

// Load schema documentation from JSON file
async function loadTableDocumentation(tableName: string): Promise<{ 
  tableDescription: string;
  columns: Map<string, string>;
} | null> {
  try {
    const jsonPath = join(SCHEMA_DIR, `${tableName}.json`);
    const content = await readFile(jsonPath, 'utf-8');
    const data = JSON.parse(content);
    
    // New schema format - data is directly at the root level
    if (!data.name || data.name !== tableName) return null;
    
    const columns = new Map<string, string>();
    if (data.columns) {
      for (const col of data.columns) {
        const colName = sanitizeColumnName(col.name);
        if (col.description) {
          columns.set(colName, col.description);
        }
      }
    }
    
    return {
      tableDescription: data.description || '',
      columns
    };
  } catch (error) {
    // JSON file doesn't exist or can't be parsed
    return null;
  }
}

// Escape SQL comments
function escapeSQLComment(comment: string): string {
  return comment
    .replace(/\n/g, ' ')
    .replace(/\r/g, '')
    .replace(/--/g, '-')
    .trim();
}

// Check if directory exists
async function directoryExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

// Clone or update the repository
async function ensureRepositoryExists() {
  const repoExists = await directoryExists(REPO_DIR);
  
  if (!repoExists) {
    console.log(`📥 Cloning repository from ${REPO_URL}...`);
    await $`git clone ${REPO_URL} ${REPO_DIR}`;
    console.log("✅ Repository cloned successfully");
  } else {
    console.log("📁 Repository already exists");
    // Optionally pull latest changes
    console.log("🔄 Pulling latest changes...");
    await $`cd ${REPO_DIR} && git pull`;
    console.log("✅ Repository updated");
  }
}

async function main() {
  console.log("🚀 Starting TSV to SQLite import with JSON documentation...");
  
  // Ensure repository exists
  await ensureRepositoryExists();
  
  // Ensure output directory exists
  const dbDir = dirname(DB_FILE);
  await mkdir(dbDir, { recursive: true });
  console.log(`📁 Ensured output directory exists: ${dbDir}`);
  
  // Create/open database
  const db = new Database(DB_FILE);
  
  // Enable foreign keys
  db.exec("PRAGMA foreign_keys = ON");
  
  // Create metadata table for documentation
  db.exec(`
    CREATE TABLE IF NOT EXISTS _metadata (
      table_name TEXT NOT NULL,
      column_name TEXT,
      documentation TEXT NOT NULL,
      PRIMARY KEY (table_name, column_name)
    )
  `);
  
  console.log("📚 Created metadata table for documentation");
  
  // Get all TSV files
  const files = await readdir(TSV_DIR);
  const tsvFiles = files.filter(f => f.endsWith('.tsv')).sort();
  
  console.log(`📁 Found ${tsvFiles.length} TSV files to process`);
  
  for (const file of tsvFiles) {
    console.log(`\n📄 Processing ${file}...`);
    
    try {
      const content = await readFile(join(TSV_DIR, file), 'utf-8');
      const { headers, rows } = parseTSV(content);
      
      if (headers.length === 0) {
        console.log(`  ⚠️  Skipping empty file`);
        continue;
      }
      
      const tableName = getTableName(file);
      const columnNames = headers.map(sanitizeColumnName);
      
      // Load documentation from JSON (if available)
      const docs = await loadTableDocumentation(tableName);
      
      // Infer column types from data
      const columnTypes: string[] = [];
      for (let i = 0; i < headers.length; i++) {
        const values = rows.map(row => row[i] || '');
        columnTypes.push(inferSQLiteType(values));
      }
      
      // Create table SQL with comments on separate lines
      let createTableSQL = `CREATE TABLE ${tableName} (\n`;
      
      // Add table comment inside CREATE TABLE if available
      if (docs?.tableDescription) {
        createTableSQL += `  -- ${escapeSQLComment(docs.tableDescription)}\n`;
      }
      
      // Add ALL columns from TSV, with comments on lines above when available
      for (let i = 0; i < columnNames.length; i++) {
        const columnName = columnNames[i];
        const columnType = columnTypes[i];
        
        // Add column comment on line above if available in documentation
        const columnComment = docs?.columns.get(columnName);
        if (columnComment) {
          createTableSQL += `  -- ${escapeSQLComment(columnComment)}\n`;
        }
        
        createTableSQL += `  ${columnName} ${columnType}`;
        
        // Add comma if not last column
        if (i < columnNames.length - 1) {
          createTableSQL += ',';
        }
        createTableSQL += '\n';
      }
      
      createTableSQL += ')';
      
      db.exec(`DROP TABLE IF EXISTS ${tableName}`);
      db.exec(createTableSQL);
      
      // Insert documentation into metadata table
      if (docs) {
        // Insert table-level documentation
        if (docs.tableDescription) {
          const insertTableDoc = db.prepare(`
            INSERT OR REPLACE INTO _metadata (table_name, column_name, documentation)
            VALUES (?, NULL, ?)
          `);
          insertTableDoc.run(tableName, docs.tableDescription);
        }
        
        // Insert column-level documentation
        const insertColumnDoc = db.prepare(`
          INSERT OR REPLACE INTO _metadata (table_name, column_name, documentation)
          VALUES (?, ?, ?)
        `);
        
        for (const [columnName, columnDoc] of docs.columns.entries()) {
          insertColumnDoc.run(tableName, columnName, columnDoc);
        }
        
        const documentedColumns = columnNames.filter(col => docs.columns.has(col)).length;
        console.log(`  📝 Added documentation (${documentedColumns}/${columnNames.length} columns from JSON)`);
      }
      
      console.log(`  ✅ Created table with ${columnNames.length} columns`);
      
      // Prepare insert statement
      const placeholders = columnNames.map(() => '?').join(', ');
      const insertSQL = `INSERT INTO ${tableName} (${columnNames.join(', ')}) VALUES (${placeholders})`;
      const insert = db.prepare(insertSQL);
      
      // Insert data in batches
      const BATCH_SIZE = 1000;
      db.exec("BEGIN TRANSACTION");
      
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        
        for (const row of batch) {
          // Ensure row has correct number of values
          const values = row.slice(0, headers.length);
          while (values.length < headers.length) {
            values.push('');
          }
          
          // Convert empty strings to NULL for numeric columns
          const processedValues = values.map((v, idx) => {
            if (v === '' && (columnTypes[idx] === 'INTEGER' || columnTypes[idx] === 'REAL')) {
              return null;
            }
            return v;
          });
          
          insert.run(...processedValues);
        }
        
        if (i % 10000 === 0 && i > 0) {
          console.log(`  📊 Inserted ${i} rows...`);
        }
      }
      
      db.exec("COMMIT");
      console.log(`  ✅ Inserted ${rows.length} rows`);
      
    } catch (error) {
      console.error(`  ❌ Error processing ${file}:`, error);
      try {
        db.exec("ROLLBACK");
      } catch (rollbackError) {
        // Ignore rollback errors
      }
    }
  }
  
  // Create indexes on common ID columns
  console.log("\n🔧 Creating indexes...");
  
  const indexQueries = [
    "CREATE INDEX IF NOT EXISTS idx_patient_pat_id ON PATIENT(PAT_ID)",
    "CREATE INDEX IF NOT EXISTS idx_pat_enc_pat_id ON PAT_ENC(PAT_ID)",
    "CREATE INDEX IF NOT EXISTS idx_pat_enc_csn ON PAT_ENC(PAT_ENC_CSN_ID)",
    "CREATE INDEX IF NOT EXISTS idx_order_proc_pat_id ON ORDER_PROC(PAT_ID)",
    "CREATE INDEX IF NOT EXISTS idx_order_med_pat_id ON ORDER_MED(PAT_ID)",
  ];
  
  for (const query of indexQueries) {
    try {
      db.exec(query);
    } catch (error) {
      // Index might not be applicable if table doesn't exist
    }
  }
  
  // Get database statistics
  const tableCount = db.query("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'").get() as { count: number };
  const tables = db.query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as { name: string }[];
  
  console.log("\n📊 Database Summary:");
  console.log(`  Tables created: ${tableCount.count}`);
  console.log("\n  Table row counts:");
  
  for (const table of tables) {
    try {
      const count = db.query(`SELECT COUNT(*) as count FROM ${table.name}`).get() as { count: number };
      console.log(`    ${table.name}: ${count.count.toLocaleString()} rows`);
    } catch (error) {
      console.log(`    ${table.name}: Error counting rows`);
    }
  }
  
  // Test: Show a table's schema with comments
  console.log("\n💡 Example - Viewing PATIENT table schema:");
  const patientSchema = db.query("SELECT sql FROM sqlite_master WHERE type='table' AND name='PATIENT'").get() as { sql: string } | undefined;
  if (patientSchema) {
    console.log(patientSchema.sql.substring(0, 500) + "...");
  }
  
  // Show metadata statistics
  console.log("\n📚 Documentation Summary:");
  const metadataStats = db.query(`
    SELECT 
      COUNT(DISTINCT table_name) as documented_tables,
      COUNT(CASE WHEN column_name IS NULL THEN 1 END) as table_docs,
      COUNT(CASE WHEN column_name IS NOT NULL THEN 1 END) as column_docs
    FROM _metadata
  `).get() as { documented_tables: number, table_docs: number, column_docs: number };
  
  console.log(`  Documented tables: ${metadataStats.documented_tables}`);
  console.log(`  Table-level docs: ${metadataStats.table_docs}`);
  console.log(`  Column-level docs: ${metadataStats.column_docs}`);
  
  // Example queries for metadata
  console.log("\n📝 Example queries to access documentation:");
  console.log("  -- Get documentation for a specific table:");
  console.log("  SELECT documentation FROM _metadata WHERE table_name = 'PATIENT' AND column_name IS NULL;");
  console.log("\n  -- Get documentation for all columns in a table:");
  console.log("  SELECT column_name, documentation FROM _metadata WHERE table_name = 'PATIENT' AND column_name IS NOT NULL;");
  console.log("\n  -- Search for columns containing a keyword:");
  console.log("  SELECT table_name, column_name, documentation FROM _metadata WHERE documentation LIKE '%encounter%';");
  
  db.close();
  console.log("\n✅ Import complete! Database saved to:", DB_FILE);
}

// Run the import
main().catch(console.error);
