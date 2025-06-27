import { readdir } from 'fs/promises';
import { join } from 'path';

interface SidebarItem {
  label: string;
  link: string;
}

interface SidebarGroup {
  label: string;
  items: SidebarItem[];
}

const chapterGroups = {
  '00': 'Getting Started',
  '01': 'Core Architecture', 
  '02': 'Fundamental Patterns',
  '03': 'Clinical Data Model',
  '04': 'Financial Data Model',
  '05': 'Technical Reference',
  '06': 'Additional Topics'
};

function formatChapterTitle(filename: string): string {
  // Remove number prefix and extension, convert to title case
  const name = filename
    .replace(/^\d+\.\d+-/, '')
    .replace(/\.mdx?$/, '')
    .replace(/-/g, ' ');
  
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export async function generateSidebar() {
  const docsDir = join(process.cwd(), 'src/content/docs');
  const sidebar: SidebarGroup[] = [];
  
  try {
    const files = await readdir(docsDir);
    const mdFiles = files
      .filter(f => f.endsWith('.md') || f.endsWith('.mdx'))
      .filter(f => f !== 'index.mdx') // Exclude the home page
      .sort();
    
    // Group chapters by their number prefix
    const grouped = new Map<string, SidebarItem[]>();
    
    for (const file of mdFiles) {
      const match = file.match(/^(\d+)\.\d+-/);
      if (match) {
        const group = match[1];
        const slug = file.replace(/\.mdx?$/, '');
        
        if (!grouped.has(group)) {
          grouped.set(group, []);
        }
        
        // Starlight strips dots from URLs, so 02.5-naming becomes 025-naming
        const urlSlug = slug.replace(/\./g, '');
        
        grouped.get(group)!.push({
          label: formatChapterTitle(file),
          link: `/${urlSlug}/`
        });
      }
    }
    
    // Convert to sidebar structure
    for (const [group, items] of grouped) {
      if (chapterGroups[group]) {
        sidebar.push({
          label: chapterGroups[group],
          items
        });
      }
    }
    
    return sidebar;
  } catch (error) {
    console.error('Error generating sidebar:', error);
    return [];
  }
}

// If running directly, output the sidebar config
if (import.meta.url === `file://${process.argv[1]}`) {
  generateSidebar().then(sidebar => {
    console.log(JSON.stringify(sidebar, null, 2));
  });
}