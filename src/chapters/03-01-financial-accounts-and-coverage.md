---
# Financial Accounts and Coverage - Who Pays the Bill?

*Purpose: To explain the foundational entities of healthcare finance—the accounts that hold debt and the insurance coverage that mitigates it.*

### The Two Worlds of Healthcare Billing

Before any medical service generates a charge, Epic must answer a fundamental question: Who is financially responsible? The answer involves two parallel billing systems, each with its own account structure, workflow, and purpose. Understanding this duality is essential for navigating Epic's financial data model.

<example-query description="See the dual billing systems in action">
SELECT 
    PAT_ENC_CSN_ID,
    HSP_ACCOUNT_ID,
    ACCOUNT_ID,
    DEPARTMENT_ID
FROM PAT_ENC
WHERE HSP_ACCOUNT_ID IS NOT NULL 
  AND ACCOUNT_ID IS NOT NULL
LIMIT 5;
</example-query>

Notice how encounters 922942674 and 922943112 share the same hospital account (376684810) and professional account (4793998). This is Epic's dual billing system at work—one clinical event, two financial tracks.

### Hospital vs. Professional Billing

Epic separates billing into two distinct systems, reflecting how healthcare has traditionally been reimbursed:

<example-query description="Count tables in each billing system">
SELECT 
    'Hospital Billing (HSP_)' as system,
    COUNT(DISTINCT table_name) as table_count
FROM _metadata 
WHERE table_name LIKE 'HSP_%'

UNION ALL

SELECT 
    'Professional Billing (ARPB_)',
    COUNT(DISTINCT table_name)
FROM _metadata 
WHERE table_name LIKE 'ARPB_%';
</example-query>

**Hospital Billing** (52 tables):
- Manages facility charges: room fees, operating room time, supplies
- Uses **HSP_ACCOUNT** as the master record
- Bills for the "hotel" costs of healthcare

**Professional Billing** (15 tables):
- Manages provider charges: physician time, procedures, consultations
- Uses **ACCOUNT** (guarantor account) as the master record
- Bills for the intellectual and procedural work

### The Hospital Account (HAR)

The **HSP_ACCOUNT** table serves as the hub for all hospital billing:

<example-query description="Explore hospital account structure">
SELECT 
    h.HSP_ACCOUNT_ID,
    h.HSP_ACCOUNT_NAME,
    h.ACCT_CLASS_HA_C_NAME,
    h.TOT_CHGS,
    h.TOT_ADJ
FROM HSP_ACCOUNT h
LIMIT 5;
</example-query>

Key concepts:
- **HSP_ACCOUNT_ID**: The unique Hospital Account Record (HAR) identifier
- **ACCT_CLASS_HA_C_NAME**: Classifies the account (Inpatient, Outpatient, Emergency)
- Multiple encounters can share one HAR for episode-based billing

### The Guarantor Account Model

Professional billing revolves around the **guarantor**—the person financially responsible for charges:

<example-query description="Understand the guarantor account structure">
SELECT 
    ACCOUNT_ID,
    ACCOUNT_NAME,
    ACCOUNT_TYPE_C_NAME,
    TOTAL_BALANCE,
    INSURANCE_BALANCE,
    PATIENT_BALANCE
FROM ACCOUNT
LIMIT 5;
</example-query>

The guarantor model enables scenarios like:
- Parents responsible for children's medical bills
- Spouses covering each other
- Employers handling occupational health charges

### Linking Patients to Guarantors

The **PAT_ACCT_CVG** table reveals these financial relationships:

<example-query description="See how patients connect to guarantor accounts">
SELECT 
    p.PAT_ID,
    p.PAT_NAME,
    pac.ACCOUNT_ID,
    a.ACCOUNT_NAME,
    pac.GUAR_PAT_REL_NAME
FROM PATIENT p
JOIN PAT_ACCT_CVG pac ON p.PAT_ID = pac.PAT_ID
JOIN ACCOUNT a ON pac.ACCOUNT_ID = a.ACCOUNT_ID
ORDER BY p.PAT_ID, pac.LINE;
</example-query>

Our sample patient (Z7004242) has two guarantor accounts, both showing "Self"—they're their own guarantor. But the structure supports any relationship.

### Insurance Coverage: The Safety Net

The **COVERAGE** table stores insurance policy information:

<example-query description="Examine insurance coverage structure">
SELECT 
    c.COVERAGE_ID,
    c.COVERAGE_TYPE_C_NAME,
    c.PAYOR_ID_PAYOR_NAME,
    c.PLAN_ID_BENEFIT_PLAN_NAME,
    c.GROUP_NAME
FROM COVERAGE c;
</example-query>

Key insights:
- **COVERAGE_TYPE_C_NAME**: "Indemnity" vs. "Managed Care" determines data storage patterns
- **PAYOR_ID_PAYOR_NAME**: The insurance company (e.g., "BLUE CROSS OF WISCONSIN")
- **GROUP_NAME**: Often the employer ("Microsoft" in our example)

### Coverage Members and Relationships

Insurance policies cover multiple family members through **COVERAGE_MEMBER_LIST**:

<example-query description="See who's covered under each policy">
SELECT 
    cml.COVERAGE_ID,
    cml.LINE,
    cml.PAT_ID,
    p.PAT_NAME,
    cml.MEM_REL_TO_SUB_C_NAME,
    cml.MEM_COVERED_YN,
    cml.MEM_EFF_FROM_DATE
FROM COVERAGE_MEMBER_LIST cml
JOIN PATIENT p ON cml.PAT_ID = p.PAT_ID
ORDER BY cml.COVERAGE_ID, cml.LINE;
</example-query>

