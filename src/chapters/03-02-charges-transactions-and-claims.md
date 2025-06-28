---
# Charges, Transactions, and Claims - The Financial Ledger

*Purpose: To dissect the core financial ledger—how clinical services become charges, accumulate into claims, and carry the codes that determine reimbursement.*

### The Transaction: Healthcare's Financial Atom

Every financial event in Epic—whether a $10,000 surgery charge or a $50 copay—is recorded as a transaction. These transactions form an immutable ledger, tracking every penny from initial charge to final payment.

<example-query description="See the variety of transaction types">
SELECT 
    TX_TYPE_C_NAME as transaction_type,
    COUNT(*) as count,
    SUM(AMOUNT) as total_amount
FROM ARPB_TRANSACTIONS
GROUP BY TX_TYPE_C_NAME
ORDER BY COUNT(*) DESC;
</example-query>

The pattern is universal: charges create debt, payments and adjustments reduce it. But the implementation differs between Epic's two billing systems.

### Professional Billing Transactions

The **ARPB_TRANSACTIONS** table serves as the ledger for all professional services:

<example-query description="Examine professional billing charges">
SELECT 
    t.TX_ID,
    t.SERVICE_DATE,
    t.TX_TYPE_C_NAME,
    t.AMOUNT,
    t.PROC_ID,
    e.PROC_NAME,
    t.MODIFIER_ONE
FROM ARPB_TRANSACTIONS t
LEFT JOIN CLARITY_EAP e ON t.PROC_ID = e.PROC_ID
WHERE t.TX_TYPE_C_NAME = 'Charge'
ORDER BY t.SERVICE_DATE DESC
LIMIT 5;
</example-query>

Key insights:
- **TX_ID**: Unique transaction identifier
- **PROC_ID**: Links to the procedure master (CLARITY_EAP)
- **AMOUNT**: Always positive for charges
- **MODIFIER_ONE**: First of four possible billing modifiers

### The Sign Convention

Epic follows accounting principles where sign indicates the effect on patient balance:

<example-query description="Prove the sign convention">
SELECT 
    TX_TYPE_C_NAME,
    MIN(AMOUNT) as min_amount,
    MAX(AMOUNT) as max_amount,
    AVG(AMOUNT) as avg_amount
FROM ARPB_TRANSACTIONS
GROUP BY TX_TYPE_C_NAME;
</example-query>

The rule is simple:
- **Charges**: Positive amounts (increase balance)
- **Payments**: Negative amounts (decrease balance)
- **Adjustments**: Negative amounts (decrease balance)

### Hospital Billing Transactions

Hospital billing uses **HSP_TRANSACTIONS** with more complex categorization:

<example-query description="Explore hospital transaction types">
SELECT 
    TX_TYPE_HA_C_NAME,
    COUNT(*) as count,
    SUM(TX_AMOUNT) as total_amount
FROM HSP_TRANSACTIONS
GROUP BY TX_TYPE_HA_C_NAME
ORDER BY ABS(SUM(TX_AMOUNT)) DESC;
</example-query>

Notice the distinction between:
- **Credit Adjustment**: Reduces balance (negative)
- **Debit Adjustment**: Increases balance (positive)

### Where Are the CPT Codes?

CPT codes—the universal language of medical billing—aren't stored in the procedure master. Instead, they're transaction-specific:

<example-query description="Find CPT codes in transaction data">
-- Professional billing: Often derived or stored separately
SELECT 
    'Professional' as system,
    COUNT(DISTINCT PROC_ID) as unique_procedures
FROM ARPB_TRANSACTIONS
WHERE TX_TYPE_C_NAME = 'Charge'

UNION ALL

-- Hospital billing: Stored at line level
SELECT 
    'Hospital',
    COUNT(DISTINCT LL_CPT_CODE) as unique_cpt_codes
FROM HSP_TX_LINE_INFO
WHERE LL_CPT_CODE IS NOT NULL;
</example-query>

This separation allows flexibility—the same procedure can have different CPT codes based on:
- Insurance requirements
- Place of service
- Billing modifiers
- Date of service

### The Power of Modifiers

Professional billing supports up to four modifiers per charge:

