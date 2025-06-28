#!/usr/bin/env bun

import { Database } from "bun:sqlite";
import { readdir, readFile, access, mkdir, rename, unlink } from "fs/promises";
import { join, dirname } from "path";
import { $ } from "bun";
import { constants } from "fs";

// Get the directory where this script is located
const SCRIPT_DIR = dirname(new URL(import.meta.url).pathname);
const ASTRO_POC_DIR = dirname(SCRIPT_DIR);

const REPO_URL = "https://github.com/jmandel/my-health-data-ehi-wip";
const REPO_DIR = join(SCRIPT_DIR, "my-health-data-ehi-wip");
const TSV_DIR = join(REPO_DIR, "tsv");
const SCHEMA_DIR = join(REPO_DIR, "schemas");
const DB_FILE = join(ASTRO_POC_DIR, "public", "assets", "data", "ehi.sqlite");
const TEMP_DB_FILE = join(ASTRO_POC_DIR, "public", "assets", "data", ".ehi.sqlite.tmp");

// Helper to parse TSV content
function parseTSV(content: string): { headers: string[], rows: string[][] } {
  // Normalize line endings and trim
  const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  const lines = normalizedContent.split('\n');
  if (lines.length === 0) return { headers: [], rows: [] };
  
  // Split by tab and trim each value
  const headers = lines[0].split('\t').map(h => h.trim());
  const rows = lines.slice(1).map(line => 
    line.split('\t').map(cell => cell.trim())
  );
  
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
  columnTypes: Map<string, string>;
  primaryKey: string[];
} | null> {
  try {
    const jsonPath = join(SCHEMA_DIR, `${tableName}.json`);
    const content = await readFile(jsonPath, 'utf-8');
    const data = JSON.parse(content);
    
    // New schema format - data is directly at the root level
    if (!data.name || data.name !== tableName) return null;
    
    const columns = new Map<string, string>();
    const columnTypes = new Map<string, string>();
    if (data.columns) {
      for (const col of data.columns) {
        const colName = sanitizeColumnName(col.name);
        if (col.description) {
          columns.set(colName, col.description);
        }
        if (col.type) {
          // Map schema types to SQLite types
          let sqliteType = 'TEXT'; // Default
          const schemaType = col.type.toUpperCase();
          
          if (schemaType === 'VARCHAR' || schemaType === 'CHAR' || schemaType === 'STRING') {
            sqliteType = 'TEXT';
          } else if (schemaType === 'INTEGER' || schemaType === 'INT' || schemaType === 'BIGINT' || schemaType === 'SMALLINT') {
            sqliteType = 'INTEGER';
          } else if (schemaType === 'DECIMAL' || schemaType === 'NUMERIC' || schemaType === 'FLOAT' || schemaType === 'DOUBLE' || schemaType === 'REAL') {
            sqliteType = 'REAL';
          } else if (schemaType === 'DATE' || schemaType === 'DATETIME' || schemaType === 'TIMESTAMP') {
            sqliteType = 'TEXT'; // SQLite stores dates as TEXT
          } else if (schemaType === 'BOOLEAN' || schemaType === 'BOOL') {
            sqliteType = 'INTEGER'; // SQLite uses 0/1 for boolean
          }
          
          columnTypes.set(colName, sqliteType);
        }
      }
    }
    
    // Extract primary key columns
    const primaryKey: string[] = [];
    if (data.primaryKey && Array.isArray(data.primaryKey)) {
      // Sort by ordinal position to ensure correct order
      const sortedPK = data.primaryKey.sort((a: any, b: any) => 
        (a.ordinalPosition || 0) - (b.ordinalPosition || 0)
      );
      for (const pk of sortedPK) {
        if (pk.columnName) {
          primaryKey.push(sanitizeColumnName(pk.columnName));
        }
      }
    }
    
    // Append primary key info to table description
    let tableDescription = data.description || '';
    if (primaryKey.length > 0) {
      const pkList = primaryKey.join(', ');
      tableDescription += ` Primary key: ${pkList}.`;
    }
    
    return {
      tableDescription,
      columns,
      columnTypes,
      primaryKey
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
  
  try {
    // Ensure repository exists
    await ensureRepositoryExists();
    
    // Ensure output directory exists
    const dbDir = dirname(DB_FILE);
    await mkdir(dbDir, { recursive: true });
    console.log(`📁 Ensured output directory exists: ${dbDir}`);
    
    // Remove any existing temp file
    try {
      await unlink(TEMP_DB_FILE);
    } catch (error) {
      // Ignore if file doesn't exist
    }
  
  // Create new temporary database
  const db = new Database(TEMP_DB_FILE);
  
  // Enable foreign keys
  db.exec("PRAGMA foreign_keys = ON");
  
  // Drop and recreate metadata table for documentation
  db.exec(`DROP TABLE IF EXISTS _metadata`);
  db.exec(`
    CREATE TABLE _metadata (
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
      
      // Determine column types - use schema types when available, otherwise infer from data
      const columnTypes: string[] = [];
      for (let i = 0; i < headers.length; i++) {
        const columnName = columnNames[i];
        
        // Check if we have a type from the schema
        const schemaType = docs?.columnTypes.get(columnName);
        if (schemaType) {
          columnTypes.push(schemaType);
          console.log(`  📋 Using schema type for ${columnName}: ${schemaType}`);
        } else {
          // Infer type from data
          const values = rows.map(row => row[i] || '');
          const inferredType = inferSQLiteType(values);
          columnTypes.push(inferredType);
        }
      }
      
      // Check if all primary key columns exist in the TSV
      let primaryKeyConstraint = '';
      if (docs?.primaryKey && docs.primaryKey.length > 0) {
        const allPKColumnsExist = docs.primaryKey.every(pkCol => 
          columnNames.includes(pkCol)
        );
        
        if (allPKColumnsExist) {
          primaryKeyConstraint = `,\n  PRIMARY KEY (${docs.primaryKey.join(', ')})`;
          console.log(`  🔑 Primary key columns found: ${docs.primaryKey.join(', ')}`);
        } else {
          const missingColumns = docs.primaryKey.filter(pkCol => 
            !columnNames.includes(pkCol)
          );
          console.log(`  ⚠️  Primary key columns missing from TSV: ${missingColumns.join(', ')}`);
        }
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
      
      // Add primary key constraint if applicable
      createTableSQL += primaryKeyConstraint;
      
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
        
        // Only insert documentation for columns that actually exist in the TSV
        for (const [columnName, columnDoc] of docs.columns.entries()) {
          if (columnNames.includes(columnName)) {
            insertColumnDoc.run(tableName, columnName, columnDoc);
          }
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
      
      let pkViolationDetected = false;
      let rowsInserted = 0;
      
      try {
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
            
            try {
              insert.run(...processedValues);
              rowsInserted++;
            } catch (insertError) {
              const errorMessage = insertError instanceof Error ? insertError.message : String(insertError);
              if (errorMessage.includes('UNIQUE constraint failed') && primaryKeyConstraint) {
                pkViolationDetected = true;
                throw insertError; // Re-throw to be caught by outer try-catch
              }
              throw insertError; // Re-throw other errors
            }
          }
          
          if (i % 10000 === 0 && i > 0) {
            console.log(`  📊 Inserted ${i} rows...`);
          }
        }
        
        db.exec("COMMIT");
        console.log(`  ✅ Inserted ${rows.length} rows`);
        
      } catch (batchError) {
        db.exec("ROLLBACK");
        
        const errorMessage = batchError instanceof Error ? batchError.message : String(batchError);
        if (pkViolationDetected && errorMessage.includes('UNIQUE constraint failed')) {
          console.log(`  ⚠️  Primary key constraint violation detected. Recreating table without primary key constraint...`);
          
          // Recreate table without primary key constraint
          createTableSQL = `CREATE TABLE ${tableName} (\n`;
          
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
          
          // No primary key constraint this time
          createTableSQL += ')';
          
          db.exec(`DROP TABLE IF EXISTS ${tableName}`);
          db.exec(createTableSQL);
          console.log(`  ✅ Recreated table without primary key constraint`);
          
          // Re-prepare insert and try again
          const insertNoPK = db.prepare(insertSQL);
          db.exec("BEGIN TRANSACTION");
          
          rowsInserted = 0;
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
              
              insertNoPK.run(...processedValues);
              rowsInserted++;
            }
            
            if (i % 10000 === 0 && i > 0) {
              console.log(`  📊 Inserted ${i} rows...`);
            }
          }
          
          db.exec("COMMIT");
          console.log(`  ✅ Inserted ${rows.length} rows (without primary key constraint)`);
          
        } else {
          throw batchError; // Re-throw if not a PK constraint issue
        }
      }
      
    } catch (error) {
      console.error(`  ❌ Error processing ${file}:`, error);
      try {
        db.exec("ROLLBACK");
      } catch (rollbackError) {
        console.error(`  ❌ Failed to rollback transaction:`, rollbackError);
      }
      // Exit with error code
      console.error(`\n💥 Fatal error: Failed to process ${file}. Stopping import.`);
      db.close();
      
      // Clean up temp file
      try {
        await unlink(TEMP_DB_FILE);
        console.log("🧹 Cleaned up temporary file");
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      
      process.exit(1);
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
      console.log(`  ✅ Created index: ${query.match(/idx_\w+/)?.[0] || 'index'}`);
    } catch (error) {
      // Only fail if it's not a "table doesn't exist" error
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes('no such table')) {
        console.error(`  ❌ Failed to create index:`, error);
        console.error(`  Query: ${query}`);
        db.close();
        process.exit(1);
      } else {
        console.log(`  ⏭️  Skipped index (table doesn't exist): ${query.match(/idx_\w+/)?.[0] || 'index'}`);
      }
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
  
  // Atomically move the temp file to the final location
  console.log("\n🔄 Moving database into place...");
  await rename(TEMP_DB_FILE, DB_FILE);
  
  console.log("✅ Import complete! Database saved to:", DB_FILE);
  } catch (error) {
    console.error("\n💥 Fatal error during import:", error);
    
    // Clean up temp file on error
    try {
      await unlink(TEMP_DB_FILE);
      console.log("🧹 Cleaned up temporary file");
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    
    process.exit(1);
  }
}

// Run the import
main().catch((error) => {
  console.error("\n💥 Unhandled error:", error);
  process.exit(1);
});