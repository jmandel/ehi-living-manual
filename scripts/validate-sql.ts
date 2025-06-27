#!/usr/bin/env bun

import { Database } from "bun:sqlite";
import { glob } from "glob";
import { readFile } from "fs/promises";

interface QueryError {
  file: string;
  description: string;
  query: string;
  error: string;
  line: number;
}

async function validateSQL() {
  console.log("🔍 Validating SQL queries in markdown files...");
  
  const errors: QueryError[] = [];
  const db = new Database("src/data/ehi.sqlite", { readonly: true });
  
  try {
    // Find all markdown files
    const files = await glob("src/chapters/*.md");
    
    for (const file of files) {
      const content = await readFile(file, "utf-8");
      const lines = content.split("\n");
      
      // Find all example queries
      const queryRegex = /<example-query description="([^"]+)">\n([\s\S]*?)\n<\/example-query>/g;
      let match;
      
      while ((match = queryRegex.exec(content)) !== null) {
        const description = match[1];
        const query = match[2].trim();
        
        // Find line number
        const lineNumber = content.substring(0, match.index).split("\n").length;
        
        try {
          // Test the query
          const stmt = db.prepare(query);
          stmt.all(); // Execute to catch runtime errors
          stmt.finalize();
        } catch (error: any) {
          errors.push({
            file,
            description,
            query,
            error: error.message,
            line: lineNumber
          });
        }
      }
    }
    
    // Report results
    if (errors.length === 0) {
      console.log("✅ All SQL queries validated successfully!");
      return true;
    } else {
      console.error(`❌ Found ${errors.length} SQL errors:\n`);
      
      for (const error of errors) {
        console.error(`📄 ${error.file}:${error.line}`);
        console.error(`   Description: ${error.description}`);
        console.error(`   Error: ${error.error}`);
        console.error(`   Query: ${error.query.substring(0, 100)}...`);
        console.error("");
      }
      
      return false;
    }
  } finally {
    db.close();
  }
}

// Run validation
const success = await validateSQL();
process.exit(success ? 0 : 1);