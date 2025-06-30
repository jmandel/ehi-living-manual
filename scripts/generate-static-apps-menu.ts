import { readdir, readFile } from 'fs/promises';
import { join, basename } from 'path';
import { existsSync } from 'fs';

export interface StaticApp {
  id: string;
  title: string;
  description?: string;
  path: string;
  icon?: string;
}

interface AppManifest {
  title: string;
  description?: string;
  icon?: string;
  order?: number;
  entrypoint?: string; // Custom HTML file name, defaults to index.html
}

/**
 * Scans the public/apps directory for static HTML applications.
 * Each subdirectory with an index.html is considered an app.
 * Apps can include a manifest.json for metadata.
 */
export async function scanStaticApps(): Promise<StaticApp[]> {
  const appsDir = join(process.cwd(), 'public', 'apps');
  const apps: StaticApp[] = [];
  
  // Create apps directory if it doesn't exist
  if (!existsSync(appsDir)) {
    return [];
  }
  
  try {
    const entries = await readdir(appsDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const appPath = join(appsDir, entry.name);
        let entrypoint = 'index.html';
        let manifest: AppManifest | null = null;
        
        // Check for manifest.json first
        const manifestPath = join(appPath, 'manifest.json');
        if (existsSync(manifestPath)) {
          try {
            const manifestContent = await readFile(manifestPath, 'utf-8');
            manifest = JSON.parse(manifestContent);
            if (manifest.entrypoint) {
              entrypoint = manifest.entrypoint;
            }
          } catch (e) {
            console.warn(`Failed to parse manifest.json for ${entry.name}:`, e);
          }
        }
        
        // Check if entrypoint exists
        const entrypointPath = join(appPath, entrypoint);
        if (existsSync(entrypointPath)) {
          // Use clean URL for index.html, include filename for custom entrypoints
          const path = entrypoint === 'index.html' 
            ? `/apps/${entry.name}/`
            : `/apps/${entry.name}/${entrypoint}`;
            
          let appInfo: StaticApp = {
            id: entry.name,
            title: manifest?.title || entry.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            path,
            description: manifest?.description,
            icon: manifest?.icon
          };
          
          apps.push(appInfo);
        }
      }
    }
    
    // Sort apps by title (or by order if specified in manifest)
    apps.sort((a, b) => a.title.localeCompare(b.title));
    
    return apps;
  } catch (error) {
    console.error('Error scanning static apps:', error);
    return [];
  }
}

// Export for use in sidebar generation
export async function getStaticAppsMenuItems() {
  const apps = await scanStaticApps();
  
  // Return menu items with direct links to HTML files
  // These need to be marked as external to bypass Starlight's routing
  return apps.map(app => ({
    label: app.title,
    // Starlight recognizes http:// or https:// as external links
    // So we'll use a full URL with the base path
    link: app.path, // e.g., /apps/billing-explorer/index.html
    attrs: {
      'data-external': 'true' // Custom attribute to mark as external
    }
  }));
}

// If running directly, output the apps list
if (import.meta.url === `file://${process.argv[1]}`) {
  scanStaticApps().then(apps => {
    console.log(JSON.stringify(apps, null, 2));
  });
}