import { useState, useEffect, useRef } from 'react';
import { executeQuery } from '../lib/sql-executor';
import allQueries from '../data/all-queries.json';

// Match the actual return type from sql-executor
interface QueryResult {
  results: any[] | null;
  columns: string[] | null;
  error: string | null;
  executionTime: number;
}

interface SavedQuery {
  name: string;
  query: string;
}

interface ExampleQuery {
  id: string;
  name: string;
  description: string;
  query: string;
  chapterNumber: string;
  chapterTitle: string;
}

export default function SQLPlayground() {
  const [query, setQuery] = useState('SELECT * FROM PATIENT LIMIT 10;');
  const [queryName, setQueryName] = useState('My Query');
  const [results, setResults] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedExample, setSelectedExample] = useState<string>('');
  const [shareButtonText, setShareButtonText] = useState('🔗 Share');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Map the queries array to our format
  const exampleQueries: ExampleQuery[] = (allQueries as any[]).map((query: any) => {
    // Extract chapter info from the query ID
    const [chapterNumber, ...rest] = query.chapterId.split('-');
    const chapterTitle = rest.join(' ').replace(/-/g, ' ');
    
    return {
      id: query.id,
      name: query.description || 'Query ' + query.index,
      description: query.description || '',
      query: query.originalQuery,
      chapterNumber: chapterNumber,
      chapterTitle: chapterTitle
    };
  }).sort((a, b) => {
    // Sort by chapter number, then by the query ID
    const chapterCompare = a.chapterNumber.localeCompare(b.chapterNumber);
    if (chapterCompare !== 0) return chapterCompare;
    return a.id.localeCompare(b.id);
  });

  // Load query from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlQuery = params.get('q');
    const urlName = params.get('name');
    
    if (urlQuery) {
      try {
        const decodedQuery = atob(urlQuery);
        setQuery(decodedQuery);
        if (urlName) {
          setQueryName(decodeURIComponent(urlName));
        }
      } catch (e) {
        console.error('Failed to decode query from URL', e);
      }
    }
  }, []);

  // Update URL when query changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const params = new URLSearchParams();
      params.set('q', btoa(query));
      params.set('name', encodeURIComponent(queryName));
      
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({}, '', newUrl);
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [query, queryName]);

  const handleRunQuery = async () => {
    setIsLoading(true);
    setError(null);
    setResults(null);
    
    try {
      const result = await executeQuery(query);
      setResults(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleChange = async (exampleId: string) => {
    setSelectedExample(exampleId);
    if (exampleId) {
      const example = exampleQueries.find(q => q.id === exampleId);
      if (example) {
        setQuery(example.query);
        setQueryName(example.description || example.name);
        // Auto-run the query after a brief delay to ensure state is updated
        setTimeout(() => {
          handleRunQuery();
        }, 100);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRunQuery();
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: queryName,
          text: `Check out this SQL query: ${queryName}`,
          url: shareUrl
        });
      } catch (err) {
        console.log('Share failed:', err);
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(shareUrl);
      setShareButtonText('✓ Copied!');
      setTimeout(() => setShareButtonText('🔗 Share'), 2000);
    }
  };


  return (
    <div className="sql-playground">
      <div className="playground-header">
        <div className="playground-controls">
          <div className="control-group">
            <label htmlFor="example-select">Load Example:</label>
            <select
              id="example-select"
              value={selectedExample}
              onChange={(e) => handleExampleChange(e.target.value)}
              className="example-select"
            >
              <option value="">-- Select an example query --</option>
              {exampleQueries.map((example) => (
                <option key={example.id} value={example.id}>
                  {example.chapterNumber} - {example.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="control-group">
            <label htmlFor="query-name">Query Name:</label>
            <input
              id="query-name"
              type="text"
              value={queryName}
              onChange={(e) => setQueryName(e.target.value)}
              className="query-name-input"
              placeholder="Name your query"
            />
          </div>
        </div>
        
      </div>

      <div className="sql-editor-container">
        <div className="sql-editor-header">
          <span className="sql-label">SQL Query Editor</span>
          <div className="sql-editor-actions">
            <button
              onClick={handleRunQuery}
              disabled={isLoading}
              className="sql-run-button"
              title="Run Query (Ctrl+Enter)"
            >
              {isLoading ? '⏳ Running...' : '▶ Run Query'}
            </button>
            <button onClick={handleShare} className="sql-share-button" title="Share Query">
              {shareButtonText}
            </button>
          </div>
        </div>
        
        <textarea
          ref={textareaRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="sql-editor-textarea"
          placeholder="Enter your SQL query here..."
          spellCheck={false}
          rows={10}
        />
      </div>

      {error && (
        <div className="sql-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {results && results.results && (
        <div className="sql-results">
          <div className="sql-results-header">
            <span>Results ({results.results.length} rows)</span>
          </div>
          <div className="sql-results-container">
            <table className="sql-results-table">
              <thead>
                <tr>
                  {results.columns.map((col, i) => (
                    <th key={i}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.results.map((row, i) => (
                  <tr key={i}>
                    {results.columns.map((col, j) => (
                      <td key={j}>{row[col] === null ? 'NULL' : String(row[col])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="playground-tips">
        <h3>Tips:</h3>
        <ul>
          <li>Press <kbd>Ctrl</kbd>+<kbd>Enter</kbd> to run your query</li>
          <li>Your query is automatically saved to the URL - bookmark or share the link!</li>
          <li>Try loading an example query from the dropdown above</li>
          <li>The database contains Epic EHI sample data with patient, encounter, and clinical tables</li>
        </ul>
      </div>
    </div>
  );
}