import React, { useState, useEffect, useRef } from 'react';
import type { ProcessedQuery } from '../types/query';
import { executeQuery, type QueryResult } from '../lib/sql-executor';

interface SQLWidgetProps {
  query: ProcessedQuery;
}

export default function SQLWidget({ query }: SQLWidgetProps) {
  const [isInteractive, setIsInteractive] = useState(false);
  const [editableQuery, setEditableQuery] = useState(query.originalQuery);
  const [isRunning, setIsRunning] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [showQuery, setShowQuery] = useState(false);
  const [currentResult, setCurrentResult] = useState<QueryResult>({
    results: query.results,
    columns: query.columns,
    error: query.error
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Mark as interactive once JavaScript loads
    setIsInteractive(true);
  }, []);

  useEffect(() => {
    // Auto-resize textarea to fit content
    const resizeTextarea = () => {
      if (textareaRef.current) {
        // Reset height to auto to get correct scrollHeight
        textareaRef.current.style.height = 'auto';
        // Set height to scrollHeight + a bit of padding
        textareaRef.current.style.height = (textareaRef.current.scrollHeight + 2) + 'px';
      }
    };
    
    if (isInteractive) {
      resizeTextarea();
      window.addEventListener('resize', resizeTextarea);
      return () => window.removeEventListener('resize', resizeTextarea);
    }
  }, [editableQuery, isInteractive]);

  const runQuery = async () => {
    setIsRunning(true);
    setLoadingMessage('Loading database...');
    
    try {
      // Execute the actual query
      const result = await executeQuery(editableQuery);
      setCurrentResult(result);
      setLoadingMessage('');
    } catch (error) {
      setCurrentResult({
        results: null,
        columns: null,
        error: error instanceof Error ? error.message : 'Query execution failed'
      });
      setLoadingMessage('');
    } finally {
      setIsRunning(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      runQuery();
    }
  };

  const resetQuery = () => {
    setEditableQuery(query.originalQuery);
    setCurrentResult({
      results: query.results,
      columns: query.columns,
      error: query.error
    });
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) {
      return 'NULL';
    }
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }
    return String(value);
  };

  return (
    <div className="sql-widget" data-widget-id={query.id}>
      {query.description && (
        <div className="sql-widget-header">
          <p className="sql-description">{query.description}</p>
        </div>
      )}
      
      <div className="sql-widget-body">
        {isInteractive ? (
          <>
            <div className="sql-editor-container">
              <textarea
                ref={textareaRef}
                className="sql-editor"
                value={editableQuery}
                onChange={(e) => setEditableQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter SQL query..."
                spellCheck={false}
                disabled={isRunning}
              />
              <div className="sql-editor-controls">
                <div className="sql-editor-actions">
                  <button 
                    className="sql-run-button"
                    onClick={runQuery}
                    disabled={isRunning}
                  >
                    {isRunning ? (loadingMessage || 'Running...') : 'Run'}
                  </button>
                  <button 
                    className="sql-reset-button"
                    onClick={resetQuery}
                    disabled={isRunning || editableQuery === query.originalQuery}
                  >
                    Reset
                  </button>
                </div>
                {currentResult.executionTime && !isRunning && (
                  <span className="sql-execution-time">
                    Executed in {currentResult.executionTime.toFixed(0)}ms
                  </span>
                )}
              </div>
            </div>
          </>
        ) : (
          <details className="sql-query-details" open={showQuery}>
            <summary onClick={(e) => {
              e.preventDefault();
              setShowQuery(!showQuery);
            }}>
              View SQL Query
            </summary>
            <pre className="sql-query">
              <code>{query.originalQuery}</code>
            </pre>
          </details>
        )}
        
        {currentResult.error ? (
          <div className="sql-error">
            <strong>Error:</strong> {currentResult.error}
          </div>
        ) : currentResult.results && currentResult.results.length > 0 ? (
          <div className="sql-results-wrapper">
            <table className="sql-results">
              <thead>
                <tr>
                  {currentResult.columns?.map(col => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentResult.results.map((row, idx) => (
                  <tr key={idx}>
                    {currentResult.columns?.map(col => (
                      <td key={col}>{formatValue(row[col])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {currentResult.results.length === 100 && (
              <p className="sql-note">Results limited to 100 rows</p>
            )}
          </div>
        ) : (
          <p className="sql-no-results">No results returned</p>
        )}
      </div>
    </div>
  );
}