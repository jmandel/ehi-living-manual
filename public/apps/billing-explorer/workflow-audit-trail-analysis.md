# Workflow Audit Trail Analysis: User IDs and Timestamps in Epic Tables

## Tables Referenced in financial-extractor.ts

Based on the code analysis, here are all the Epic tables being queried:

### 1. **ACCOUNT** (Guarantor Account)
- **Purpose**: Stores guarantor account information
- **Query Location**: Lines 275-288
- **Potential Audit Fields**:
  - `CREATE_USER_ID` - User who created the account
  - `CREATE_INSTANT` or `CREATE_DATE` - When account was created
  - `UPDATE_USER_ID` - User who last modified
  - `UPDATE_INSTANT` or `UPDATE_DATE` - Last modification timestamp

### 2. **ACCT_GUAR_PAT_INFO** (Account-Guarantor-Patient Link)
- **Purpose**: Links patients to guarantor accounts
- **Query Location**: Lines 294-302, 356, 479, 1242-1246
- **Potential Audit Fields**:
  - `CREATE_USER_ID` - User who linked patient to account
  - `CREATE_INSTANT` - When link was created
  - `UPDATE_USER_ID` - User who last modified link
  - `UPDATE_INSTANT` - Last modification timestamp

### 3. **COVERAGE** (Insurance Coverage)
- **Purpose**: Insurance coverage information
- **Query Location**: Lines 314-327
- **Potential Audit Fields**:
  - `CREATE_USER_ID` - User who created coverage
  - `CREATE_INSTANT` - Coverage creation timestamp
  - `UPDATE_USER_ID` - Last modifier
  - `UPDATE_INSTANT` - Last modification time
  - `VERIF_USER_ID` - User who verified coverage
  - `LAST_VERIF_DATE` - Last verification timestamp (already captured)

### 4. **COVERAGE_MEMBER_LIST** (Coverage Members)
- **Purpose**: Members on insurance coverage
- **Query Location**: Lines 333-344
- **Already Captured**: 
  - `LAST_VERIF_DATE` - Last verification date
- **Additional Potential Fields**:
  - `VERIF_USER_ID` - User who performed verification
  - `CREATE_USER_ID` - User who added member
  - `CREATE_INSTANT` - When member was added

### 5. **ARPB_TRANSACTIONS** (Professional Billing Transactions)
- **Purpose**: Professional billing charges, payments, adjustments
- **Query Location**: Lines 361-398, 459-465
- **Potential Audit Fields**:
  - `CREATE_USER_ID` - User who created transaction
  - `CREATE_INSTANT` or `CREATE_DATE` - Transaction creation time
  - `POST_USER_ID` - User who posted transaction
  - `POST_DATE` - Already captured (posting date)
  - `VOID_USER_ID` - User who voided (if applicable)
  - `VOID_DATE` - Void timestamp
  - `SERVICE_DATE` - Already captured

### 6. **ARPB_VISITS** (Professional Billing Visits)
- **Purpose**: Links visits to encounters
- **Query Location**: Lines 391-395
- **Potential Audit Fields**:
  - `CREATE_USER_ID` - User who created visit
  - `CREATE_INSTANT` - Visit creation time
  - `CHECK_IN_USER_ID` - User who checked in patient
  - `CHECK_IN_TIME` - Check-in timestamp

### 7. **ARPB_CHG_ENTRY_DX** (Charge Entry Diagnoses)
- **Purpose**: Diagnoses linked to charges
- **Query Location**: Lines 419-428
- **Potential Audit Fields**:
  - `CREATE_USER_ID` - User who added diagnosis
  - `CREATE_INSTANT` - When diagnosis was added

### 8. **INVOICE** (Claims/Invoices)
- **Purpose**: Insurance claims
- **Query Location**: Lines 435-450
- **Potential Audit Fields**:
  - `CREATE_USER_ID` - User who created invoice
  - `CREATE_INSTANT` - Invoice creation time
  - `SUBMIT_USER_ID` - User who submitted claim
  - `SUBMIT_DATE` - Claim submission date

