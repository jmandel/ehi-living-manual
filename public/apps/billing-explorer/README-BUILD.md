# Billing Explorer Build Scripts

This directory contains the complete billing explorer application including its build scripts.

## Running the Scripts

Since this is now part of the Astro project, you can run these scripts from here:

```bash
# From the astro-poc root directory:
cd public/apps/billing-explorer

# Install dependencies (if needed)
bun install

# Run the financial extractor to regenerate data
bun financial-extractor.ts

# Run analysis scripts
bun analyze-hospital-accounts.ts
bun charge-encounter-analysis.ts

# Run tests
bun test
```

## Available Scripts

- **financial-extractor.ts** - Extracts financial data from the SQLite database
- **analyze-hospital-accounts.ts** - Analyzes hospital account data
- **charge-encounter-analysis.ts** - Analyzes charge and encounter relationships
- **workflow-audit-implementation.ts** - Implements workflow audit trails
- **serve-dashboard.ts** - Local server for testing (not needed in Astro)

## Data Regeneration

To regenerate the `patient_financial_data.json`:

```bash
# Make sure you have the ehi.sqlite database accessible
bun financial-extractor.ts
```

## Integration with Astro

The dashboard is automatically served through Astro at:
- Development: `http://localhost:4321/ehi-living-manual/apps/billing-explorer/`
- Production: `https://[your-domain]/ehi-living-manual/apps/billing-explorer/`

No need to run `serve-dashboard.ts` as Astro handles the serving.