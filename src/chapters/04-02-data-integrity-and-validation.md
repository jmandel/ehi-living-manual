---
# Data Integrity and Validation

*Purpose: To transform you from a data consumer into a data critic, equipped with SQL techniques to identify and quantify quality issues.*

### The Reality of Healthcare Data

Perfect data doesn't exist in healthcare. Between the complexity of clinical workflows, system integrations, and human factors, data quality issues are inevitable. The question isn't whether your data has problems—it's whether you can find and quantify them.

This chapter provides a systematic approach to data validation, teaching you to be appropriately skeptical without becoming paralyzed by imperfection.

### Orphaned Records: When Relationships Break

The most fundamental data integrity check ensures referential integrity—that child records have valid parents:

<example-query description="Check for orphaned diagnosis records">
SELECT 
    'Total diagnoses' as metric,
    COUNT(*) as count
FROM PAT_ENC_DX

UNION ALL

SELECT 
    'Orphaned diagnoses (no encounter)' as metric,
    COUNT(*) as count
FROM PAT_ENC_DX dx
LEFT JOIN PAT_ENC enc ON dx.PAT_ENC_CSN_ID = enc.PAT_ENC_CSN_ID
WHERE enc.PAT_ENC_CSN_ID IS NULL

UNION ALL

SELECT 
    'Diagnoses with invalid DX_ID' as metric,
    COUNT(*) as count
FROM PAT_ENC_DX dx
LEFT JOIN CLARITY_EDG edg ON dx.DX_ID = edg.DX_ID
WHERE edg.DX_ID IS NULL;
</example-query>

This pattern—LEFT JOIN with NULL check—is your primary tool for finding orphaned records.

<example-query description="Systematic orphan check across domains">
WITH orphan_checks AS (
    -- Orders without encounters
    SELECT 'Orders without encounters' as check_type,
           COUNT(*) as orphan_count
    FROM ORDER_PROC o
    LEFT JOIN PAT_ENC e ON o.PAT_ENC_CSN_ID = e.PAT_ENC_CSN_ID
    WHERE e.PAT_ENC_CSN_ID IS NULL
    
    UNION ALL
    
    -- Results without orders
    SELECT 'Results without orders',
           COUNT(*)
    FROM ORDER_RESULTS r
    LEFT JOIN ORDER_PROC o ON r.ORDER_PROC_ID = o.ORDER_PROC_ID
    WHERE o.ORDER_PROC_ID IS NULL
    
    UNION ALL
    
    -- Transaction matches without valid transactions
    SELECT 'Payment matches without payments',
           COUNT(*)
    FROM ARPB_TX_MATCH_HX m
    LEFT JOIN ARPB_TRANSACTIONS t ON m.TX_ID = t.TX_ID
    WHERE t.TX_ID IS NULL
)
SELECT 
    check_type,
    orphan_count,
    CASE 
        WHEN orphan_count = 0 THEN '✓ No orphans found'
        ELSE '✗ Orphan records exist'
    END as status
FROM orphan_checks;
</example-query>

In well-maintained systems, orphaned records should be rare. Their presence often indicates:
- Failed ETL processes
- Incomplete data migrations
- Missing archive/purge coordination

### Temporal Validation: When Time Doesn't Make Sense

Healthcare events must follow logical time sequences. Patients can't be discharged before admission, medications can't end before they start:

<example-query description="Find impossible date sequences">
WITH date_validations AS (
    -- Hospital stays with negative duration
    SELECT 'Discharge before admission' as issue,
           COUNT(*) as count
    FROM PAT_ENC
    WHERE HOSP_ADMSN_TIME IS NOT NULL 
      AND HOSP_DISCHRG_TIME IS NOT NULL
      AND HOSP_ADMSN_TIME != ''
      AND HOSP_DISCHRG_TIME != ''
      AND julianday(HOSP_DISCHRG_TIME) < julianday(HOSP_ADMSN_TIME)
    
    UNION ALL
    
    -- Medications ending before start
    SELECT 'Medications ending before start',
           COUNT(*)
    FROM ORDER_MED
    WHERE ORDER_START_TIME IS NOT NULL
      AND ORDER_END_TIME IS NOT NULL
      AND julianday(ORDER_END_TIME) < julianday(ORDER_START_TIME)
    
    UNION ALL
    
    -- Future dated records
    SELECT 'Encounters in the future',
           COUNT(*)
    FROM PAT_ENC
    WHERE julianday(CONTACT_DATE) > julianday('now')
)
SELECT 
    issue,
    count,
    CASE 
        WHEN count = 0 THEN '✓ No issues found'
        ELSE '✗ Data integrity issue'
    END as status