The **MEM_COVERED_YN** field tracks verification status:
- **"Y"** (Covered): Verified and active
- **"N"** (Not Covered): Manually invalidated
- **"?"** (Pending): Not verified but effective
- **"Q"** (In Question): Was verified, but recent info casts doubt

### Filing Order: Who Pays First?

When patients have multiple insurances, **PAT_CVG_FILE_ORDER** determines the payment sequence:

<example-query description="Check insurance filing order">
SELECT 
    pcfo.PAT_ID,
    pcfo.FILING_ORDER,
    c.PAYOR_ID_PAYOR_NAME,
    c.PLAN_ID_BENEFIT_PLAN_NAME
FROM PAT_CVG_FILE_ORDER pcfo
JOIN COVERAGE c ON pcfo.COVERAGE_ID = c.COVERAGE_ID
ORDER BY pcfo.PAT_ID, pcfo.FILING_ORDER;
</example-query>

Filing order rules:
- **1** = Primary insurance (pays first)
- **2** = Secondary insurance (pays remaining balance)
- **3+** = Additional coverage layers

### The Birthday Rule in Action

For dependent children with coverage from both parents, the "birthday rule" typically applies:

<example-query description="Find potential birthday rule scenarios">
-- Check relationship types in coverage (birthday rule applies to children)
SELECT 
    MEM_REL_TO_SUB_C_NAME as relationship,
    COUNT(DISTINCT PAT_ID) as patient_count,
    COUNT(DISTINCT COVERAGE_ID) as coverage_count,
    CASE 
        WHEN MEM_REL_TO_SUB_C_NAME = 'Child' THEN 'Birthday rule may apply'
        WHEN MEM_REL_TO_SUB_C_NAME = 'Self' THEN 'Primary subscriber'
        ELSE 'Other dependent'
    END as coverage_note
FROM COVERAGE_MEMBER_LIST
GROUP BY MEM_REL_TO_SUB_C_NAME;
</example-query>

The parent whose birthday comes first in the calendar year (month/day only) provides primary coverage. Epic can automate this determination or allow manual override for complex situations.

### Benefit Plans and Epic Payer Platform

The **CLARITY_EPP** table contains benefit plan details:

<example-query description="Explore benefit plan information">
SELECT 
    BENEFIT_PLAN_ID,
    BENEFIT_PLAN_NAME_
FROM CLARITY_EPP
LIMIT 5;
</example-query>

EPP (Epic Payer Platform) represents Epic's evolution toward integrated payer-provider data exchange, enabling:
- Real-time eligibility verification
- Automated prior authorization
- Streamlined claims processing

### Financial Class: The Billing Category

Both account types use financial class to categorize payment expectations:

<example-query description="Analyze financial classes across systems">
SELECT 
    'Hospital' as system,
    ACCT_FIN_CLASS_C_NAME,
    COUNT(*) as accounts
FROM HSP_ACCOUNT
WHERE ACCT_FIN_CLASS_C_NAME IS NOT NULL
GROUP BY ACCT_FIN_CLASS_C_NAME

UNION ALL

SELECT 
    'Professional',
    FIN_CLASS_C_NAME,
    COUNT(*)
FROM ACCOUNT
WHERE FIN_CLASS_C_NAME IS NOT NULL
GROUP BY FIN_CLASS_C_NAME;
</example-query>

### Bringing It All Together

To understand a patient's complete financial picture, you must query across multiple domains:

<example-query description="Create a comprehensive financial summary">
WITH patient_coverage AS (
    SELECT 
        p.PAT_ID,
        p.PAT_NAME,
        c.PAYOR_ID_PAYOR_NAME,
        pcfo.FILING_ORDER,
        cml.MEM_COVERED_YN
    FROM PATIENT p
    LEFT JOIN PAT_CVG_FILE_ORDER pcfo ON p.PAT_ID = pcfo.PAT_ID
    LEFT JOIN COVERAGE c ON pcfo.COVERAGE_ID = c.COVERAGE_ID
    LEFT JOIN COVERAGE_MEMBER_LIST cml ON c.COVERAGE_ID = cml.COVERAGE_ID 
        AND p.PAT_ID = cml.PAT_ID
),
patient_accounts AS (
    SELECT 
        pac.PAT_ID,
        COUNT(DISTINCT pac.ACCOUNT_ID) as guarantor_accounts,
        GROUP_CONCAT(pac.GUAR_PAT_REL_NAME, ', ') as relationships
    FROM PAT_ACCT_CVG pac
    GROUP BY pac.PAT_ID
)
SELECT 
    pc.PAT_ID,
    pc.PAT_NAME,
    pa.guarantor_accounts,
    pa.relationships,
    pc.PAYOR_ID_PAYOR_NAME as primary_insurance,
    pc.MEM_COVERED_YN as coverage_status
FROM patient_coverage pc
LEFT JOIN patient_accounts pa ON pc.PAT_ID = pa.PAT_ID
WHERE pc.FILING_ORDER = 1 OR pc.FILING_ORDER IS NULL;
</example-query>

---

### Key Takeaways

- Epic maintains **two parallel billing systems**: Hospital (HSP_) for facility charges and Professional (ARPB_) for provider charges
- **HSP_ACCOUNT** tracks hospital accounts; encounters can share accounts for episode billing
- **ACCOUNT** represents guarantor accounts—the person financially responsible (not always the patient)
- **PAT_ACCT_CVG** links patients to guarantor accounts with relationship tracking
- **COVERAGE** stores insurance policies; **COVERAGE_MEMBER_LIST** tracks who's covered
- **PAT_CVG_FILE_ORDER** determines primary vs. secondary insurance using integer ordering
- The birthday rule and other coordination of benefits rules can be automated or manually overridden
- **CLARITY_EPP** contains benefit plan details for Epic's integrated payer platform
- Financial class categorizes accounts for billing workflows and reporting

---