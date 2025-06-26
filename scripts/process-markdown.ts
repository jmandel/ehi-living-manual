import { $ } from "bun"; // Import Bun's shell utility
import path from "path";
import fs from "fs/promises"; // Use fs.promises for async file operations
import { marked } from "marked";
import { JSDOM } from "jsdom"; // For parsing HTML and extracting example-query content
import { Database } from "bun:sqlite";

// Define the structure for a chapter
interface Chapter {
  slug: string;
  title: string;
  content: string;
  markdown: string; // Store original markdown for search index and copy button
  order: string;
  filename: string;
  prev?: { slug: string; title: string };
  next?: { slug: string; title: string };
}

// Helper function to escape HTML
function escapeHtml(str: any): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Function to extract and validate Mermaid diagrams
async function validateMermaidDiagrams(markdownContent: string, filePath: string): Promise<void> {
  const mermaidRegex = /```mermaid\n([\s\S]*?)\n```/g;
  let match;
  let diagramIndex = 0;
  let hasErrors = false;

  while ((match = mermaidRegex.exec(markdownContent)) !== null) {
    diagramIndex++;
    const mermaidCode = match[1];
    const tempFilePath = path.join('/tmp', `mermaid_diagram_${Date.now()}_${diagramIndex}.mmd`);

    try {
      await Bun.write(tempFilePath, mermaidCode);

      // Execute mmdc to attempt rendering (which validates syntax)
      // We redirect stderr to capture potential errors
      const { exitCode, stderr } = await $`./node_modules/.bin/mmdc -i ${tempFilePath} -o /dev/null`.nothrow();

      if (exitCode !== 0) {
        console.error(`\n❌ Mermaid syntax error detected in ${filePath} (Diagram ${diagramIndex}):`);
        console.error(stderr.toString());
        console.error(`Invalid Mermaid code:\n${mermaidCode}\n`);
        hasErrors = true;
      }
    } catch (error) {
      console.error(`\n❌ Error processing Mermaid diagram in ${filePath} (Diagram ${diagramIndex}):`);
      console.error(error);
      console.error(`Mermaid code:\n${mermaidCode}\n`);
      hasErrors = true;
    } finally {
      // Clean up temporary file
      await fs.unlink(tempFilePath).catch(() => {}); // Ignore if file doesn't exist
    }
  }

  if (hasErrors) {
    throw new Error(`Mermaid validation failed for one or more diagrams in ${filePath}.`);
  }
}


