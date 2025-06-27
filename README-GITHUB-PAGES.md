# GitHub Pages Deployment

This Astro site is configured to deploy to GitHub Pages at `https://jmandel.github.io/ehi-missing-manual/`.

## Setup Instructions

1. **Enable GitHub Pages in your repository:**
   - Go to Settings → Pages
   - Under "Source", select "GitHub Actions"

2. **Push to main branch:**
   - The GitHub Action will automatically build and deploy the site
   - You can also manually trigger the deployment from the Actions tab

## Configuration

- **Base path:** `/ehi-missing-manual` (configured in `astro.config.mjs`)
- **Site URL:** `https://jmandel.github.io`
- **Build output:** `dist/` directory

## Important Notes

- All asset paths should use the base path (e.g., `/ehi-missing-manual/assets/...`)
- The `.nojekyll` file in `public/` prevents GitHub Pages from processing with Jekyll
- SQL.js and WASM files are served from `/ehi-missing-manual/sql-js/`
- The Epic sample database is at `/ehi-missing-manual/assets/data/ehi.sqlite`

## Local Development

When developing locally, the site runs at `http://localhost:4321/ehi-missing-manual/`

```bash
bun install
bun run dev
```

## Building for Production

```bash
bun run build
```

The built site will be in the `dist/` directory.