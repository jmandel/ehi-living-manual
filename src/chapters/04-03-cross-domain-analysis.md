---
# Cross-Domain Analysis: From Clicks to Cash

*Purpose: To synthesize everything you've learned, demonstrating how to answer complex questions that span clinical, financial, and operational domains.*

### The Ultimate Test

You've mastered Epic's patterns. You understand clinical workflows and financial transactions. You can spot data quality issues. Now it's time to put it all together. This chapter presents real-world scenarios that require linking multiple domains—the kinds of questions healthcare executives and clinical leaders actually ask.

Each scenario follows a pattern: understand the business need, design the approach, build the query incrementally, and interpret the results. These aren't just SQL exercises—they're templates for solving complex healthcare analytics problems.

### Scenario 1: Tracing Money Through the System

**The Question**: "Show me a single charge from creation to final payment—every transaction that touched it."

This fundamental question reveals how money flows through healthcare. Let's trace a charge through its complete lifecycle:

<example-query description="Find a charge with complete payment history">
-- First, find a charge that has been fully adjudicated
WITH charges_with_activity AS (
    SELECT 
        t.TX_ID,
        t.SERVICE_DATE,
        t.AMOUNT as charge_amount,
        t.PROC_ID,
        COUNT(DISTINCT m.TX_ID) as payment_count
    FROM ARPB_TRANSACTIONS t
    LEFT JOIN ARPB_TX_MATCH_HX m ON t.TX_ID = m.MTCH_TX_HX_ID
    WHERE t.TX_TYPE_C_NAME = 'Charge'
      AND t.AMOUNT > 0
    GROUP BY t.TX_ID
    HAVING payment_count > 0
)
SELECT * FROM charges_with_activity
ORDER BY payment_count DESC
LIMIT 5;
</example-query>

Now let's build the complete financial ledger for one charge:

<example-query description="Build complete transaction ledger for a charge">
-- Select a specific charge and show all related transactions
WITH charge_detail AS (
    -- The original charge
    SELECT 
        t.TX_ID,
        t.POST_DATE,
        t.SERVICE_DATE,
        'CHARGE' as transaction_category,
        t.TX_TYPE_C_NAME as transaction_type,
        t.AMOUNT,
        0 as running_balance,
        t.PROC_ID,
        p.PROC_NAME_
    FROM ARPB_TRANSACTIONS t
    LEFT JOIN CLARITY_EAP p ON t.PROC_ID = p.PROC_ID
    WHERE t.TX_ID = 129124216  -- Using a charge we know has activity
),
payment_detail AS (
    -- All payments and adjustments applied to this charge
    SELECT 
        p.TX_ID,
        p.POST_DATE,
        p.SERVICE_DATE,
        CASE 
            WHEN p.TX_TYPE_C_NAME = 'Payment' THEN 'PAYMENT'
            ELSE 'ADJUSTMENT'
        END as transaction_category,
        p.TX_TYPE_C_NAME as transaction_type,
        m.MTCH_TX_HX_AMT as AMOUNT,
        0 as running_balance,
        p.PROC_ID,
        '' as PROC_NAME_
    FROM ARPB_TX_MATCH_HX m
    JOIN ARPB_TRANSACTIONS p ON m.TX_ID = p.TX_ID
    WHERE m.MTCH_TX_HX_ID = 129124216
      AND m.MTCH_TX_HX_UN_DT IS NULL  -- Active matches only
)
-- Combine and calculate running balance
SELECT 
    POST_DATE,
    transaction_category,
    transaction_type,
    AMOUNT,
    SUM(AMOUNT) OVER (ORDER BY POST_DATE, transaction_category) as running_balance,
    PROC_NAME_ as procedure_name
FROM (
    SELECT * FROM charge_detail
    UNION ALL
    SELECT * FROM payment_detail
)
ORDER BY POST_DATE, 
         CASE transaction_category 
            WHEN 'CHARGE' THEN 1 
            WHEN 'ADJUSTMENT' THEN 2 
            WHEN 'PAYMENT' THEN 3 
         END;
</example-query>

### Scenario 2: Calculating 30-Day Readmissions

**The Question**: "What's our 30-day all-cause readmission rate?"

This critical quality metric requires careful attention to methodology:

