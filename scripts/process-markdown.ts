import { marked } from "marked";
import hljs from "highlight.js";
import { Database } from "bun:sqlite";
import { readdir } from "node:fs/promises";
import path from "node:path";

export interface Chapter {
  filename: string;
  title: string;
  order: string;
  slug: string;
  content: string;
}

// Configure marked with syntax highlighting
marked.setOptions({
  highlight: function(code, lang) {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  }
});

// Track query count for unique IDs
let queryCounter = 0;

// Open the database for executing queries at build time
const db = new Database("src/data/ehi.sqlite", { readonly: true });

// Pre-process markdown to handle example-query tags
function preprocessMarkdown(content: string): string {
  const queryRegex = /<example-query\s+description="([^"]+)">([\s\S]*?)<\/example-query>/g;
  
  return content.replace(queryRegex, (match, description, query) => {
    queryCounter++;
    const queryId = `query-${queryCounter}`;
    
    // Execute the query at build time
    let results = [];
    let error = null;
    let columnNames = [];
    
    try {
      const stmt = db.query(query.trim());
      results = stmt.all();
      
      // Get column names if there are results
      if (results.length > 0) {
        columnNames = Object.keys(results[0]);
      }
    } catch (e: any) {
      error = e.message;
    }
    
    // Escape data for HTML attributes
    const escapeHtml = (str: string) => {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };
    
    const escapedQuery = escapeHtml(query.trim());
    const escapedResults = escapeHtml(JSON.stringify({ results, columns: columnNames, error }));
    
    // Generate the widget HTML
    const widgetHtml = `
<div class="sql-widget" id="${queryId}" 
     data-original-query="${escapedQuery}"
     data-build-results="${escapedResults}">
  <div class="sql-widget-header">
    <span class="sql-widget-description">${escapeHtml(description)}</span>
    <div class="sql-widget-actions">
      <button class="sql-widget-run" onclick="runQuery('${queryId}')">Run Query</button>
      <button class="sql-widget-reset" onclick="resetQuery('${queryId}')">Reset</button>
    </div>
  </div>
  <div class="sql-widget-editor">
    <textarea class="sql-query-editor" rows="6">${query.trim()}</textarea>
  </div>
  <div class="sql-widget-results">
    ${error ? `<div class="sql-error">${escapeHtml(error)}</div>` : renderResultsTable(results, columnNames)}
  </div>
</div>`;
    
    // Return as a marked passthrough token so it's not processed
    return `<div class="sql-widget-placeholder">${widgetHtml}</div>`;
  });
}

function renderResultsTable(results: any[], columns: string[]): string {
  if (results.length === 0) {
    return '<div class="sql-no-results">No results returned</div>';
  }
  
  const escapeHtml = (str: any) => {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  };
  
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
    for (const col of columns) {
      html += `<td>${escapeHtml(row[col])}</td>`;
    }
    html += '</tr>';
  }
  html += '</tbody>';
  
  html += '</table>';
  return html;
}

// Custom renderer extensions
const renderer = new marked.Renderer();

// Add custom wrapper for SQL code blocks
const originalCodeRenderer = renderer.code.bind(renderer);
renderer.code = function(code: string, language: string | undefined) {
  if (language === 'sql') {
    return `<div class="code-block sql-code">${originalCodeRenderer(code, language)}</div>`;
  }
  return originalCodeRenderer(code, language);
};

// Allow raw HTML to pass through (for our widgets)
renderer.html = function(html: string) {
  return html;
};

export async function processChapters(): Promise<Chapter[]> {
  const chaptersDir = "src/chapters";
  const files = await readdir(chaptersDir);
  const markdownFiles = files.filter(f => f.endsWith('.md')).sort();
  
  const chapters: Chapter[] = [];
  
  // Reset query counter for each build
  queryCounter = 0;
  
  for (const file of markdownFiles) {
    const content = await Bun.file(path.join(chaptersDir, file)).text();
    
    // Extract title from first # heading
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : file.replace('.md', '');
    
    // Extract order from filename (e.g., "01.2" from "01.2-some-title.md")
    const orderMatch = file.match(/^(\d+\.\d+)/);
    const order = orderMatch ? orderMatch[1] : '99';
    
    // Create slug from filename
    const slug = file.replace('.md', '').replace(/^\d+\.\d+-/, '');
    
    // Pre-process markdown to handle example-query tags
    const preprocessedContent = preprocessMarkdown(content);
    
    // Parse markdown with custom renderer
    marked.use({ renderer, breaks: false, gfm: true });
    const html = marked.parse(preprocessedContent);
    
    // Apply template
    const chapterHtml = await applyChapterTemplate({
      title,
      content: html,
      slug,
      order
    }, chapters, file);
    
    // Write chapter file
    await Bun.write(`dist/chapters/${slug}.html`, chapterHtml);
    
    chapters.push({
      filename: file,
      title,
      order,
      slug,
      content: html
    });
  }
  
  return chapters;
}

async function applyChapterTemplate(
  chapter: { title: string; content: string; slug: string; order: string },
  allChapters: Chapter[],
  currentFile: string
): Promise<string> {
  const template = await Bun.file("src/templates/chapter.html").text();
  
  // Find previous and next chapters
  const currentIndex = allChapters.findIndex(ch => ch.filename === currentFile);
  const prevChapter = currentIndex > 0 ? allChapters[currentIndex - 1] : null;
  const nextChapter = currentIndex < allChapters.length - 1 ? allChapters[currentIndex + 1] : null;
  
  // Generate navigation
  const navigation = generateNavigation(allChapters, chapter.slug);
  const prevNextLinks = generatePrevNextLinks(prevChapter, nextChapter);
  
  return template
    .replace('{{title}}', chapter.title)
    .replace('{{content}}', chapter.content)
    .replace('{{navigation}}', navigation)
    .replace('{{prev-next-links}}', prevNextLinks);
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
  
  let nav = '<div class="sidebar-content">';
  nav += '<h2><a href="../index.html">Epic EHI Missing Manual</a></h2>';
  nav += '<nav class="chapter-nav">';
  
  const partNames: Record<string, string> = {
    '00': 'Getting Started',
    '01': 'Core Architecture', 
    '02': 'Fundamental Patterns',
    '03': 'Clinical Data Model'
  };
  
  for (const [part, chapters] of grouped) {
    nav += `<div class="nav-section">`;
    nav += `<h3>Part ${part}: ${partNames[part] || 'Additional Topics'}</h3>`;
    nav += '<ul>';
    
    for (const chapter of chapters) {
      const isActive = chapter.slug === currentSlug;
      nav += `<li class="${isActive ? 'active' : ''}">`;
      nav += `<a href="${chapter.slug}.html">${chapter.order} ${chapter.title}</a>`;
      nav += '</li>';
    }
    
    nav += '</ul></div>';
  }
  
  nav += '</nav></div>';
  return nav;
}

function generatePrevNextLinks(prev: Chapter | null, next: Chapter | null): string {
  let links = '<div class="prev-next-nav">';
  
  if (prev) {
    links += `<a href="${prev.slug}.html" class="prev-link">← ${prev.title}</a>`;
  } else {
    links += '<span class="prev-link disabled">← Previous</span>';
  }
  
  if (next) {
    links += `<a href="${next.slug}.html" class="next-link">${next.title} →</a>`;
  } else {
    links += '<span class="next-link disabled">Next →</span>';
  }
  
  links += '</div>';
  return links;
}