FROM date_validations;
</example-query>

### Age and Demographics Validation

Demographic data often contains errors from registration or data entry:

<example-query description="Check for demographic anomalies">
WITH patient_age AS (
    SELECT 
        PAT_ID,
        PAT_NAME,
        BIRTH_DATE,
        -- Calculate age in years
        CAST((julianday('now') - julianday(
            SUBSTR(BIRTH_DATE, 7, 4) || '-' || 
            PRINTF('%02d', CAST(SUBSTR(BIRTH_DATE, 1, INSTR(BIRTH_DATE, '/') - 1) AS INT)) || '-' ||
            PRINTF('%02d', CAST(SUBSTR(BIRTH_DATE, INSTR(BIRTH_DATE, '/') + 1, 2) AS INT))
        )) / 365.25 AS INT) as age_years
    FROM PATIENT
    WHERE BIRTH_DATE IS NOT NULL
)
SELECT 
    CASE 
        WHEN age_years < 0 THEN 'Negative age (future birth)'
        WHEN age_years > 120 THEN 'Age over 120 years'
        WHEN age_years > 90 THEN 'Age 90-120 years'
        ELSE 'Normal age range'
    END as age_category,
    COUNT(*) as patient_count,
    MIN(age_years) as min_age,
    MAX(age_years) as max_age
FROM patient_age
GROUP BY age_category;
</example-query>

### Missing Critical Data

Some data elements are so fundamental that their absence indicates incomplete records:

<example-query description="Identify encounters missing critical elements">
WITH encounter_completeness AS (
    SELECT 
        e.PAT_ENC_CSN_ID,
        e.CONTACT_DATE,
        e.APPT_STATUS_C_NAME,
        -- Check for critical data
        CASE WHEN e.PAT_ID IS NULL THEN 1 ELSE 0 END as missing_patient,
        CASE WHEN e.CONTACT_DATE IS NULL THEN 1 ELSE 0 END as missing_date,
        CASE WHEN e.DEPARTMENT_ID IS NULL THEN 1 ELSE 0 END as missing_dept,
        CASE WHEN dx.PAT_ENC_CSN_ID IS NULL THEN 1 ELSE 0 END as missing_any_dx,
        CASE WHEN pdx.PAT_ENC_CSN_ID IS NULL THEN 1 ELSE 0 END as missing_primary_dx
    FROM PAT_ENC e
    LEFT JOIN PAT_ENC_DX dx ON e.PAT_ENC_CSN_ID = dx.PAT_ENC_CSN_ID
    LEFT JOIN PAT_ENC_DX pdx ON e.PAT_ENC_CSN_ID = pdx.PAT_ENC_CSN_ID 
        AND pdx.PRIMARY_DX_YN = 'Y'
    WHERE e.APPT_STATUS_C_NAME = 'Completed'
)
SELECT 
    'Missing patient ID' as issue, SUM(missing_patient) as count
FROM encounter_completeness
UNION ALL
SELECT 'Missing contact date', SUM(missing_date)
FROM encounter_completeness
UNION ALL
SELECT 'Missing department', SUM(missing_dept)
FROM encounter_completeness
UNION ALL
SELECT 'Completed encounter without any diagnosis', SUM(missing_any_dx)
FROM encounter_completeness
UNION ALL
SELECT 'Completed encounter without primary diagnosis', SUM(missing_primary_dx)
FROM encounter_completeness;
</example-query>

### Duplicate Detection

Duplicate records can occur at multiple levels—patients, encounters, or transactions. Each requires different detection strategies:

