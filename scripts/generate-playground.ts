import type { Chapter } from "./process-markdown";

export async function generatePlayground(chapters: Chapter[]) {
  const template = await Bun.file("src/templates/chapter.html").text();
  
  // Generate navigation for playground (same as chapters)
  const navigation = generateNavigation(chapters, 'playground');
  
  // Playground content
  const playgroundContent = `
    <h1>SQL Playground</h1>
    <p>Write and share custom SQL queries against the EHI database.</p>
    
    <div class="playground-container">
      <div class="playground-form">
        <div class="form-group">
          <label for="query-name">Query Name</label>
          <input type="text" id="query-name" placeholder="Give your query a descriptive name">
        </div>

        <div class="form-group">
          <label for="sql-query">SQL Query</label>
          <div class="sql-widget" id="playground-widget">
            <textarea id="sql-query" class="sql-query-editor" placeholder="SELECT * FROM patient LIMIT 10">SELECT * FROM patient LIMIT 10</textarea>
            <div class="sql-widget-controls">
              <button class="sql-widget-run" onclick="runPlaygroundQuery()">Run Query (Ctrl+Enter)</button>
              <button class="sql-widget-reset" onclick="clearPlayground()">Clear</button>
              <button class="sql-widget-share" onclick="shareQuery()" id="share-button">Copy Link</button>
            </div>
            <div class="sql-widget-results" id="playground-results">
              <p class="loading-message">Loading database...</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <style>
      .playground-container {
        margin-top: 2rem;
      }
      
      .playground-form {
        background: var(--color-bg-secondary);
        padding: 1.5rem;
        border-radius: var(--radius-md);
        margin-bottom: 1.5rem;
      }
      
      .form-group {
        margin-bottom: 1rem;
      }
      
      .form-group label {
        display: block;
        font-weight: 600;
        margin-bottom: 0.5rem;
        color: var(--color-text);
      }
      
      .form-group input[type="text"] {
        width: 100%;
        padding: 0.5rem;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        font-size: 1rem;
        background: var(--color-bg);
        color: var(--color-text);
      }
      
      #playground-widget .sql-query-editor {
        min-height: 150px;
      }
      
      .loading-message {
        text-align: center;
        color: var(--color-text-secondary);
        padding: 2rem;
      }
      
      #share-button {
        background: #10b981;
        color: white;
        border-color: #10b981;
      }
      
      #share-button:hover {
        background: #059669;
        border-color: #059669;
        color: white;
      }
      
      .sql-widget-controls button {
        margin-right: 0.5rem;
      }
    </style>

    <script>
      // Playground specific functions
      let playgroundDb = null;
      
      // Initialize playground when database is ready
      document.addEventListener('DOMContentLoaded', async () => {
        try {
          // Wait for main database to initialize
          playgroundDb = await initDatabase();
          document.getElementById('playground-results').innerHTML = '<p>Database loaded. Ready to run queries!</p>';
          
          // Load from URL if present
          loadFromUrl();
          
          // Add keyboard shortcut
          document.getElementById('sql-query').addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
              e.preventDefault();
              runPlaygroundQuery();
            }
          });
          
          // Update button text based on device
          updateShareButton();
          
          // Auto-update URL as user types
          document.getElementById('query-name').addEventListener('input', updateUrl);
          document.getElementById('sql-query').addEventListener('input', updateUrl);
        } catch (error) {
          document.getElementById('playground-results').innerHTML = 
            '<div class="sql-widget-error">Failed to load database: ' + error.message + '</div>';
        }
      });
      
      // Parse URL parameters
      function parseUrlParams() {
        const params = new URLSearchParams(window.location.search);
        const encoded = params.get('q');
        
        if (encoded) {
          try {
            const decoded = atob(encoded);
            return JSON.parse(decoded);
          } catch (e) {
            console.error('Failed to decode query from URL:', e);
          }
        }
        
        return null;
      }
      
      // Load query from URL
      function loadFromUrl() {
        const queryData = parseUrlParams();
        
        if (queryData) {
          if (queryData.name) {
            document.getElementById('query-name').value = queryData.name;
          }
          if (queryData.query) {
            document.getElementById('sql-query').value = queryData.query;
            // Auto-run the query
            runPlaygroundQuery();
          }
        }
      }
      
      // Run playground query
      async function runPlaygroundQuery() {
        const query = document.getElementById('sql-query').value.trim();
        const resultsDiv = document.getElementById('playground-results');
        
        if (!query) {
          resultsDiv.innerHTML = '<div class="sql-widget-error">Please enter a SQL query</div>';
          return;
        }
        
        if (!playgroundDb) {
          resultsDiv.innerHTML = '<div class="sql-widget-error">Database is still loading...</div>';
          return;
        }
        
        try {
          const stmt = playgroundDb.prepare(query);
          const results = [];
          let columns = null;
          
          while (stmt.step()) {
            if (!columns) {
              columns = stmt.getColumnNames();
            }
            results.push(stmt.get());
          }
          stmt.free();
          
          // Try to get column names even if no results
          if (results.length === 0 && !columns) {
            try {
              const limitedQuery = query + ' LIMIT 0';
              const tempStmt = playgroundDb.prepare(limitedQuery);
              columns = tempStmt.getColumnNames();
              tempStmt.free();
            } catch (e) {
              // Ignore error
            }
          }
          
          displayResults(resultsDiv, results, columns || []);
          updateUrl();
        } catch (error) {
          displayError(resultsDiv, error.message);
        }
      }
      
      // Clear playground
      function clearPlayground() {
        document.getElementById('query-name').value = '';
        document.getElementById('sql-query').value = '';
        document.getElementById('playground-results').innerHTML = '<p>Query cleared.</p>';
        
        // Clear URL parameters
        const url = new URL(window.location.href);
        url.searchParams.delete('q');
        window.history.replaceState({}, '', url);
      }
      
      // Share/copy link
      async function shareQuery() {
        const url = new URL(window.location.href);
        const button = document.getElementById('share-button');
        
        try {
          // Check if Web Share API is available and we're on mobile
          if (navigator.share && /mobile|android|ios/i.test(navigator.userAgent)) {
            await navigator.share({
              title: 'SQL Query',
              text: document.getElementById('query-name').value || 'SQL Query',
              url: url.toString()
            });
          } else {
            // Copy to clipboard
            await navigator.clipboard.writeText(url.toString());
            
            // Show feedback
            const originalText = button.textContent;
            button.textContent = 'Copied!';
            setTimeout(() => {
              button.textContent = originalText;
            }, 2000);
          }
        } catch (error) {
          console.error('Failed to share/copy:', error);
        }
      }
      
      // Update share button text based on capabilities
      function updateShareButton() {
        const button = document.getElementById('share-button');
        if (navigator.share && /mobile|android|ios/i.test(navigator.userAgent)) {
          button.textContent = 'Share Link';
        } else {
          button.textContent = 'Copy Link';
        }
      }
      
      // Update URL without reloading
      function updateUrl() {
        const data = {
          name: document.getElementById('query-name').value.trim(),
          query: document.getElementById('sql-query').value.trim()
        };
        
        if (data.query) {
          const encoded = btoa(JSON.stringify(data));
          const url = new URL(window.location.href);
          url.searchParams.set('q', encoded);
          window.history.replaceState({}, '', url);
        }
      }
    </script>
  `;
  
  // No prev/next links for playground
  const prevNextLinks = '<div class="prev-next-nav"></div>';
  
  // Replace placeholders in template
  const playgroundHtml = template
    .replace('{{title}}', 'SQL Playground')
    .replace('{{content}}', playgroundContent)
    .replace('{{navigation}}', navigation)
    .replace('{{prev-next-links}}', prevNextLinks)
    .replace('{{chapter-slug}}', 'playground'); // For edit link (though we might want to hide it)
  
  await Bun.write("dist/playground.html", playgroundHtml);
}

