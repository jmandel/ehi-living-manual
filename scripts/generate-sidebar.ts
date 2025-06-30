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
  '01': 'Foundations', 
  '02': 'Clinical',
  '03': 'Communication',
  '04': 'Financial',
  '05': 'Advanced'
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
  const resourceItems: SidebarItem[] = [];
  
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
      
      // Match "00-01-title" patterns (numeric chapters)
      const numericMatch = file.match(/^(\d{2})-\d{2}/);
      if (numericMatch) {
        const group = numericMatch[1];
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
      } else {
        // Match "A-01-title" patterns (letter-prefixed chapters)
        const letterMatch = file.match(/^[A-Z]-\d{2}/);
        if (letterMatch) {
          const slug = file.replace(/\.mdx?$/, '');
          resourceItems.push({
            label: formatChapterTitle(file),
            link: `/${slug}/`
          });
        }
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
    
    // Don't add Resources here - they'll be merged into the manual Resources section
    
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
    
    return { sidebar, resourceItems };
  } catch (error) {
    console.error('Error generating sidebar:', error);
    return { sidebar: [], resourceItems: [] };
  }
}

// If running directly, output the sidebar config
if (import.meta.url === `file://${process.argv[1]}`) {
  generateSidebar().then(({ sidebar }) => {
    console.log(JSON.stringify(sidebar, null, 2));
  });
}