<example-query description="Identify potential readmissions within 30 days">
WITH index_admissions AS (
    -- Find all hospital admissions with discharges
    SELECT 
        PAT_ID,
        PAT_ENC_CSN_ID as index_csn_id,
        HOSP_ADMSN_TIME as index_admission,
        HOSP_DISCHRG_TIME as index_discharge,
        PAT_ENC_DATE_REAL as index_date_real
    FROM PAT_ENC
    WHERE HOSP_ADMSN_TIME IS NOT NULL
      AND HOSP_DISCHRG_TIME IS NOT NULL
),
readmissions AS (
    -- Find readmissions within 30 days
    SELECT 
        i.PAT_ID,
        i.index_csn_id,
        i.index_discharge,
        r.PAT_ENC_CSN_ID as readmit_csn_id,
        r.HOSP_ADMSN_TIME as readmit_admission,
        -- Calculate days between discharge and readmission
        ROUND(julianday(r.HOSP_ADMSN_TIME) - julianday(i.index_discharge), 1) as days_to_readmit
    FROM index_admissions i
    JOIN PAT_ENC r ON i.PAT_ID = r.PAT_ID
    WHERE r.HOSP_ADMSN_TIME IS NOT NULL
      -- Readmission must be after index discharge
      AND r.PAT_ENC_DATE_REAL > i.index_date_real
      -- Within 30 days
      AND julianday(r.HOSP_ADMSN_TIME) - julianday(i.index_discharge) BETWEEN 0 AND 30
)
-- Calculate readmission rate
SELECT 
    COUNT(DISTINCT i.index_csn_id) as total_index_admissions,
    COUNT(DISTINCT CASE WHEN days_to_readmit <= 30 THEN i.index_csn_id END) as readmissions_30day,
    ROUND(100.0 * COUNT(DISTINCT CASE WHEN days_to_readmit <= 30 THEN i.index_csn_id END) / 
          COUNT(DISTINCT i.index_csn_id), 2) as readmission_rate_percent
FROM index_admissions i
LEFT JOIN readmissions r ON i.index_csn_id = r.index_csn_id;
</example-query>

For CMS compliance, we'd need to add exclusions:

<example-query description="Add readmission exclusions per CMS methodology">
-- More sophisticated readmission calculation with exclusions
WITH index_admissions AS (
    SELECT 
        e.PAT_ID,
        e.PAT_ENC_CSN_ID,
        e.HOSP_ADMSN_TIME,
        e.HOSP_DISCHRG_TIME,
        e.PAT_ENC_DATE_REAL,
        -- Check for exclusion criteria
        CASE 
            WHEN p.BIRTH_DATE IS NOT NULL 
             AND julianday(e.HOSP_DISCHRG_TIME) - julianday(
                SUBSTR(p.BIRTH_DATE, 7, 4) || '-' || 
                PRINTF('%02d', CAST(SUBSTR(p.BIRTH_DATE, 1, INSTR(p.BIRTH_DATE, '/') - 1) AS INT)) || '-' ||
                PRINTF('%02d', CAST(SUBSTR(p.BIRTH_DATE, INSTR(p.BIRTH_DATE, '/') + 1, 2) AS INT))
             ) < 365 * 18
            THEN 1 ELSE 0 
        END as is_pediatric,
        CASE 
            WHEN dx.DX_NAME LIKE '%obstetric%' 
              OR dx.DX_NAME LIKE '%pregnancy%' 
              OR dx.DX_NAME LIKE '%delivery%'
            THEN 1 ELSE 0 
        END as is_obstetric
    FROM PAT_ENC e
    JOIN PATIENT p ON e.PAT_ID = p.PAT_ID
    LEFT JOIN PAT_ENC_DX edx ON e.PAT_ENC_CSN_ID = edx.PAT_ENC_CSN_ID 
        AND edx.PRIMARY_DX_YN = 'Y'
    LEFT JOIN CLARITY_EDG dx ON edx.DX_ID = dx.DX_ID
    WHERE e.HOSP_ADMSN_TIME IS NOT NULL
      AND e.HOSP_DISCHRG_TIME IS NOT NULL
),
eligible_admissions AS (
    SELECT *
    FROM index_admissions
    WHERE is_pediatric = 0
      AND is_obstetric = 0
)
SELECT 
    COUNT(*) as eligible_discharges,
    SUM(is_pediatric) as excluded_pediatric,
    SUM(is_obstetric) as excluded_obstetric
FROM index_admissions;
</example-query>

### Scenario 3: Quality Metrics for Chronic Conditions

**The Question**: "Which hypertensive patients haven't had blood pressure documented in the last year?"

This requires linking problems, encounters, and clinical measurements:

