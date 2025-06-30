import { readdir, readFile } from 'fs/promises';
import { join, basename } from 'path';
import { existsSync } from 'fs';

interface StaticApp {
  id: string;
  title: string;
  description?: string;
  path: string;
}

interface AppManifest {
  title: string;
  description?: string;
  icon?: string;
  order?: number;
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
        const indexPath = join(appPath, 'index.html');
        
        // Check if index.html exists
        if (existsSync(indexPath)) {
          let appInfo: StaticApp = {
            id: entry.name,
            title: entry.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            path: `/apps/${entry.name}/`
          };
          
          // Check for manifest.json
          const manifestPath = join(appPath, 'manifest.json');
          if (existsSync(manifestPath)) {
            try {
              const manifestContent = await readFile(manifestPath, 'utf-8');
              const manifest: AppManifest = JSON.parse(manifestContent);
              
              if (manifest.title) {
                appInfo.title = manifest.title;
              }
              if (manifest.description) {
                appInfo.description = manifest.description;
              }
            } catch (e) {
              console.warn(`Failed to parse manifest.json for ${entry.name}:`, e);
            }
          }
          
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
  
  return apps.map(app => ({
    label: app.title,
    link: app.path,
    attrs: {
      target: '_self', // Open in same window
      class: 'static-app-link'
    }
  }));
}

// If running directly, output the apps list
if (import.meta.url === `file://${process.argv[1]}`) {
  scanStaticApps().then(apps => {
    console.log(JSON.stringify(apps, null, 2));
  });
}