### 9. **INV_BASIC_INFO** (Invoice Basic Information)
- **Purpose**: Additional invoice details
- **Query Location**: Lines 435-450
- **Already Captured**:
  - `FROM_SVC_DATE` - Service start date
  - `TO_SVC_DATE` - Service end date
- **Additional Potential Fields**:
  - `STATUS_CHANGE_USER_ID` - User who changed status
  - `STATUS_CHANGE_DATE` - Status change timestamp

### 10. **INV_TX_PIECES** (Invoice Transaction Pieces)
- **Purpose**: Links transactions to invoices
- **Query Location**: Lines 456-467
- **Potential Audit Fields**:
  - `CREATE_USER_ID` - User who linked transaction
  - `CREATE_INSTANT` - Link creation time

### 11. **PMT_EOB_INFO_I** (Payment EOB Information)
- **Purpose**: Explanation of Benefits and payment details
- **Query Location**: Lines 483-502
- **Already Captured**:
  - `TX_MATCH_DATE` - Transaction match date
- **Additional Potential Fields**:
  - `MATCH_USER_ID` - User who matched payment
  - `CREATE_USER_ID` - User who created EOB record
  - `CREATE_INSTANT` - EOB creation time
  - `POST_USER_ID` - User who posted payment
  - `POST_DATE` - Payment posting date

### 12. **ARPB_TX_MATCH_HX** (Transaction Match History)
- **Purpose**: History of transaction matching
- **Query Location**: Lines 508-525
- **Already Captured**:
  - `MTCH_TX_HX_DT` - Match date
  - `MTCH_TX_HX_UN_DT` - Unmatch date
- **Additional Potential Fields**:
  - `MATCH_USER_ID` - User who created match
  - `UNMATCH_USER_ID` - User who unmatched

### 13. **PAT_ENC** (Patient Encounters)
- **Purpose**: Patient encounter/visit records
- **Query Location**: Lines 530-547, 585-599
- **Already Captured**:
  - `CONTACT_DATE` - Encounter date
  - `ENC_CREATE_USER_ID_NAME` - Already referenced in code (line 543)
- **Additional Potential Fields**:
  - `ENC_CREATE_USER_ID` - User who created encounter
  - `ENC_CREATE_INSTANT` - Encounter creation time
  - `CHECK_IN_USER_ID` - User who checked in patient
  - `CHECK_IN_TIME` - Check-in timestamp
  - `CHECK_OUT_USER_ID` - User who checked out patient
  - `CHECK_OUT_TIME` - Check-out timestamp
  - `CLOSE_USER_ID` - User who closed encounter
  - `CLOSE_DATE` - Encounter close date

### 14. **HSP_ACCOUNT** (Hospital Account)
- **Purpose**: Hospital account (HAR) information
- **Query Location**: Lines 553-565
- **Already Captured**:
  - `ADM_DATE_TIME` - Admission date/time
  - `DISCH_DATE_TIME` - Discharge date/time
- **Additional Potential Fields**:
  - `ADM_USER_ID` - User who admitted patient
  - `DISCH_USER_ID` - User who discharged patient
  - `CREATE_USER_ID` - User who created HAR
  - `CREATE_INSTANT` - HAR creation time

### 15. **HSP_TRANSACTIONS** (Hospital Transactions)
- **Purpose**: Hospital billing transactions
- **Query Location**: Lines 604-631
- **Already Captured**:
  - `TX_POST_DATE` - Transaction post date
  - `SERVICE_DATE` - Service date
- **Additional Potential Fields**:
  - `CREATE_USER_ID` - User who created transaction
  - `CREATE_INSTANT` - Transaction creation time
  - `POST_USER_ID` - User who posted transaction
  - `VOID_USER_ID` - User who voided (if applicable)
  - `VOID_DATE` - Void timestamp

### 16. **CLARITY_DEP** (Departments)
- **Purpose**: Department reference data
- **Query Location**: Multiple locations for department names
- **Potential Audit Fields**:
  - Limited audit value for workflow tracking