<example-query description="Detect potential duplicate encounters">
-- Check for encounters that might be duplicates
SELECT 
    COUNT(*) as total_encounters,
    COUNT(DISTINCT PAT_ID) as unique_patients,
    COUNT(DISTINCT DATE(CONTACT_DATE) || '|' || PAT_ID || '|' || DEPARTMENT_ID) as unique_visits,
    COUNT(*) - COUNT(DISTINCT DATE(CONTACT_DATE) || '|' || PAT_ID || '|' || DEPARTMENT_ID) as potential_duplicates
FROM PAT_ENC
WHERE DEPARTMENT_ID IS NOT NULL;
</example-query>

### Duplicate Patient Detection

Finding duplicate patient records requires fuzzy matching techniques:

<example-query description="Simulate duplicate patient detection">
-- Since we have one patient, we'll simulate duplicates to demonstrate the technique
WITH real_patient AS (
    SELECT * FROM PATIENT WHERE PAT_ID = 'Z7004242'
),
simulated_patients AS (
    -- Original patient
    SELECT PAT_ID, PAT_MRN_ID, PAT_NAME, BIRTH_DATE, SEX_C_NAME_ 
    FROM real_patient
    
    UNION ALL
    -- Simulated typo in last name
    SELECT 'DUP001', PAT_MRN_ID || '1', 
           REPLACE(PAT_NAME, 'MANDEL', 'MANDAL'), BIRTH_DATE, SEX_C_NAME_
    FROM real_patient
    
    UNION ALL
    -- Simulated transposed birth date (MM/DD swapped)
    SELECT 'DUP002', PAT_MRN_ID || '2', PAT_NAME,
           REPLACE(BIRTH_DATE, '10/26', '26/10'), SEX_C_NAME_
    FROM real_patient
),
duplicate_check AS (
    SELECT 
        p1.PAT_ID as id1,
        p2.PAT_ID as id2,
        p1.PAT_NAME as name1,
        p2.PAT_NAME as name2,
        -- Name similarity checks
        CASE WHEN UPPER(p1.PAT_NAME) = UPPER(p2.PAT_NAME) THEN 100
             WHEN SUBSTR(UPPER(p1.PAT_NAME), 1, 10) = SUBSTR(UPPER(p2.PAT_NAME), 1, 10) THEN 80
             WHEN SUBSTR(UPPER(p1.PAT_NAME), 1, 5) = SUBSTR(UPPER(p2.PAT_NAME), 1, 5) THEN 60
             ELSE 0 END as name_match_score,
        -- DOB checks
        CASE WHEN p1.BIRTH_DATE = p2.BIRTH_DATE THEN 100
             WHEN SUBSTR(p1.BIRTH_DATE, 7, 4) = SUBSTR(p2.BIRTH_DATE, 7, 4) THEN 50
             ELSE 0 END as dob_match_score
    FROM simulated_patients p1
    JOIN simulated_patients p2 ON p1.PAT_ID < p2.PAT_ID
)
SELECT 
    id1, id2,
    name1, name2,
    name_match_score,
    dob_match_score,
    (name_match_score + dob_match_score) / 2 as overall_match_score,
    CASE 
        WHEN (name_match_score + dob_match_score) / 2 >= 90 THEN 'High probability duplicate'
        WHEN (name_match_score + dob_match_score) / 2 >= 70 THEN 'Possible duplicate'
        ELSE 'Unlikely duplicate'
    END as duplicate_assessment
FROM duplicate_check
ORDER BY overall_match_score DESC;
</example-query>

### Cross-Domain Validation

Some validation requires checking relationships across domains:

<example-query description="Validate clinical and financial data alignment">
-- Check if all charged procedures have corresponding orders
WITH charge_order_validation AS (
    SELECT 
        'Professional charges without orders' as check_type,
        COUNT(DISTINCT t.PROC_ID) as count
    FROM ARPB_TRANSACTIONS t
    LEFT JOIN ORDER_PROC o ON t.PROC_ID = o.PROC_ID
    WHERE t.TX_TYPE_C_NAME = 'Charge'
      AND t.PROC_ID IS NOT NULL
      AND o.ORDER_PROC_ID IS NULL
)
SELECT * FROM charge_order_validation;
</example-query>