export async function processChapters(): Promise<Chapter[]> {
  const chaptersDir = "src/chapters";
  const chapterFiles = await fs.readdir(chaptersDir);
  const chapters: Chapter[] = [];
  
  // Open the SQLite database for executing queries at build time
  const db = new Database("src/data/ehi.sqlite", { readonly: true });

  // Configure marked ONCE before processing chapters
  const renderer = new marked.Renderer();
  let mermaidCounter = 0;
  
  // Override the code renderer
  renderer.code = function(code: any, language: any, isEscaped: any): string {
    // Handle marked's object format
    let codeText = code;
    let lang = language;
    
    if (typeof code === 'object' && code !== null) {
      codeText = code.text || '';
      lang = code.lang || '';
    }
    
    if (lang === 'mermaid') {
      // Generate unique ID for this diagram
      mermaidCounter++;
      const mermaidId = `mermaid-${mermaidCounter}`;
      // Return mermaid widget with tabs for diagram and code
      return `<div class="mermaid-widget" id="widget-${mermaidId}">
  <div class="mermaid-tabs">
    <button class="mermaid-tab active" onclick="showMermaidTab('${mermaidId}', 'diagram')">Diagram</button>
    <button class="mermaid-tab" onclick="showMermaidTab('${mermaidId}', 'code')">Code</button>
  </div>
  <div class="mermaid-content">
    <div class="mermaid-diagram" id="diagram-${mermaidId}">
      <div class="mermaid">${codeText}</div>
    </div>
    <div class="mermaid-code" id="code-${mermaidId}" style="display: none;">
      <pre><code class="language-mermaid">${escapeHtml(codeText)}</code></pre>
    </div>
  </div>
</div>`;
    }
    // Use default code rendering for other languages
    return `<pre><code class="language-${lang || ''}">${escapeHtml(codeText)}</code></pre>`;
  };
  
  marked.setOptions({
    renderer: renderer,
    gfm: true,
    breaks: false
  });

  // Sort chapters to ensure correct order for prev/next links
  chapterFiles.sort((a, b) => {
    const numA = parseFloat(a.split('-')[0]);
    const numB = parseFloat(b.split('-')[0]);
    return numA - numB;
  });

  let fileCounter = 0;
  for (const file of chapterFiles) {
    if (!file.endsWith(".md")) continue;
    fileCounter++;

    const filePath = path.join(chaptersDir, file);
    const slug = file.replace(".md", ".html");
    const markdown = await Bun.file(filePath).text();

    // Skip mermaid validation - we render on client side

    // Extract title from markdown (first H1)
    const titleMatch = markdown.match(/^#\s*(.*)/m);
    const title = titleMatch ? titleMatch[1].trim() : "Untitled Chapter";
    
    // Extract order from filename (e.g., "01.2" from "01.2-some-title.md")
    const orderMatch = file.match(/^(\d+\.\d+)/);
    const order = orderMatch ? orderMatch[1] : '99.9';

    // Process example-query blocks
    let processedMarkdown = markdown;
    const exampleQueryRegex = /<example-query description="([^"]+)">\n([\s\S]*?)\n<\/example-query>/g;
    let matchExample;
    let exampleIndex = 0;

    while ((matchExample = exampleQueryRegex.exec(markdown)) !== null) {
      const description = matchExample[1];
      const queryCode = matchExample[2].trim();
      const widgetId = `sql-widget-${slug.replace('.html', '')}-${exampleIndex++}`;

      // Execute query at build time
      let results = [];
      let columns = [];
      let error = null;
      
      try {
        const stmt = db.prepare(queryCode);
        results = stmt.all();
        
        // Get column names if there are results
        if (results.length > 0) {
          columns = Object.keys(results[0]);
        } else {
          // Try to get column names even if no results
          try {
            const limitedQuery = queryCode + ' LIMIT 0';
            const tempStmt = db.prepare(limitedQuery);
            const tempResult = tempStmt.all();
            if (tempResult.length === 0 && stmt.columns) {
              columns = stmt.columns.map(col => col.name);
            }
          } catch (e) {
            // Ignore error, just means we can't get column names
          }
        }
      } catch (e: any) {
        error = e.message;
      }


      const escapedQuery = escapeHtml(queryCode);
      const escapedResults = escapeHtml(JSON.stringify({ results, columns, error }));

      // Generate HTML for results
      let resultsHtml = '';
      if (error) {
        resultsHtml = `<div class="sql-error">${escapeHtml(error)}</div>`;
      } else if (results.length === 0) {
        resultsHtml = '<div class="sql-no-results">No results found.</div>';
      } else {
        resultsHtml = '<table class="sql-results-table"><thead><tr>';
        columns.forEach(col => {
          resultsHtml += `<th>${escapeHtml(col)}</th>`;
        });
        resultsHtml += '</tr></thead><tbody>';
        results.forEach(row => {
          resultsHtml += '<tr>';
          columns.forEach(col => {
            const value = row[col];
            resultsHtml += `<td>${value === null ? '<em>NULL</em>' : escapeHtml(String(value))}</td>`;
          });
          resultsHtml += '</tr>';
        });
        resultsHtml += '</tbody></table>';
        resultsHtml += `<div class="row-count">${results.length} row${results.length !== 1 ? 's' : ''} returned</div>`;
      }

      // Render the SQL widget HTML with build-time results
      const sqlWidgetHtml = `
<div class="sql-widget" id="${widgetId}"
     data-original-query="${escapedQuery}"
     data-build-results='${escapedResults}'>
  <div class="sql-widget-header">
    <span class="sql-widget-description">${description}</span>
    <div class="sql-widget-actions">
      <button class="sql-widget-run" onclick="runQuery('${widgetId}')">Run Query</button>
      <button class="sql-widget-reset" onclick="resetQuery('${widgetId}')">Reset</button>
    </div>
  </div>
  <div class="sql-widget-editor">
    <textarea class="sql-query-editor" spellcheck="false">${queryCode}</textarea>
  </div>
  <div class="sql-widget-results">
    ${resultsHtml}
  </div>
</div>`;
      processedMarkdown = processedMarkdown.replace(matchExample[0], sqlWidgetHtml);
    }

    // Convert markdown to HTML (renderer already configured)
    const content = marked.parse(processedMarkdown);

    chapters.push({ slug, title, content, markdown, order, filename: file });
  }

  // Assign prev/next links
  for (let i = 0; i < chapters.length; i++) {
    if (i > 0) {
      chapters[i].prev = {
        slug: chapters[i - 1].slug,
        title: chapters[i - 1].title,
      };
    }
    if (i < chapters.length - 1) {
      chapters[i].next = {
        slug: chapters[i + 1].slug,
        title: chapters[i + 1].title,
      };
    }
  }

  // Generate HTML for each chapter
  const chapterTemplate = await Bun.file("src/templates/chapter.html").text();
  for (const chapter of chapters) {
    let chapterHtml = chapterTemplate
      .replace(/{{title}}/g, chapter.title)
      .replace(/{{content}}/g, chapter.content)
      .replace(/{{chapter-slug}}/g, chapter.slug.replace('.html', '')); // For GitHub edit link

    // Generate navigation HTML with proper grouping
    const navigation = generateNavigation(chapters, chapter.slug);
    chapterHtml = chapterHtml.replace(/{{navigation}}/g, navigation);

    // Generate prev/next links HTML
    let prevNextLinksHtml = "";
    if (chapter.prev || chapter.next) {
      prevNextLinksHtml = `\n        <div class="prev-next-nav">\n          ${
            chapter.prev
              ? `<a href="../chapters/${chapter.prev.slug}" class="prev-link">\n                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">\n                    <polyline points="15 18 9 12 15 6"></polyline>\n                  </svg>\n                  <span>${chapter.prev.title}</span>\n                </a>`
              : `<span class="prev-link disabled"></span>`
          }\n          ${
            chapter.next
              ? `<a href="../chapters/${chapter.next.slug}" class="next-link">\n                  <span>${chapter.next.title}</span>\n                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">\n                    <polyline points="9 18 15 12 9 6"></polyline>\n                  </svg>\n                </a>`
              : `<span class="next-link disabled"></span>`
          }\n        </div>\n      `;
    }
    chapterHtml = chapterHtml.replace(/{{prev-next-links}}/g, prevNextLinksHtml);

    await Bun.write(`dist/chapters/${chapter.slug}`, chapterHtml);
    // Also copy original markdown for the "Copy" button
    await Bun.write(`dist/assets/markdown/${chapter.slug.replace('.html', '.md')}`, chapter.markdown);
  }

  // Close the database connection
  db.close();
  
  return chapters;
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
  
  let nav = '<h2><a href="../index.html">Epic EHI Missing Manual</a></h2>';
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
      const isActive = chapter.slug.replace('.html', '') === currentSlug.replace('.html', '');
      // Remove "Chapter X.X:" prefix from title if present
      const cleanTitle = chapter.title.replace(/^Chapter\s+\d+\.\d+:\s*/, '');
      nav += `<li class="${isActive ? 'active' : ''}">`;
      nav += `<a href="../chapters/${chapter.slug}">${cleanTitle}</a>`;
      nav += '</li>';
    }
    
    nav += '</ul></div>';
  }
  
  nav += '</nav>';
  return nav;
}