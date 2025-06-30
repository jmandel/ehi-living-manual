import { writeFile } from 'fs/promises';
import { join } from 'path';
import { scanStaticApps } from './generate-static-apps-menu.ts';

async function generateAppsData() {
  try {
    const apps = await scanStaticApps();
    const outputPath = join(process.cwd(), 'src/data/static-apps.json');
    
    await writeFile(outputPath, JSON.stringify(apps, null, 2));
    console.log(`Generated static apps data: ${apps.length} apps found`);
  } catch (error) {
    console.error('Error generating apps data:', error);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateAppsData();
}