### Building a Data Quality Dashboard

Combine multiple checks into a comprehensive quality assessment:

<example-query description="Create a data quality summary">
WITH quality_metrics AS (
    -- Completeness: Percentage of records with key fields
    SELECT 'Encounters with department' as metric,
           ROUND(100.0 * COUNT(DEPARTMENT_ID) / COUNT(*), 1) as percentage
    FROM PAT_ENC
    
    UNION ALL
    
    SELECT 'Diagnoses with primary flag',
           ROUND(100.0 * COUNT(CASE WHEN PRIMARY_DX_YN = 'Y' THEN 1 END) / 
                 COUNT(DISTINCT PAT_ENC_CSN_ID), 1)
    FROM PAT_ENC_DX
    
    UNION ALL
    
    -- Validity: Records within expected ranges
    SELECT 'Encounters with valid dates',
           ROUND(100.0 * COUNT(CASE 
               WHEN julianday(CONTACT_DATE) <= julianday('now') 
                AND julianday(CONTACT_DATE) > julianday('1900-01-01')
               THEN 1 END) / COUNT(*), 1)
    FROM PAT_ENC
    
    UNION ALL
    
    -- Consistency: Related data aligns
    SELECT 'Orders with results',
           ROUND(100.0 * COUNT(DISTINCT r.ORDER_PROC_ID) / 
                 COUNT(DISTINCT o.ORDER_PROC_ID), 1)
    FROM ORDER_PROC o
    LEFT JOIN ORDER_RESULTS r ON o.ORDER_PROC_ID = r.ORDER_PROC_ID
    WHERE o.ORDER_STATUS_C_NAME = 'Completed'
)
SELECT 
    metric,
    percentage,
    CASE 
        WHEN percentage >= 95 THEN '✓ Excellent'
        WHEN percentage >= 90 THEN '⚠ Good'
        WHEN percentage >= 80 THEN '⚠ Fair'
        ELSE '✗ Poor'
    END as quality_rating
FROM quality_metrics
ORDER BY percentage DESC;
</example-query>

### Best Practices for Data Validation

**1. Start with the Obvious**
- Check for NULLs in required fields
- Verify dates are in reasonable ranges
- Ensure numeric values are positive where expected

**2. Use Domain Knowledge**
- A 200-year-old patient is impossible
- Discharge before admission is illogical
- Some codes have valid value ranges

**3. Compare to Expectations**
```sql
-- If 95% of encounters have diagnoses, investigate the 5% that don't
SELECT * FROM encounters
WHERE encounter_id NOT IN (
    SELECT DISTINCT encounter_id FROM diagnoses
);
```

**4. Document Your Findings**
```sql
-- Create validation results table
CREATE TEMP TABLE data_quality_issues AS
SELECT 
    'Orphaned records' as issue_type,
    'ORDER_RESULTS' as table_name,
    COUNT(*) as record_count,
    'Results without corresponding orders' as description
FROM ORDER_RESULTS r
LEFT JOIN ORDER_PROC o ON r.ORDER_PROC_ID = o.ORDER_PROC_ID
WHERE o.ORDER_PROC_ID IS NULL;
```

### The Data Quality Paradox

Perfect data is a myth, but that doesn't mean all data is equally imperfect. Your goal isn't to achieve perfection but to:

1. **Understand** the nature and extent of quality issues
2. **Quantify** their impact on your analysis
3. **Decide** whether they materially affect your conclusions
4. **Document** known issues for data consumers

Remember: Healthcare data quality issues often reflect the complexity of healthcare itself. A "missing" diagnosis might indicate an incomplete record—or it might accurately represent a visit where no diagnosis was determined.

---

### Key Takeaways

- Use LEFT JOIN with NULL checks to find orphaned records systematically
- Temporal validation catches impossible sequences (discharge before admission)
- Demographic validation identifies registration errors and edge cases
- Duplicate detection requires fuzzy matching on names and dates
- Cross-domain validation ensures clinical and financial data align
- Build quality dashboards to track metrics over time
- Document known issues—transparency builds trust
- Perfect data doesn't exist; understanding imperfection is key

---