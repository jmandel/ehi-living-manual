// SQL Widget functionality
let sqliteDb = null;
let isDbLoading = false;
let dbLoadPromise = null;

// Initialize SQL.js and load the database
async function initDatabase() {
  if (sqliteDb) return sqliteDb;
  if (isDbLoading) return dbLoadPromise;
  
  isDbLoading = true;
  dbLoadPromise = (async () => {
    try {
      // Initialize SQL.js with proper config
      const sqlPromise = window.initSqlJs({
        locateFile: file => `../lib/sql.js/${file}`
      });
      
      const dataPromise = fetch('../assets/data/ehi.sqlite').then(res => res.arrayBuffer());
      const [SQL, buf] = await Promise.all([sqlPromise, dataPromise]);
      
      // Create database from buffer
      const db = new SQL.Database(new Uint8Array(buf));
      sqliteDb = db;
      isDbLoading = false;
      
      console.log('✅ SQLite database loaded successfully');
      return db;
    } catch (error) {
      console.error('Failed to load database:', error);
      isDbLoading = false;
      throw error;
    }
  })();
  
  return dbLoadPromise;
}

// Run a SQL query
async function runQuery(widgetId) {
  const widget = document.getElementById(widgetId);
  const textarea = widget.querySelector('.sql-query-editor');
  const resultsDiv = widget.querySelector('.sql-widget-results');
  const runButton = widget.querySelector('.sql-widget-run');
  
  // Update button state
  runButton.textContent = 'Running...';
  runButton.disabled = true;
  
  try {
    // Ensure database is loaded
    const db = await initDatabase();
    
    // Get query from textarea
    const query = textarea.value.trim();
    
    // Execute query
    const stmt = db.prepare(query);
    const results = [];
    let columns = null;
    
    while (stmt.step()) {
      if (!columns) {
        columns = stmt.getColumnNames();
      }
      results.push(stmt.get());
    }
    stmt.free();
    
    // Display results
    if (results.length === 0 && !columns) {
      // Try to get column names even if no results
      try {
        const limitedQuery = `${query} LIMIT 0`;
        const tempStmt = db.prepare(limitedQuery);
        columns = tempStmt.getColumnNames();
        tempStmt.free();
      } catch (e) {
        // Ignore error, just means we can't get column names
      }
    }
    
    displayResults(resultsDiv, results, columns || []);
    
  } catch (error) {
    displayError(resultsDiv, error.message);
  } finally {
    runButton.textContent = 'Run Query';
    runButton.disabled = false;
  }
}

// Reset query to original
function resetQuery(widgetId) {
  const widget = document.getElementById(widgetId);
  const textarea = widget.querySelector('.sql-query-editor');
  const resultsDiv = widget.querySelector('.sql-widget-results');
  
  // Get original query from data attribute
  const originalQuery = widget.dataset.originalQuery;
  textarea.value = originalQuery;
  
  // Trigger resize
  textarea.style.height = 'auto';
  textarea.style.height = textarea.scrollHeight + 'px';
  
  // Restore build-time results
  const buildResults = JSON.parse(widget.dataset.buildResults);
  if (buildResults.error) {
    displayError(resultsDiv, buildResults.error);
  } else {
    displayResults(resultsDiv, buildResults.results, buildResults.columns);
  }
}

// Display query results in a table
function displayResults(container, results, columns) {
  if (!results || results.length === 0) {
    container.innerHTML = '<div class="sql-no-results">No results returned</div>';
    return;
  }
  
  let html = '<table class="sql-results-table">';
  
  // Header
  html += '<thead><tr>';
  for (const col of columns) {
    html += `<th>${escapeHtml(col)}</th>`;
  }
  html += '</tr></thead>';
  
  // Body
  html += '<tbody>';
  for (const row of results) {
    html += '<tr>';
    if (Array.isArray(row)) {
      // Handle array format from SQL.js
      for (let i = 0; i < columns.length; i++) {
        const value = row[i];
        html += `<td>${escapeHtml(value)}</td>`;
      }
    } else {
      // Handle object format from build results
      for (const col of columns) {
        const value = row[col];
        html += `<td>${escapeHtml(value)}</td>`;
      }
    }
    html += '</tr>';
  }
  html += '</tbody>';
  
  html += '</table>';
  container.innerHTML = html;
}

// Display error message
function displayError(container, message) {
  container.innerHTML = `<div class="sql-error">${escapeHtml(message)}</div>`;
}

// Escape HTML for safe display
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Add keyboard shortcuts
document.addEventListener('DOMContentLoaded', () => {
  // Initialize all SQL widgets
  document.querySelectorAll('.sql-widget').forEach(widget => {
    const textarea = widget.querySelector('.sql-query-editor');
    const runButton = widget.querySelector('.sql-widget-run');
    
    // Ctrl+Enter to run query
    textarea.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        runButton.click();
      }
    });
    
    // Auto-resize textarea
    const autoResize = () => {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    };
    
    textarea.addEventListener('input', autoResize);
    
    // Initial resize on page load
    autoResize();
  });
  
  // Pre-load database in background
  initDatabase().catch(error => {
    console.error('Failed to pre-load database:', error);
  });
});

// Export functions for onclick handlers
window.runQuery = runQuery;
window.resetQuery = resetQuery;