<example-query description="Identify hypertensive patients missing BP checks">
-- Demonstrate quality gap analysis pattern
WITH chronic_patients AS (
    -- Find all patients with active chronic conditions
    SELECT DISTINCT
        ppl.PAT_ID,
        pl.PROBLEM_LIST_ID,
        pl.DESCRIPTION,
        pl.DATE_OF_ENTRY,
        pl.PROBLEM_STATUS_C_NAME
    FROM PROBLEM_LIST pl
    JOIN PAT_PROBLEM_LIST ppl ON pl.PROBLEM_LIST_ID = ppl.PROBLEM_LIST_ID_
    WHERE pl.PROBLEM_STATUS_C_NAME = 'Active'
),
recent_encounters AS (
    -- Find patients' most recent encounters
    SELECT 
        e.PAT_ID,
        MAX(e.CONTACT_DATE) as last_visit_date,
        COUNT(*) as visit_count_last_year
    FROM PAT_ENC e
    WHERE julianday('now') - julianday(e.CONTACT_DATE) <= 365
    GROUP BY e.PAT_ID
),
quality_analysis AS (
    SELECT 
        cp.PAT_ID,
        p.PAT_NAME,
        cp.DESCRIPTION as chronic_condition,
        cp.DATE_OF_ENTRY as condition_added,
        re.last_visit_date,
        re.visit_count_last_year,
        CASE 
            WHEN re.last_visit_date IS NULL THEN 'No visits recorded'
            WHEN julianday('now') - julianday(re.last_visit_date) > 365 THEN 'No recent visits (>1 year)'
            WHEN re.visit_count_last_year < 2 THEN 'Infrequent visits (<2/year)'
            ELSE 'Regular follow-up'
        END as followup_status
    FROM chronic_patients cp
    JOIN PATIENT p ON cp.PAT_ID = p.PAT_ID
    LEFT JOIN recent_encounters re ON cp.PAT_ID = re.PAT_ID
)
SELECT 
    followup_status,
    COUNT(*) as patient_count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) as percentage
FROM quality_analysis
GROUP BY followup_status
ORDER BY patient_count DESC;
</example-query>

In production, you'd join to actual flowsheet data:

<example-query description="Template for flowsheet-based BP monitoring">
-- This shows the structure for real flowsheet queries
SELECT 
    'In production, blood pressure would come from:' as note,
    'IP_FLWSHT_MEAS' as flowsheet_table,
    'FLO_MEAS_ID for systolic/diastolic BP' as measurement_type,
    'Join through PAT_ENC_CSN_ID' as linkage
FROM (SELECT 1 as dummy)

UNION ALL

SELECT 
    'Example FLO_MEAS_IDs:', '', '', ''
FROM (SELECT 1)

UNION ALL

SELECT 
    '5 = Systolic BP', '6 = Diastolic BP', '8 = Pulse', '9 = Temperature'
FROM (SELECT 1);
</example-query>

### Scenario 4: Linking Clinical Outcomes to Financial Impact

**The Question**: "What's the total charge and primary diagnosis for each DRG?"

This connects clinical documentation to reimbursement:

<example-query description="Connect DRGs to diagnoses and charges">
WITH drg_accounts AS (
    -- Get accounts with DRG assignments
    SELECT 
        h.HSP_ACCOUNT_ID,
        h.FINAL_DRG_ID,
        h.FINAL_DRG_ID_DRG_NAME,
        h.BILL_DRG_WEIGHT,
        h.TOT_CHGS,
        h.TOT_ADJ,
        h.TOT_CHGS + h.TOT_ADJ as net_revenue
    FROM HSP_ACCOUNT h
    WHERE h.FINAL_DRG_ID IS NOT NULL
      AND h.TOT_CHGS > 0
),
principal_diagnoses AS (
    -- Get principal diagnosis for each account
    SELECT 
        had.HSP_ACCOUNT_ID,
        had.LINE,
        had.DX_ID,
        edg.DX_NAME
    FROM HSP_ACCT_DX_LIST had
    JOIN CLARITY_EDG edg ON had.DX_ID = edg.DX_ID
    WHERE had.LINE = 1  -- Principal diagnosis
),
drg_analysis AS (
    SELECT 
        da.FINAL_DRG_ID,
        da.FINAL_DRG_ID_DRG_NAME,
        COUNT(*) as account_count,
        ROUND(AVG(da.BILL_DRG_WEIGHT), 3) as avg_drg_weight,
        ROUND(AVG(da.TOT_CHGS), 2) as avg_charges,
        ROUND(AVG(da.net_revenue), 2) as avg_net_revenue,
        -- Most common principal diagnosis
        pd.DX_NAME as principal_diagnosis
    FROM drg_accounts da
    LEFT JOIN principal_diagnoses pd ON da.HSP_ACCOUNT_ID = pd.HSP_ACCOUNT_ID
    GROUP BY da.FINAL_DRG_ID, da.FINAL_DRG_ID_DRG_NAME, pd.DX_NAME
)
SELECT * FROM drg_analysis
ORDER BY account_count DESC
LIMIT 10;
</example-query>

