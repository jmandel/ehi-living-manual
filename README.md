# Epic EHI Living Manual - Astro Site

This is the Astro-based version of the Epic EHI Living Manual, featuring interactive SQL widgets and Mermaid diagrams.

## Quick Start

```bash
# Install dependencies
bun install

# Generate the SQLite database (if not already present)
bun run generate-db

# Start development server
bun run dev
```

## Features

- **Static Site with Progressive Enhancement**: Base HTML works without JavaScript, enhanced features when JS is available
- **Interactive SQL Editor**: Edit and run SQL queries directly in the browser
- **Mermaid Diagrams**: Interactive diagrams with source code view
- **Local Database**: All SQL queries run against a local SQLite database in your browser
- **GitHub Pages Ready**: Configured for deployment to GitHub Pages

## Project Structure

```
astro-poc/
├── public/
│   └── assets/
│       └── data/
│           └── ehi.sqlite      # SQLite database (generated)
├── scripts/
│   ├── prebuild.ts            # Pre-build tasks (runs before dev/build)
│   └── prepare-sqlite3-db.ts  # Database generation script
├── src/
│   ├── components/            # React components
│   ├── content/              # Markdown content
│   ├── lib/                  # Utility functions
│   └── styles/               # CSS files
└── astro.config.mjs          # Astro configuration
```

## Database Generation

The SQLite database is generated from the Epic EHI sample data repository. The generation process:

1. Clones/updates the [my-health-data-ehi-wip](https://github.com/jmandel/my-health-data-ehi-wip) repository
2. Converts TSV files to SQLite tables
3. Adds documentation from JSON schema files
4. Creates indexes for common queries

To regenerate the database:

```bash
bun run generate-db
```

## Deployment

The site is configured to deploy to GitHub Pages at `/ehi-living-manual/`. 

Push to the `main` branch to trigger automatic deployment via GitHub Actions.

## Development Notes

- The site uses relative paths throughout to support deployment at any base path
- SQL.js runs entirely in the browser - no server-side database needed
- All paths are resolved relative to `import.meta.env.BASE_URL`

## Scripts

- `bun run dev` - Start development server
- `bun run build` - Build for production
- `bun run preview` - Preview production build
- `bun run generate-db` - Generate SQLite database from source data