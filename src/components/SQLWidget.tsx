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
  const [showAllRows, setShowAllRows] = useState(false);
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

  const runQuery = async (fetchAll = false) => {
    setIsRunning(true);
    setLoadingMessage(fetchAll ? 'Loading all results...' : 'Loading database...');
    if (!fetchAll) {
      setShowAllRows(false); // Reset to show only 100 rows for new results
    }
    
    try {
      // Execute the actual query with optional limit
      const result = await executeQuery(editableQuery, fetchAll ? undefined : 100);
      setCurrentResult(result);
      setLoadingMessage('');
      if (fetchAll) {
        setShowAllRows(true);
      }
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
      runQuery(false);
    }
  };

  const resetQuery = () => {
    setEditableQuery(query.originalQuery);
    setCurrentResult({
      results: query.results,
      columns: query.columns,
      error: query.error
    });
    setShowAllRows(false);
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
                    onClick={() => runQuery(false)}
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
          <>
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
            </div>
            {(() => {
              console.log('Debug info:', {
                resultsLength: currentResult.results.length,
                isInteractive,
                showAllRows,
                hasMore: currentResult.hasMore
              });
              
              if (currentResult.hasMore && isInteractive) {
                return (
                  <p className="sql-note">
                    Results limited to {currentResult.results.length} rows{' '}
                    <button 
                      className="show-all-button"
                      onClick={() => runQuery(true)}
                      disabled={isRunning}
                    >
                      Show all results
                    </button>
                  </p>
                );
              } else if (currentResult.hasMore && !isInteractive) {
                return (
                  <p className="sql-note">
                    Results limited to {currentResult.results.length} rows
                  </p>
                );
              } else if (showAllRows && currentResult.results.length > 100) {
                return (
                  <p className="sql-note">
                    Showing all {currentResult.results.length} rows
                  </p>
                );
              }
              
              return null;
            })()}
          </>
        ) : (
          <p className="sql-no-results">No results returned</p>
        )}
      </div>
    </div>
  );
}