# Technical Details - Encounter Billing Explorer v2

## Database Schema Discoveries

### Critical Tables for Financial Analysis

#### Professional Billing (PB) Tables
- **ARPB_TRANSACTIONS**: Core transaction table (charges, payments, adjustments)
- **ARPB_VISITS**: Links transactions to encounters via visit numbers
- **ARPB_CHG_ENTRY_DX**: Diagnosis codes linked to charges
- **ARPB_TX_MATCH_HX**: Payment matching history
- **ACCOUNT**: Guarantor (financially responsible party) information
- **ACCT_GUAR_PAT_INFO**: Links patients to guarantors

#### Hospital Billing (HB) Tables
- **HSP_ACCOUNT**: Hospital account (HAR) representing episodes of care
- **HSP_TRANSACTIONS**: Hospital billing transactions
- **HSP_CLAIM_PRINT**: Hospital claim records
- **HSP_CLP_UB_TX_PIECES**: Links HB transactions to claims

#### Common Tables
- **PAT_ENC**: Patient encounters (visits)
- **PATIENT**: Patient demographics
- **COVERAGE**: Insurance coverage records
- **COVERAGE_MEMBER_LIST**: Coverage members and relationships
- **INVOICE**: Invoice master records
- **INV_BASIC_INFO**: Invoice details and submissions
- **INV_TX_PIECES**: Links PB transactions to invoices
- **PMT_EOB_INFO_I**: Payment EOB details
- **CLARITY_DEP**: Department reference table

## Key Technical Challenges Solved

### 1. Encounter Linkage for Professional Billing
**Problem**: ARPB_TRANSACTIONS has no direct encounter ID
**Solution**: Three-tier join through ARPB_VISITS
```sql
ARPB_TRANSACTIONS.VISIT_NUMBER → ARPB_VISITS.PB_VISIT_NUM → PAT_ENC.PAT_ENC_CSN_ID
```

### 2. Department Name Resolution
**Problem**: Tables only store DEPARTMENT_ID
**Solution**: LEFT JOIN to CLARITY_DEP for human-readable names

### 3. Hospital Account Scope
**Problem**: Assumed HARs were patient-level
**Reality**: HARs are episode-level (e.g., an admission, a therapy series)

### 4. Duplicate Visit Numbers
**Problem**: Some PB_VISIT_NUM values appear multiple times
**Solution**: Use DISTINCT in subquery when joining

### 5. Patient Identification in HB
**Problem**: HSP_ACCOUNT lacks PAT_ID
**Solution**: Join through PAT_ENC to get patient

## Data Integrity Considerations

### Financial Calculations
- **Charges**: Always positive
- **Payments**: Stored as negative, convert to positive
- **Adjustments**: Can be positive (debit) or negative (credit)
- **Balance**: Charges - Payments + Net Adjustments

### Date Handling
- All dates stored as strings in "M/D/YYYY H:MM:SS AM/PM" format
- Consider timezone implications for multi-site implementations

### Null Values
Common nullable fields that require careful handling:
- Encounter types (often blank)
- Procedure codes (not always populated)
- Diagnosis descriptions (reference data not included)
- Coverage dates (may be open-ended)

## Performance Optimization

### Recommended Indexes
```sql
-- For encounter lookups
CREATE INDEX idx_pat_enc_csn ON PAT_ENC(PAT_ENC_CSN_ID);
CREATE INDEX idx_pat_enc_patient ON PAT_ENC(PAT_ID);

-- For transaction queries
CREATE INDEX idx_arpb_tx_account ON ARPB_TRANSACTIONS(ACCOUNT_ID);
CREATE INDEX idx_arpb_tx_visit ON ARPB_TRANSACTIONS(VISIT_NUMBER);

-- For visit linkage
CREATE INDEX idx_arpb_visits_num ON ARPB_VISITS(PB_VISIT_NUM);
CREATE INDEX idx_arpb_visits_csn ON ARPB_VISITS(PRIM_ENC_CSN_ID);

-- For invoice queries
CREATE INDEX idx_inv_account ON INVOICE(ACCOUNT_ID);
CREATE INDEX idx_inv_pieces_tx ON INV_TX_PIECES(TX_ID);
```

### Query Optimization Tips
1. Use EXISTS instead of IN for large subqueries
2. Filter by date ranges when possible
3. Limit result sets during development
4. Consider materialized views for complex aggregations

## Data Quality Checks

### Validation Queries
```sql
-- Check for orphaned transactions
SELECT COUNT(*) FROM ARPB_TRANSACTIONS t
LEFT JOIN ACCOUNT a ON t.ACCOUNT_ID = a.ACCOUNT_ID
WHERE a.ACCOUNT_ID IS NULL;

-- Check for unlinked encounters
SELECT COUNT(*) FROM ARPB_TRANSACTIONS t
LEFT JOIN ARPB_VISITS v ON t.VISIT_NUMBER = v.PB_VISIT_NUM
WHERE t.VISIT_NUMBER IS NOT NULL 
  AND v.PB_VISIT_NUM IS NULL;

-- Verify HAR integrity
SELECT h.HSP_ACCOUNT_ID, COUNT(DISTINCT e.PAT_ID) as patient_count
FROM HSP_ACCOUNT h
LEFT JOIN PAT_ENC e ON h.HSP_ACCOUNT_ID = e.HSP_ACCOUNT_ID
GROUP BY h.HSP_ACCOUNT_ID
HAVING patient_count > 1;  -- Should be 0 (one patient per HAR)
```

## Epic-Specific Considerations

### ID Formats
- **CSN (Contact Serial Number)**: Numeric, unique per encounter
- **HAR ID**: Numeric, unique per hospital account
- **TX_ID**: Numeric, unique across both PB and HB systems
- **Account ID**: Numeric, may be encrypted in some exports

### Category Fields
Fields ending in `_C_NAME` are category values from Epic's reference tables:
- Often human-readable (e.g., "Charge", "Payment")
- May vary between Epic installations
- Consider mapping to standard values

### Historical Data
Tables with `_HX` suffix contain historical/audit data:
- ARPB_TX_MATCH_HX: Payment matching history
- Useful for understanding payment timelines
- May contain reversed/corrected entries

## Security and Compliance

### PHI Handling
- Patient names may be encrypted or hidden
- SSNs and other identifiers may be redacted
- Ensure proper access controls on extracted data

### CURES Act Compliance
- This system designed for legitimate EHI access
- Maintain audit trails of data access
- Follow minimum necessary principles

## Extension Points

### Adding Provider Details
```sql
-- Join to provider tables
LEFT JOIN CLARITY_SER_2 s ON t.BILLING_PROV_ID = s.PROV_ID
-- Get: PROV_NAME, PROV_TYPE, NPI, etc.
```

### Adding Procedure Details  
```sql
-- Join to procedure master
LEFT JOIN CLARITY_EAP e ON t.PROC_ID = e.PROC_ID
-- Get: PROC_CODE (CPT), PROC_NAME, etc.
```

### Adding Diagnosis Details
```sql
-- Join to diagnosis tables
LEFT JOIN CLARITY_EDG d ON dx.DX_ID = d.DX_ID
-- Get: DX_CODE (ICD), DX_NAME, etc.
```