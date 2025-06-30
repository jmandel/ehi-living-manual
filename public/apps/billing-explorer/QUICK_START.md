# Quick Start Guide

## Prerequisites

- Bun.js installed ([https://bun.sh](https://bun.sh))
- Access to an Epic EHI SQLite export
- Basic understanding of healthcare billing concepts

## Installation

```bash
# Clone or download this repository
cd encounter-billing-explorer-v2

# Install dependencies (minimal - just Bun types)
bun install
```

## Basic Usage

### 1. Configure Database Path

Edit the database path in the scripts to point to your EHI export:

```typescript
// In financial-extractor.ts (line ~695)
const dbPath = "path/to/your/ehi.sqlite";  // Update this
```

### 2. Run the Extraction

```bash
# Extract all financial data
bun run extract

# This creates patient_financial_data.json
```

### 3. View the Dashboard

```bash
# Display financial summary
bun run dashboard
```

Output example:
```
Patient: MANDEL,JOSHUA C (Z7004242)
Guarantor: MANDEL,JOSHUA C (Account: 1810018166)

Insurance Coverage:
  - BLUE CROSS OF WISCONSIN / BLUE CROSS WI PPO/FEDERAL
    Member #: MSJ60249687901
    Effective: 8/9/2018 12:00:00 AM

Transaction Summary:
  Professional Billing:
    - Charges: 18 transactions, Total: $3,013.00
  Hospital Billing:
    - Charges: 3 transactions, Total: $1,638.82
  Total Payments: 19 transactions

Financial Summary:
  Total Charges:         $4,651.82
  Total Payments:        $2,085.52
  Outstanding Balance:   $1,277.82
```

### 4. Analyze Specific Aspects

```bash
# Analyze hospital accounts structure
bun run analyze-har

# Examine charge-to-encounter linkage
bun run analyze-linkage
```

## Understanding the Output

### patient_financial_data.json Structure

```json
[
  {
    "patientId": "Z7004242",
    "patientName": "MANDEL,JOSHUA C",
    "guarantor": {
      // Financially responsible party
    },
    "coverages": [
      // Insurance policies
    ],
    "encounters": [
      // All patient visits with department names
    ],
    "professionalTransactions": [
      // Provider charges/payments WITH encounter links
    ],
    "hospitalAccounts": [
      // Episode-based facility billing
    ],
    "invoices": [
      // Claims submitted
    ],
    "payments": [
      // EOB details
    ],
    "financialSummary": {
      // Calculated totals
    }
  }
]
```

## Key Features

### ✅ Complete Encounter Linkage
Every professional charge is linked to its clinical encounter via the ARPB_VISITS table.

### ✅ Dual-Stream Billing
Separates professional (physician) and hospital (facility) charges.

### ✅ Episode Understanding  
Hospital accounts represent episodes of care, not individual visits.

### ✅ Payment Tracking
Full EOB details and payment matching history.

### ✅ Human-Readable Output
Department names, not just IDs. Organized JSON structure.

## Common Customizations

### Filter by Date Range

```typescript
// In extractProfessionalTransactions()
WHERE t.ACCOUNT_ID = ?
  AND t.SERVICE_DATE >= '2023-01-01'
  AND t.SERVICE_DATE < '2024-01-01'
```

### Add Provider Names

```typescript
// Join to provider table
LEFT JOIN CLARITY_SER_2 s ON t.BILLING_PROV_ID = s.PROV_ID

// Select provider name
s.PROV_NAME as billingProviderName
```

### Add Procedure Codes

```typescript
// Join to procedure master
LEFT JOIN CLARITY_EAP e ON t.PROC_ID = e.PROC_ID

// Select CPT code
e.PROC_CODE as cptCode
```

## Troubleshooting

### "No such column" Errors
The EHI export schema may vary. Check available columns:
```bash
sqlite3 your_ehi.sqlite "PRAGMA table_info(TABLE_NAME);"
```

### Missing Encounter Links
Some charges may not have visits. Check:
```sql
SELECT COUNT(*) FROM ARPB_TRANSACTIONS 
WHERE VISIT_NUMBER IS NULL;
```

### Performance Issues
For large datasets:
1. Add date filters
2. Process in batches
3. Create indexes (see TECHNICAL_DETAILS.md)

## Next Steps

1. Review [EXAMPLES.md](EXAMPLES.md) for specific use cases
2. Check [TECHNICAL_DETAILS.md](TECHNICAL_DETAILS.md) for deep dives
3. See [DATA_MODEL.md](DATA_MODEL.md) for visual diagrams
4. Customize the extraction for your specific needs

## Support

This is an open-source analysis tool for CURES Act-compliant EHI data. Ensure you have proper authorization before accessing any EHI export.