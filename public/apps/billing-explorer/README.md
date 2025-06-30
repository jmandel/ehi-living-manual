# Encounter Billing Explorer v2

A comprehensive TypeScript-based extraction and analysis system for Epic EHI (Electronic Health Information) financial data, designed to create a complete patient financial dashboard by properly linking charges, encounters, claims, and payments.

## 🎯 NEW: Interactive Patient Financial Dashboard

A fully interactive, patient-facing web dashboard built with D3.js that visualizes:
- **Healthcare Journey Timeline**: Visual timeline of encounters, charges, claims, and payments
- **Financial Flow Sankey Diagram**: Shows how charges flow through insurance and patient responsibility
- **Department Analysis**: Charges broken down by healthcare department
- **Monthly Trends**: Line charts showing charges vs payments over time
- **Enhanced Encounter Details**: Table with financial summaries for each visit

## Overview

This system extracts and links financial data from Epic's dual-stream billing model:
- **Professional Billing (PB)**: Provider services billed through ARPB tables
- **Hospital Billing (HB)**: Facility charges billed through HSP tables

The key innovation is properly linking all charges to their clinical encounters, enabling accurate financial reporting by visit.

## Architecture

### Data Flow Pipeline

```
Patient → Guarantor Account → Transactions → Visits → Encounters
                           ↓
                        Invoices/Claims → Payments/EOBs → Matching
                           ↓
                     Hospital Accounts → Hospital Transactions
```

### Key Relationships Discovered

1. **Professional Billing Linkage** (previously undocumented):
   - `ARPB_TRANSACTIONS.VISIT_NUMBER` → `ARPB_VISITS.PB_VISIT_NUM`
   - `ARPB_VISITS.PRIM_ENC_CSN_ID` → `PAT_ENC.PAT_ENC_CSN_ID`
   - This enables 100% encounter attribution for professional charges

2. **Hospital Billing Structure**:
   - Hospital Accounts (HAR) are episode-based, not patient-based
   - Multiple encounters can belong to one HAR (e.g., therapy series)
   - Charges link directly to HAR, encounters link to HAR

3. **Payment Reconciliation**:
   - EOB details in `PMT_EOB_INFO_I` link payments to charges
   - `ARPB_TX_MATCH_HX` tracks payment application history
   - Supports insurance vs. self-pay amount tracking

## TypeScript Interfaces

### Core Entities

```typescript
// Patient's financial responsibility entity
interface Guarantor {
  accountId: number;
  accountName: string;
  patients: PatientAccountLink[];
  // Demographics and contact info
}

// Insurance coverage with members
interface Coverage {
  coverageId: number;
  payorId: number | null;
  payorName: string | null;
  planId: number | null;
  planName: string | null;
  members: CoverageMember[];
}

// Clinical visit record
interface Encounter {
  encounterId: number;
  patientId: string;
  encounterDate: string;
  encounterType: string | null;
  departmentId: number | null;
  departmentName: string | null;  // Joined from CLARITY_DEP
  hospitalAccountId: number | null;
}
```

### Transaction Interfaces

```typescript
// Base transaction (charge, payment, or adjustment)
interface Transaction {
  txId: number;
  txType: string;
  postDate: string;
  serviceDate: string;
  amount: number;
  accountId: number;
  patientId: string;
  procedureId: number | null;
  // Additional fields...
}

// Professional billing with encounter linkage
interface ProfessionalTransaction extends Transaction {
  encounterId: number | null;      // Linked via ARPB_VISITS
  visitNumber: string | null;       // Key for linkage
  billingProviderId: string | null;
  serviceProviderId: string | null;
  diagnoses: TransactionDiagnosis[];
}

// Hospital billing with direct HAR linkage
interface HospitalTransaction extends Transaction {
  hospitalAccountId: number;
  revenueCodeId: number | null;
  facilityId: number | null;
  quantity: number | null;
}
```

### Billing & Payment Interfaces

```typescript
// Claim/invoice with linked transactions
interface Invoice {
  invoiceId: number;
  invoiceNumber: string;
  status: string | null;
  fromServiceDate: string | null;
  toServiceDate: string | null;
  coverageId: number | null;
  totalBilled: number;
  transactions: InvoiceTransaction[];
}

// Payment EOB details
interface PaymentEOB {
  paymentTxId: number;
  chargeTxId: number;
  paidAmount: number;
  allowedAmount: number | null;
  deductibleAmount: number | null;
  coinsuranceAmount: number | null;
  copayAmount: number | null;
  denialCodes: string | null;
}

// Payment matching history
interface TransactionMatch {
  chargeTxId: number;
  paymentTxId: number;
  matchedAmount: number;
  insuranceAmount: number | null;
  patientAmount: number | null;
  matchDate: string;
  coverageId: number | null;
}
```

### Aggregated Interfaces

