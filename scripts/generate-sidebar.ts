import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { getStaticAppsMenuItems } from './generate-static-apps-menu.ts';

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
  '01': 'Fundamental Patterns', 
  '02': 'Clinical Data Model',
  '03': 'Financial Data Model',
  '04': 'Advanced Topics',
  '05': 'Reference'
};

// Words that should remain uppercase
const UPPERCASE_WORDS = ['ehi', 'adt', 'id', 'arpb', 'sql', 'api', 'csn', 'pat', 'enc'];

function formatChapterTitle(filename: string): string {
  // Remove number prefix and extension, convert to title case
  const name = filename
    .replace(/^\d{2}(-\d{2}|-intro)-/, '')
    .replace(/\.mdx?$/, '')
    .replace(/-/g, ' ');
  
  // Handle intro files specially
  if (filename.includes('-intro')) {
    return 'Introduction';
  }
  
  return name
    .split(' ')
    .map(word => {
      const lowerWord = word.toLowerCase();
      // Check if this word should be uppercase
      if (UPPERCASE_WORDS.includes(lowerWord)) {
        return word.toUpperCase();
      }
      // Words that are already all uppercase in filename should stay uppercase
      if (word === word.toUpperCase() && word.length > 1) {
        return word;
      }
      // Otherwise, apply title case
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
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
      // Skip intro files
      if (file.includes('-intro')) {
        continue;
      }
      
      // Match "00-01-title" patterns
      const match = file.match(/^(\d{2})-\d{2}/);
      if (match) {
        const group = match[1];
        const slug = file.replace(/\.mdx?$/, '');
        
        if (!grouped.has(group)) {
          grouped.set(group, []);
        }
        
        // No need to strip dots anymore as new format uses dashes
        const urlSlug = slug;
        
        grouped.get(group)!.push({
          label: formatChapterTitle(file),
          link: `/${urlSlug}/`
        });
      }
    }
    
    // Convert to sidebar structure
    const otherItems: SidebarItem[] = [];
    
    for (const [group, items] of grouped) {
      if (chapterGroups[group]) {
        sidebar.push({
          label: chapterGroups[group],
          items: items
        });
      } else {
        // Add items from unrecognized groups to "Other" category
        otherItems.push(...items);
      }
    }
    
    // Add "Other" category if there are any items
    if (otherItems.length > 0) {
      sidebar.push({
        label: 'Other',
        items: otherItems
      });
    }
    
    // Add static apps if any exist
    try {
      const staticApps = await getStaticAppsMenuItems();
      if (staticApps.length > 0) {
        sidebar.push({
          label: 'Interactive Tools',
          items: staticApps
        });
      }
    } catch (error) {
      console.error('Error loading static apps:', error);
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