To complete the financial picture, link actual payments:

<example-query description="Calculate actual reimbursement by DRG">
-- Link DRGs to actual payments received
WITH drg_payments AS (
    SELECT 
        h.FINAL_DRG_ID,
        h.FINAL_DRG_ID_DRG_NAME,
        h.HSP_ACCOUNT_ID,
        h.TOT_CHGS,
        -- Sum all payments to this account
        COALESCE(SUM(
            CASE 
                WHEN t.TX_TYPE_HA_C_NAME = 'Payment' 
                THEN t.TX_AMOUNT 
                ELSE 0 
            END
        ), 0) as total_payments,
        -- Sum all adjustments
        COALESCE(SUM(
            CASE 
                WHEN t.TX_TYPE_HA_C_NAME LIKE '%Adjustment%' 
                THEN t.TX_AMOUNT 
                ELSE 0 
            END
        ), 0) as total_adjustments
    FROM HSP_ACCOUNT h
    LEFT JOIN HSP_TRANSACTIONS t ON h.HSP_ACCOUNT_ID = t.HSP_ACCOUNT_ID
    WHERE h.FINAL_DRG_ID IS NOT NULL
    GROUP BY h.HSP_ACCOUNT_ID
)
SELECT 
    FINAL_DRG_ID,
    FINAL_DRG_ID_DRG_NAME,
    COUNT(*) as cases,
    ROUND(AVG(TOT_CHGS), 2) as avg_charges,
    ROUND(AVG(ABS(total_payments)), 2) as avg_payment,
    ROUND(AVG(ABS(total_adjustments)), 2) as avg_adjustment,
    ROUND(100.0 * AVG(ABS(total_payments)) / AVG(TOT_CHGS), 1) as payment_to_charge_ratio
FROM drg_payments
WHERE TOT_CHGS > 0
GROUP BY FINAL_DRG_ID, FINAL_DRG_ID_DRG_NAME
ORDER BY cases DESC
LIMIT 5;
</example-query>

### Building Your Own Cross-Domain Analyses

The key to complex queries is incremental development:

1. **Start Simple**: Get the core data first
2. **Add Layers**: Join additional tables one at a time
3. **Test Each Step**: Verify row counts and relationships
4. **Optimize Last**: CTEs are readable; optimize only if needed

**Template for Complex Cross-Domain Queries**

```sql
-- Standard template for building complex analyses
WITH 
-- Step 1: Define your population
base_population AS (
    SELECT /* core fields */
    FROM /* primary table */
    WHERE /* inclusion criteria */
),
-- Step 2: Add clinical context
clinical_data AS (
    SELECT b.*, /* clinical fields */
    FROM base_population b
    LEFT JOIN /* clinical tables */
),
-- Step 3: Add financial data
financial_data AS (
    SELECT c.*, /* financial fields */
    FROM clinical_data c
    LEFT JOIN /* financial tables */
),
-- Step 4: Calculate metrics
final_metrics AS (
    SELECT 
        /* aggregations */,
        /* calculations */,
        /* categorizations */
    FROM financial_data
    GROUP BY /* appropriate level */
)
-- Step 5: Present results
SELECT * FROM final_metrics
ORDER BY /* business priority */;
```

### The Power of Integration

These scenarios demonstrate Epic's true value—not just storing data, but enabling connections across domains. A single patient encounter generates:

- Clinical documentation (diagnoses, procedures)
- Operational records (appointments, departments)
- Financial transactions (charges, payments)
- Quality metrics (outcomes, compliance)
- Patient engagement (portal messages, questionnaires)

Your ability to link these domains transforms raw data into actionable insights. Whether calculating readmissions, tracking quality gaps, or understanding revenue cycles, the patterns remain consistent: join thoughtfully, validate continuously, and always consider the clinical context.

---

### Key Takeaways

- Complex questions require incremental query building—start simple, add layers
- Charges flow through multiple transactions; use ARPB_TX_MATCH_HX to trace them
- Readmission calculations must consider exclusions (pediatric, obstetric) for accuracy
- Quality metrics often require joining problems to flowsheet measurements
- DRG analysis connects clinical documentation to financial outcomes
- Cross-domain queries follow a pattern: population → clinical → financial → metrics
- Always validate joins by checking row counts at each step
- The power of Epic's EHI lies in these connections between domains

---