```typescript
// Episode of care (usually inpatient)
interface HospitalAccount {
  hospitalAccountId: number;
  patientId: string;
  admissionDate: string | null;
  dischargeDate: string | null;
  accountClass: string | null;
  financialClass: string | null;
  totalCharges: number;
  encounters: Encounter[];         // Multiple encounters per episode
  transactions: HospitalTransaction[];
}

// Complete patient financial record
interface PatientFinancialRecord {
  patientId: string;
  patientName: string | null;
  guarantor: Guarantor;
  coverages: Coverage[];
  encounters: Encounter[];
  hospitalAccounts: HospitalAccount[];
  professionalTransactions: ProfessionalTransaction[];
  hospitalTransactions: HospitalTransaction[];
  invoices: Invoice[];
  payments: PaymentEOB[];
  matches: TransactionMatch[];
  financialSummary: FinancialSummary;
}

// Calculated summary
interface FinancialSummary {
  totalCharges: number;
  totalPayments: number;
  totalAdjustments: number;
  totalInsurancePayments: number;
  totalPatientPayments: number;
  totalDeductibles: number;
  totalCoinsurance: number;
  totalCopays: number;
  outstandingBalance: number;
  writeOffs: number;
}
```

## Usage

### Basic Extraction

```bash
# Extract all patient financial data
bun run financial-extractor.ts

# Output: patient_financial_data.json
```

### Interactive Web Dashboard

```bash
# Start the dashboard server
bun run serve-dashboard.ts

# Open http://localhost:8080 in your browser
```

The dashboard provides:
- Real-time interactive visualizations
- Hover tooltips with detailed information
- Responsive design for various screen sizes
- Patient-friendly language and formatting

### Analysis Tools

```bash
# View financial dashboard summary (console output)
bun run financial-dashboard-viewer.ts

# Analyze hospital account structure
bun run analyze-hospital-accounts.ts

# Examine charge-to-encounter linkage
bun run charge-encounter-analysis.ts
```

### Testing

```bash
# Run test suite
bun test financial-extractor.test.ts
```

## Key SQL Joins

### Professional Billing Charges to Encounters
```sql
SELECT 
  t.*,
  v.PRIM_ENC_CSN_ID as encounter_id
FROM ARPB_TRANSACTIONS t
LEFT JOIN ARPB_VISITS v ON t.VISIT_NUMBER = v.PB_VISIT_NUM
WHERE t.TX_TYPE_C_NAME = 'Charge'
```

### Hospital Account to Encounters
```sql
SELECT 
  h.*,
  e.PAT_ENC_CSN_ID,
  e.CONTACT_DATE
FROM HSP_ACCOUNT h
INNER JOIN PAT_ENC e ON h.HSP_ACCOUNT_ID = e.HSP_ACCOUNT_ID
```

### Invoice to Transactions
```sql
SELECT 
  i.INVOICE_ID,
  ib.INV_NUM,
  itp.TX_ID
FROM INVOICE i
INNER JOIN INV_BASIC_INFO ib ON i.INVOICE_ID = ib.INV_ID
INNER JOIN INV_TX_PIECES itp ON ib.INV_ID = itp.INV_ID 
  AND ib.LINE = itp.LINE
```

## Output Format

The system generates a comprehensive JSON file containing all financial data properly linked and aggregated. Example structure:

```json
[
  {
    "patientId": "Z7004242",
    "patientName": "MANDEL,JOSHUA C",
    "guarantor": {
      "accountId": 1810018166,
      "accountName": "MANDEL,JOSHUA C",
      "patients": [...]
    },
    "coverages": [...],
    "encounters": [...],
    "professionalTransactions": [
      {
        "txId": 315026147,
        "encounterId": 974614965,  // Now properly linked!
        "visitNumber": "8",
        "amount": 315.00,
        ...
      }
    ],
    "hospitalAccounts": [...],
    "financialSummary": {
      "totalCharges": 4651.82,
      "totalPayments": 2085.52,
      "outstandingBalance": 1277.82,
      ...
    }
  }
]
```

## Implementation Notes

1. **Department Names**: Joined from `CLARITY_DEP` table to provide human-readable department names

2. **Duplicate Visit Numbers**: Some visit numbers appear multiple times in `ARPB_VISITS`. The extraction uses `DISTINCT` to handle this.

3. **Hospital Account Scope**: HARs represent episodes of care, not individual visits. A single admission might have multiple encounters.

4. **Transaction Signs**: Payments and credits are negative in the database. The extraction takes absolute values where appropriate.

5. **Null Handling**: Many fields can be null (e.g., encounter types, procedure codes). The interfaces reflect this reality.

## Future Enhancements

1. **Provider Details**: Join to provider tables for names and specialties
2. **Procedure Descriptions**: Join to procedure master (CLARITY_EAP) for CPT codes and descriptions  
3. **Diagnosis Details**: Join to diagnosis tables for ICD codes and descriptions
4. **Real-time Updates**: Add change tracking for incremental updates
5. **Performance**: Add indexing recommendations for large datasets

## Dependencies

- Bun.js runtime
- bun:sqlite for database access
- TypeScript for type safety

## License

This extraction system is designed for legitimate access to Epic EHI data under CURES Act compliance. Ensure you have proper authorization before accessing any EHI export.