# Epic EHI Export - The Missing Manual

An interactive web-based guide for understanding Epic's Electronic Health Information (EHI) exports, with live SQL query examples you can run in your browser.

## Overview

This project generates a static website from markdown chapters, featuring:
- Interactive SQL query widgets that run in the browser
- Complete Epic EHI schema reference database
- Progressive enhancement (works without JavaScript)
- GitHub Pages ready deployment

## Development

### Prerequisites
- [Bun](https://bun.sh) runtime

### Setup
```bash
bun install
```

### Build the book
```bash
bun run build
```

### Development mode (with watch)
```bash
bun run dev
```

### Preview the built site
```bash
bun run serve
```

## Project Structure
```
src/
├── chapters/      # Markdown source files
├── templates/     # HTML templates
├── assets/        # CSS and JavaScript
└── data/          # SQLite database

scripts/           # Build scripts
dist/             # Generated static site (git-ignored)
```

## Deployment

The site is automatically deployed to GitHub Pages on push to main branch.

Manual deployment:
```bash
bun run deploy
```

## License

MIT