<example-query description="Analyze modifier usage patterns">
SELECT 
    MODIFIER_ONE,
    MODIFIER_TWO,
    MODIFIER_THREE,
    MODIFIER_FOUR,
    COUNT(*) as usage_count,
    AVG(AMOUNT) as avg_charge
FROM ARPB_TRANSACTIONS
WHERE TX_TYPE_C_NAME = 'Charge'
  AND MODIFIER_ONE IS NOT NULL
GROUP BY MODIFIER_ONE, MODIFIER_TWO, MODIFIER_THREE, MODIFIER_FOUR
ORDER BY usage_count DESC;
</example-query>

Common modifiers include:
- **25**: Significant, separately identifiable E/M service
- **59**: Distinct procedural service
- **95**: Synchronous telemedicine service

### Linking Transactions to Clinical Context

Transactions don't exist in isolation—they connect to the clinical events that justify them:

<example-query description="Connect charges to encounters and diagnoses">
SELECT 
    t.TX_ID,
    t.SERVICE_DATE,
    t.AMOUNT,
    e.PROC_NAME,
    pe.DEPARTMENT_ID,
    dx.DX_NAME as primary_diagnosis
FROM ARPB_TRANSACTIONS t
JOIN CLARITY_EAP e ON t.PROC_ID = e.PROC_ID
JOIN PAT_ENC pe ON pe.PAT_ENC_CSN_ID = pe.PAT_ENC_CSN_ID
LEFT JOIN PAT_ENC_DX ped ON pe.PAT_ENC_CSN_ID = ped.PAT_ENC_CSN_ID 
    AND ped.PRIMARY_DX_YN = 'Y'
LEFT JOIN CLARITY_EDG dx ON ped.DX_ID = dx.DX_ID
WHERE t.TX_TYPE_C_NAME = 'Charge'
LIMIT 5;
</example-query>

This linkage is crucial for:
- Medical necessity validation
- Audit compliance
- Denial management

### Revenue Codes for Hospital Billing

Hospital charges require revenue codes for UB-04 claim forms:

<example-query description="Explore revenue code usage">
SELECT 
    t.DFLT_UB_REV_CD_ID,
    t.DFLT_UB_REV_CD_ID_REVENUE_CODE_NAME,
    r.REVENUE_CODE_NAME,
    COUNT(*) as usage_count,
    SUM(t.TX_AMOUNT) as total_charges
FROM HSP_TRANSACTIONS t
LEFT JOIN CL_UB_REV_CODE r ON t.DFLT_UB_REV_CD_ID = r.UB_REV_CODE_ID
WHERE t.TX_TYPE_HA_C_NAME = 'Charge'
GROUP BY t.DFLT_UB_REV_CD_ID
ORDER BY usage_count DESC;
</example-query>

Revenue codes categorize services:
- 250s: Pharmacy
- 360s: Operating room
- 430s: Occupational therapy

### Transaction Metadata

Both systems track extensive metadata for audit and workflow:

<example-query description="Examine transaction audit information">
SELECT 
    t1.TX_ID,
    t1.POST_DATE,
    t1.SERVICE_DATE,
    t1.USER_ID_NAME as posted_by,
    t1.SERV_PROVIDER_ID,
    t1.BILLING_PROV_ID,
    t2.REPOST_REASON_C_NAME
FROM ARPB_TRANSACTIONS t1
LEFT JOIN ARPB_TRANSACTIONS2 t2 ON t1.TX_ID = t2.TX_ID
WHERE t1.TX_TYPE_C_NAME = 'Charge'
LIMIT 5;
</example-query>

Provider tracking enables:
- Productivity reporting
- Compliance auditing
- Revenue attribution

### From Transactions to Claims

Transactions aggregate into claims for insurance submission:

<example-query description="Trace transactions to claims">
SELECT 
    s.TX_ID,
    -- CLAIM_ID not in this table,
    -- Claim details not available in this extract
    t.AMOUNT as charge_amount
FROM ARPB_TX_STMCLAIMHX s
JOIN ARPB_TRANSACTIONS t ON s.TX_ID = t.TX_ID
-- JOIN to CLAIM_INFO not available
WHERE t.TX_TYPE_C_NAME = 'Charge'
LIMIT 5;
</example-query>

