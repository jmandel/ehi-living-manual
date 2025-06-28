import type { SqlJsStatic, Database } from 'sql.js';
import { getBasePath, getAssetUrl } from './path-utils';

let SQL: SqlJsStatic | null = null;
let db: Database | null = null;
let dbLoadPromise: Promise<void> | null = null;
let sqlJsLoadPromise: Promise<any> | null = null;

async function loadSqlJs() {
  if (!sqlJsLoadPromise) {
    sqlJsLoadPromise = new Promise((resolve, reject) => {
      // Check if already loaded
      if ((window as any).initSqlJs) {
        resolve((window as any).initSqlJs);
        return;
      }
      
      // Load sql.js from our local copy
      const script = document.createElement('script');
      script.src = getAssetUrl('sql-js/sql-wasm.js');
      script.onload = () => {
        if ((window as any).initSqlJs) {
          resolve((window as any).initSqlJs);
        } else {
          reject(new Error('initSqlJs not found after loading script'));
        }
      };
      script.onerror = () => reject(new Error('Failed to load sql.js'));
      document.head.appendChild(script);
    });
  }
  return sqlJsLoadPromise;
}

async function initializeSQL() {
  if (!SQL) {
    console.log('Initializing SQL.js...');
    
    const initSqlJs = await loadSqlJs();
    
    SQL = await initSqlJs({
      // Use our local WASM file
      locateFile: file => getAssetUrl(`sql-js/${file}`)
    });
    
    console.log('SQL.js initialized successfully');
  }
  return SQL;
}

async function loadDatabase() {
  if (dbLoadPromise) return dbLoadPromise;
  
  dbLoadPromise = (async () => {
    const SQL = await initializeSQL();
    
    // Fetch the database file
    const dbPath = getAssetUrl('assets/data/ehi.sqlite');
    console.log('Loading database from:', dbPath);
    
    const response = await fetch(dbPath);
    if (!response.ok) {
      throw new Error(`Failed to load database: ${response.statusText}`);
    }
    
    const buffer = await response.arrayBuffer();
    const data = new Uint8Array(buffer);
    
    // Create the database
    db = new SQL.Database(data);
    console.log('Database loaded successfully');
  })();
  
  return dbLoadPromise;
}

export interface QueryResult {
  results: any[] | null;
  columns: string[] | null;
  error: string | null;
  executionTime?: number;
  totalRows?: number;
  hasMore?: boolean;
}

export async function executeQuery(query: string, limit?: number): Promise<QueryResult> {
  const startTime = performance.now();
  
  try {
    // Ensure database is loaded
    await loadDatabase();
    
    if (!db) {
      throw new Error('Database not loaded');
    }
    
    // Execute the query
    const stmt = db.prepare(query);
    const results: any[] = [];
    let columns: string[] | null = null;
    
    let hasMore = false;
    while (stmt.step()) {
      if (!columns) {
        columns = stmt.getColumnNames();
      }
      
      const row: any = {};
      const values = stmt.get();
      columns.forEach((col, idx) => {
        row[col] = values[idx];
      });
      results.push(row);
      
      // If a limit is specified, check if we've reached it
      if (limit && results.length >= limit) {
        // Check if there's at least one more row
        hasMore = stmt.step();
        break;
      }
    }
    
    stmt.free();
    
    const executionTime = performance.now() - startTime;
    
    return {
      results,
      columns: columns || [],
      error: null,
      executionTime,
      totalRows: results.length,
      hasMore
    };
  } catch (error) {
    console.error('Query execution error:', error);
    return {
      results: null,
      columns: null,
      error: error instanceof Error ? error.message : 'Query execution failed',
      executionTime: performance.now() - startTime
    };
  }
}