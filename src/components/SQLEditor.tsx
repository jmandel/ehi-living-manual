import { useState, useEffect, useRef } from 'react';
import initSqlJs from 'sql.js';
import type { Database, QueryExecResult } from 'sql.js';
import { getAssetUrl } from '../lib/path-utils';

interface Props {
  query: {
    id: string;
    originalQuery: string;
    description?: string;
  };
}

export default function SQLEditor({ query }: Props) {
  const [db, setDb] = useState<Database | null>(null);
  const [currentQuery, setCurrentQuery] = useState(query.originalQuery);
  const [results, setResults] = useState<QueryExecResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const dbRef = useRef<Database | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initializeDatabase() {
      try {
        // Initialize SQL.js
        const SQL = await initSqlJs({
          locateFile: (file) => getAssetUrl(`sql-js/${file}`)
        });

        // Fetch the database file
        const response = await fetch(getAssetUrl('assets/data/ehi.sqlite'));
        if (!response.ok) {
          throw new Error('Failed to load database');
        }
        
        const buffer = await response.arrayBuffer();
        const database = new SQL.Database(new Uint8Array(buffer));
        
        if (mounted) {
          dbRef.current = database;
          setDb(database);
          setIsLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize database');
          setIsLoading(false);
        }
      }
    }

    initializeDatabase();

    return () => {
      mounted = false;
      dbRef.current?.close();
    };
  }, []);

  const runQuery = () => {
    if (!db) return;

    setError(null);
    setResults(null);

    try {
      const execResults = db.exec(currentQuery);
      if (execResults.length > 0) {
        setResults(execResults[0]);
      } else {
        setResults({ columns: [], values: [] });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Query execution failed');
    }
  };

  const resetQuery = () => {
    setCurrentQuery(query.originalQuery);
    setResults(null);
    setError(null);
  };

  if (isLoading) {
    return (
      <div className="sql-editor-loading">
        <p>Loading SQL editor...</p>
      </div>
    );
  }

  return (
    <div className="sql-editor">
      {query.description && (
        <div className="sql-editor-description">{query.description}</div>
      )}
      
      <div className="sql-editor-controls">
        <textarea
          className="sql-editor-input"
          value={currentQuery}
          onChange={(e) => setCurrentQuery(e.target.value)}
          rows={8}
          spellCheck={false}
        />
        
        <div className="sql-editor-actions">
          <button 
            className="sql-button sql-button-primary"
            onClick={runQuery}
            disabled={!db}
          >
            Run Query
          </button>
          <button 
            className="sql-button sql-button-secondary"
            onClick={resetQuery}
          >
            Reset
          </button>
        </div>
      </div>

      {error && (
        <div className="sql-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {results && (
        <div className="sql-results">
          {results.values.length > 0 ? (
            <>
              <div className="sql-results-scroll">
                <table className="sql-results-table">
                  <thead>
                    <tr>
                      {results.columns.map((col, i) => (
                        <th key={i}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.values.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j}>{cell?.toString() ?? 'NULL'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="sql-results-count">
                {results.values.length} row{results.values.length !== 1 ? 's' : ''} returned
              </div>
            </>
          ) : (
            <p className="sql-no-results">Query executed successfully. No results returned.</p>
          )}
        </div>
      )}
    </div>
  );
}

// Export for type checking
declare global {
  interface Window {
    SQLEditor: typeof SQLEditor;
  }
}

if (typeof window !== 'undefined') {
  window.SQLEditor = SQLEditor;
}