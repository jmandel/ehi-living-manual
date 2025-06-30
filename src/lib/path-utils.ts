/**
 * Dynamically discover the base path from window location
 * This allows the site to work correctly regardless of deployment path
 */
export function getBasePath(): string {
  // For local file:// URLs, use the directory containing the HTML file
  if (window.location.protocol === 'file:') {
    const path = window.location.pathname;
    const lastSlash = path.lastIndexOf('/');
    return path.substring(0, lastSlash + 1);
  }
  
  // For HTTP(S) URLs, find the base path by analyzing the current location
  const currentPath = window.location.pathname;
  
  // If we're at the root, return root
  if (currentPath === '/' || currentPath === '/index.html') {
    return '/';
  }
  
  // Split path into segments
  const pathParts = currentPath.split('/').filter(Boolean);
  
  // Try to intelligently detect the base path
  // Look for common patterns in Astro/Starlight routing
  if (pathParts.length > 0) {
    // Check if first segment is our known deployment path
    if (pathParts[0] === 'ehi-living-manual') {
      return '/ehi-living-manual/';
    }
    
    // For paths like /base/docs/page or /base/playground
    // If the first segment doesn't contain a dot (not a file), 
    // and we have multiple segments, first is likely the base
    if (!pathParts[0].includes('.') && pathParts.length > 1) {
      // Check if second segment is a known route pattern
      const knownRoutes = ['docs', 'playground', 'assets', 'sql-js'];
      if (knownRoutes.includes(pathParts[1])) {
        return '/' + pathParts[0] + '/';
      }
    }
  }
  
  // Default to root
  return '/';
}

/**
 * Get a full URL for an asset path
 */
export function getAssetUrl(assetPath: string): string {
  const basePath = getBasePath();
  // Remove leading slash from asset path if present
  const cleanAssetPath = assetPath.startsWith('/') ? assetPath.slice(1) : assetPath;
  return basePath + cleanAssetPath;
}