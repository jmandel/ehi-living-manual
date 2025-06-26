import type { Chapter } from "./process-markdown";

export async function generateTableOfContents(chapters: Chapter[]) {
  const template = await Bun.file("src/templates/index.html").text();
  
  // Group chapters by part
  const grouped = new Map<string, Chapter[]>();
  
  for (const chapter of chapters) {
    const mainNum = chapter.order.split('.')[0];
    if (!grouped.has(mainNum)) {
      grouped.set(mainNum, []);
    }
    grouped.get(mainNum)!.push(chapter);
  }
  
  // Generate TOC HTML
  let tocHtml = '<div class="toc-container">';
  
  const partNames: Record<string, string> = {
    '00': 'Getting Started',
    '01': 'Core Architecture', 
    '02': 'Fundamental Patterns',
    '03': 'Clinical Data Model',
    '04': 'Financial Data Model',
    '05': 'Technical Reference'
  };
  
  for (const [part, partChapters] of grouped) {
    tocHtml += `<section class="toc-part">`;
    tocHtml += `<h2>Part ${part}: ${partNames[part] || 'Additional Topics'}</h2>`;
    tocHtml += '<div class="toc-chapters">';
    
    for (const chapter of partChapters) {
      // Extract the chapter title without the "Chapter X.Y:" prefix
      const cleanTitle = chapter.title.replace(/^Chapter \d+\.\d+:\s*/, '');
      
      tocHtml += `
        <article class="chapter-card">
          <h3>
            <span class="chapter-number">${chapter.order}</span>
            <a href="chapters/${chapter.slug}.html">${cleanTitle}</a>
          </h3>
          ${generateChapterSummary(chapter)}
        </article>
      `;
    }
    
    tocHtml += '</div></section>';
  }
  
  tocHtml += '</div>';
  
  // Replace placeholders in template
  const indexHtml = template
    .replace('{{title}}', 'Epic EHI Export - The Missing Manual')
    .replace('{{content}}', tocHtml);
  
  await Bun.write("dist/index.html", indexHtml);
}

function generateChapterSummary(chapter: Chapter): string {
  // Extract the purpose from the chapter content
  // Look for the italic text that starts with "Purpose:"
  const purposeMatch = chapter.content.match(/<em>Purpose: ([^<]+)<\/em>/);
  
  if (purposeMatch) {
    return `<p class="chapter-summary">${purposeMatch[1]}</p>`;
  }
  
  // Fallback: extract first paragraph
  const firstParaMatch = chapter.content.match(/<p>([^<]+)<\/p>/);
  if (firstParaMatch) {
    const summary = firstParaMatch[1].substring(0, 150);
    return `<p class="chapter-summary">${summary}${summary.length >= 150 ? '...' : ''}</p>`;
  }
  
  return '';
}