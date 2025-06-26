import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { marked } from 'marked';

interface SearchDocument {
  id: string;
  title: string;
  url: string;
  content: string;
  chapter: string;
}

export function buildSearchIndex(chaptersDir: string, outputPath: string) {
  const documents: SearchDocument[] = [];
  
  // Read all markdown files
  const files = readdirSync(chaptersDir)
    .filter(f => f.endsWith('.md'))
    .sort();
    
  for (const file of files) {
    const filePath = join(chaptersDir, file);
    const content = readFileSync(filePath, 'utf-8');
    
    // Extract title from first # heading
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : file.replace('.md', '');
    
    // Extract chapter from title
    const chapterMatch = title.match(/Chapter\s+(\d+\.\d+)/);
    const chapter = chapterMatch ? chapterMatch[1] : '';
    
    // Convert markdown to plain text for search
    const plainText = marked.parse(content)
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    // Create search document
    documents.push({
      id: file.replace('.md', ''),
      title,
      url: `chapters/${file.replace('.md', '.html')}`,
      content: plainText,
      chapter
    });
  }
  
  // Write search index
  writeFileSync(outputPath, JSON.stringify(documents, null, 2));
  console.log(`📍 Generated search index with ${documents.length} documents`);
}