function generateNavigation(chapters: Chapter[], currentSlug: string): string {
  const grouped = new Map<string, Chapter[]>();
  
  // Group chapters by their main number (0, 1, 2, etc.)
  for (const chapter of chapters) {
    const mainNum = chapter.order.split('.')[0];
    if (!grouped.has(mainNum)) {
      grouped.set(mainNum, []);
    }
    grouped.get(mainNum)!.push(chapter);
  }
  
  let nav = '<h2><a href="index.html">Epic EHI Missing Manual</a></h2>';
  nav += '<nav class="chapter-nav">';
  
  const partNames: Record<string, string> = {
    '00': 'Getting Started',
    '01': 'Core Architecture', 
    '02': 'Fundamental Patterns',
    '03': 'Clinical Data Model',
    '04': 'Financial Data Model',
    '05': 'Technical Reference'
  };
  
  for (const [part, chapters] of grouped) {
    nav += `<div class="nav-section">`;
    nav += `<h3>Part ${part}: ${partNames[part] || 'Additional Topics'}</h3>`;
    nav += '<ul>';
    
    for (const chapter of chapters) {
      const isActive = chapter.slug === currentSlug;
      // Remove "Chapter X.X:" prefix from title if present
      const cleanTitle = chapter.title.replace(/^Chapter\s+\d+\.\d+:\s*/, '');
      nav += `<li class="${isActive ? 'active' : ''}">`;
      nav += `<a href="chapters/${chapter.slug}">${cleanTitle}</a>`;
      nav += '</li>';
    }
    
    nav += '</ul></div>';
  }
  
  nav += '</nav>';
  return nav;
}