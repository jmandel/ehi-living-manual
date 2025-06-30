# Static Apps Directory

This directory contains standalone HTML applications that are automatically included in the EHI Living Manual sidebar.

## How to Add a New App

1. Create a subdirectory in this folder (e.g., `public/apps/my-dashboard/`)
2. Add your static files:
   - `index.html` (required) - Entry point for your app
   - Any other files (JS, CSS, JSON data, etc.)
   - `manifest.json` (optional) - Metadata for your app

## Manifest Format

Create a `manifest.json` file in your app directory to customize how it appears in the menu:

```json
{
  "title": "My Dashboard",
  "description": "Interactive data visualization dashboard",
  "icon": "📊",
  "order": 1,
  "entrypoint": "dashboard.html"
}
```

All fields are optional:
- `title`: Display name in the sidebar (defaults to directory name)
- `description`: Tooltip or subtitle
- `icon`: Emoji or icon to display
- `order`: Sort order (lower numbers appear first)
- `entrypoint`: HTML file to load (defaults to "index.html")

## Example Structure

```
public/apps/
├── README.md
├── billing-dashboard/
│   ├── index.html
│   ├── manifest.json
│   ├── data.json
│   ├── styles.css
│   └── script.js
└── another-tool/
    ├── index.html
    └── app.js
```

## Important Notes

- Apps are served as static files from `/apps/{app-name}/`
- All paths within your app should be relative
- Apps appear under "Interactive Tools" in the sidebar
- The sidebar is regenerated at build time, so restart the dev server after adding new apps