### 17. **CLARITY_SER** (Service Providers)
- **Purpose**: Provider reference data
- **Query Location**: Line 266
- **Potential Audit Fields**:
  - Limited audit value for workflow tracking

### 18. **PATIENT** (Patient Demographics)
- **Purpose**: Patient information
- **Query Location**: Line 1290
- **Potential Audit Fields**:
  - `CREATE_USER_ID` - User who created patient record
  - `CREATE_INSTANT` - Patient record creation
  - `UPDATE_USER_ID` - Last modifier
  - `UPDATE_INSTANT` - Last modification

## Workflow Events to Track

Based on the tables and their purposes, here are the key workflow events that can be tracked:

### 1. **Patient Registration/Account Setup**
- Tables: PATIENT, ACCOUNT, ACCT_GUAR_PAT_INFO
- Track: Who created patient records, guarantor accounts, and linked them

### 2. **Encounter/Visit Workflow**
- Tables: PAT_ENC, ARPB_VISITS, HSP_ACCOUNT
- Track: Check-in, check-out, encounter creation, admission, discharge

### 3. **Charge Entry Workflow**
- Tables: ARPB_TRANSACTIONS, HSP_TRANSACTIONS, ARPB_CHG_ENTRY_DX
- Track: Who entered charges, when, with which diagnoses

### 4. **Insurance Verification**
- Tables: COVERAGE, COVERAGE_MEMBER_LIST
- Track: Who verified coverage, when verification occurred

### 5. **Billing/Claims Workflow**
- Tables: INVOICE, INV_BASIC_INFO, INV_TX_PIECES
- Track: Invoice creation, submission, status changes

### 6. **Payment Posting Workflow**
- Tables: ARPB_TRANSACTIONS (payment type), PMT_EOB_INFO_I, ARPB_TX_MATCH_HX
- Track: Payment posting, EOB processing, transaction matching

### 7. **Adjustment/Write-off Workflow**
- Tables: ARPB_TRANSACTIONS (adjustment types), HSP_TRANSACTIONS
- Track: Who made adjustments, reasons, approvals

## Recommended SQL Pattern for Workflow Audit

```sql
-- Example: Track all activities for a patient encounter
SELECT 
    'Encounter Created' as action,
    pe.ENC_CREATE_USER_ID as user_id,
    pe.ENC_CREATE_USER_ID_NAME as user_name,
    pe.ENC_CREATE_INSTANT as action_timestamp,
    pe.PAT_ENC_CSN_ID as encounter_id,
    pe.DEPARTMENT_ID,
    NULL as transaction_id,
    NULL as amount
FROM PAT_ENC pe
WHERE pe.PAT_ID = ?

UNION ALL

SELECT 
    'Charge Entered' as action,
    at.CREATE_USER_ID as user_id,
    NULL as user_name,
    at.CREATE_INSTANT as action_timestamp,
    at.VISIT_NUMBER as encounter_id,
    at.DEPARTMENT_ID,
    at.TX_ID as transaction_id,
    at.AMOUNT as amount
FROM ARPB_TRANSACTIONS at
WHERE at.ACCOUNT_ID = ? AND at.TX_TYPE_C = 1 -- Charges

UNION ALL

SELECT 
    'Payment Posted' as action,
    at.POST_USER_ID as user_id,
    NULL as user_name,
    at.POST_DATE as action_timestamp,
    at.VISIT_NUMBER as encounter_id,
    at.DEPARTMENT_ID,
    at.TX_ID as transaction_id,
    at.AMOUNT as amount
FROM ARPB_TRANSACTIONS at
WHERE at.ACCOUNT_ID = ? AND at.TX_TYPE_C = 2 -- Payments

ORDER BY action_timestamp;
```

## Next Steps

1. **Verify Column Names**: Use PRAGMA table_info or query the actual metadata table to confirm exact column names
2. **Test Queries**: Run sample queries to verify which audit columns actually exist
3. **Build Audit Views**: Create views that consolidate workflow events across tables
4. **Add User Name Lookup**: Join with user tables to get readable names instead of just IDs
5. **Implement Change Tracking**: For tables with HX (history) versions, track all changes over time