The claim aggregation process:
1. Charges accumulate on accounts
2. Billing rules group charges into claims
3. Claims are submitted to payers
4. Responses update transaction statuses

### Voided and Reversed Transactions

Mistakes happen. Epic maintains complete audit trails through voids and reversals:

<example-query description="Find voided transactions">
SELECT 
    t.TX_ID,
    t.TX_TYPE_C_NAME,
    t.AMOUNT,
    t.VOID_DATE,
    v.VOID_REASON_C_NAME,
    v.IS_REVERSED_C_NAME
FROM ARPB_TRANSACTIONS t
LEFT JOIN ARPB_TX_VOID v ON t.TX_ID = v.TX_ID
WHERE t.VOID_DATE IS NOT NULL
   OR v.TX_ID IS NOT NULL
LIMIT 5;
</example-query>

Key principles:
- Original transactions are never deleted
- Voids mark transactions as invalid
- Reversals create offsetting transactions
- Complete audit trail maintained

### DRG Assignment for Hospital Accounts

Hospital reimbursement often depends on Diagnosis-Related Groups (DRGs):

<example-query description="See DRG assignments on hospital accounts">
SELECT 
    h.HSP_ACCOUNT_ID,
    h.FINAL_DRG_ID,
    h.FINAL_DRG_ID_DRG_NAME,
    h.BILL_DRG_WEIGHT,
    SUM(t.TX_AMOUNT) as total_charges
FROM HSP_ACCOUNT h
LEFT JOIN HSP_TRANSACTIONS t ON h.HSP_ACCOUNT_ID = t.HSP_ACCOUNT_ID
WHERE t.TX_TYPE_HA_C_NAME = 'Charge'
GROUP BY h.HSP_ACCOUNT_ID;
</example-query>

DRG assignment:
1. Diagnoses and procedures are coded
2. Grouper algorithm assigns DRG
3. DRG weight determines reimbursement
4. Actual charges become less relevant

### Building a Complete Charge Picture

To understand a service's full financial impact:

<example-query description="Create comprehensive charge analysis">
WITH charge_summary AS (
    SELECT 
        pe.PAT_ENC_CSN_ID,
        pe.CONTACT_DATE,
        pe.DEPARTMENT_ID,
        -- Professional charges
        SUM(CASE WHEN at.TX_TYPE_C_NAME = 'Charge' 
                 THEN at.AMOUNT ELSE 0 END) as prof_charges,
        -- Hospital charges  
        SUM(CASE WHEN ht.TX_TYPE_HA_C_NAME = 'Charge' 
                 THEN ht.TX_AMOUNT ELSE 0 END) as hosp_charges
    FROM PAT_ENC pe
    LEFT JOIN ARPB_TRANSACTIONS at ON pe.PAT_ENC_CSN_ID = pe.PAT_ENC_CSN_ID
    LEFT JOIN HSP_TRANSACTIONS ht ON pe.HSP_ACCOUNT_ID = ht.HSP_ACCOUNT_ID
    GROUP BY pe.PAT_ENC_CSN_ID
)
SELECT 
    PAT_ENC_CSN_ID,
    CONTACT_DATE,
    DEPARTMENT_ID,
    prof_charges,
    hosp_charges,
    prof_charges + hosp_charges as total_charges
FROM charge_summary
WHERE prof_charges > 0 OR hosp_charges > 0
ORDER BY total_charges DESC
LIMIT 5;
</example-query>

---

### Key Takeaways

- **ARPB_TRANSACTIONS** and **HSP_TRANSACTIONS** serve as immutable financial ledgers
- Charges are positive; payments and adjustments are negative (reducing balance)
- CPT codes live at the transaction level, not in procedure masters—enabling billing flexibility
- Professional billing supports four modifiers per charge for precise billing scenarios
- Revenue codes (in CL_UB_REV_CODE) categorize hospital services for UB-04 claims
- Transactions link to clinical context through encounter and diagnosis relationships
- Claims aggregate related transactions for insurance submission
- Voided transactions maintain audit trails—nothing is ever truly deleted
- DRGs drive hospital reimbursement independent of actual charges
- Complete financial pictures require joining both billing systems

---