---
# Chapter 2.3: Diagnoses and Problems

*Purpose: To explain the critical distinction between episodic diagnoses and longitudinal problems, teaching you to query both types of conditions correctly.*

### Two Views of Patient Conditions

Epic separates patient conditions into two fundamentally different concepts:
- **Encounter Diagnoses**: Conditions addressed during a specific visit
- **Problem List**: Ongoing health issues tracked longitudinally

Understanding this distinction is crucial for accurate clinical reporting and quality measures.

<example-query description="Compare the two diagnosis storage models">
-- Encounter diagnoses: Multiple per visit
SELECT 'Encounter Diagnoses' as type, COUNT(*) as total_records
FROM PAT_ENC_DX

UNION ALL

-- Problem list: Ongoing conditions
SELECT 'Problem List', COUNT(*)
FROM PROBLEM_LIST;
</example-query>

### Encounter Diagnoses: The PAT_ENC_DX Table

Every encounter can have multiple diagnoses, organized using the familiar `(ID, LINE)` pattern:

<example-query description="Examine the encounter diagnosis structure">
SELECT 
    e.PAT_ENC_CSN_ID,
    e.LINE,
    e.DX_ID,
    e.PRIMARY_DX_YN,
    -- Join to get the diagnosis name
    d.DX_NAME
FROM PAT_ENC_DX e
JOIN CLARITY_EDG d ON e.DX_ID = d.DX_ID
WHERE e.PAT_ENC_CSN_ID = 720803470
ORDER BY e.LINE;
</example-query>

The LINE number indicates entry order, NOT clinical priority. This is a critical distinction.

### The Primary Diagnosis Flag

Epic uses an explicit flag to identify the primary diagnosis:

<example-query description="Prove that LINE does not equal priority">
-- Find cases where primary diagnosis is NOT LINE 1
SELECT 
    PAT_ENC_CSN_ID,
    LINE,
    PRIMARY_DX_YN,
    DX_ID,
    CASE 
        WHEN PRIMARY_DX_YN = 'Y' AND LINE > 1 
        THEN 'Primary diagnosis at LINE ' || LINE || '!'
        ELSE 'Normal'
    END as note
FROM PAT_ENC_DX
WHERE PRIMARY_DX_YN = 'Y' AND LINE > 1
LIMIT 5;
</example-query>

Always use `PRIMARY_DX_YN = 'Y'` to identify the primary diagnosis, never assume `LINE = 1`.

### The Diagnosis Master: CLARITY_EDG

The **CLARITY_EDG** table contains the master list of all diagnoses:

<example-query description="Explore the diagnosis master table">
SELECT 
    DX_ID,
    DX_NAME,
    -- Patient-friendly description when available
    -- DX_NAME not always present
    DX_NAME as patient_friendly_text
FROM CLARITY_EDG
WHERE DX_NAME LIKE '%reflux%'
ORDER BY DX_ID;
</example-query>

Note that this extract contains only Epic's internal diagnosis identifiers and names—not ICD codes.

### The Missing Link: ICD Codes

In this EHI extract, there's no direct mapping from DX_ID to ICD codes:

<example-query description="Search for ICD code columns in diagnosis tables">
-- Check if diagnosis tables have ICD code columns
SELECT 
    COUNT(*) as icd_columns,
    'Note: ICD codes appear in CLM_DX table for claims, not in clinical diagnosis tables' as explanation
FROM _metadata
WHERE (LOWER(column_name) LIKE '%icd%' 
       OR LOWER(column_name) LIKE '%dx_code%')
  AND table_name IN ('CLARITY_EDG', 'PAT_ENC_DX', 'PROBLEM_LIST');
</example-query>

However, ICD codes do appear in the claims data:

<example-query description="Find ICD codes in the claims table">
SELECT 
    CLM_DX as icd_code,
    CLM_DX_QUAL as code_type,
    COUNT(*) as occurrences
FROM CLM_DX
WHERE CLM_DX IS NOT NULL
GROUP BY CLM_DX, CLM_DX_QUAL
ORDER BY occurrences DESC
LIMIT 5;
</example-query>

The separation of clinical diagnoses (CLARITY_EDG) from billing codes (CLM_DX) is deliberate—it allows clinical documentation flexibility while maintaining billing precision.

### The Problem List: Longitudinal View

The **PROBLEM_LIST** table tracks ongoing health conditions:

<example-query description="Examine the problem list structure">
SELECT 
    p.PROBLEM_LIST_ID,
    p.DESCRIPTION,
    p.PROBLEM_STATUS_C_NAME,
    p.DATE_OF_ENTRY,
    p.RESOLVED_DATE,
    p.CHRONIC_YN
FROM PROBLEM_LIST p
ORDER BY p.DATE_OF_ENTRY;
</example-query>

Problems have three possible statuses:
- **Active**: Current health issue
- **Resolved**: No longer relevant
- **Deleted**: Entered in error

### Problem List History

Unlike encounter diagnoses, problems can change over time:

<example-query description="Check for problem list history tracking">
-- Look for history table
SELECT COUNT(*) as history_records
FROM PROBLEM_LIST_HX;
</example-query>

The history table tracks all changes to problems, supporting audit requirements.

### Linking Diagnoses to Problems

When a diagnosis from an encounter becomes a chronic condition:

<example-query description="Find chronic diagnoses that might be on problem list">
-- Check chronic diagnosis documentation
SELECT 
    DX_CHRONIC_YN,
    COUNT(*) as count,
    CASE 
        WHEN DX_CHRONIC_YN = 'Y' THEN 'Marked as chronic'
        WHEN DX_CHRONIC_YN = 'N' THEN 'Not chronic'
        ELSE 'Not specified'
    END as chronic_status
FROM PAT_ENC_DX
GROUP BY DX_CHRONIC_YN;
</example-query>

The `DX_CHRONIC_YN` flag suggests diagnoses that should be considered for the problem list.

### Diagnosis Grouping by Encounter

To understand the diagnostic complexity of encounters:

<example-query description="Analyze diagnosis patterns across encounters">
WITH dx_summary AS (
    SELECT 
        PAT_ENC_CSN_ID,
        COUNT(*) as diagnosis_count,
        SUM(CASE WHEN PRIMARY_DX_YN = 'Y' THEN 1 ELSE 0 END) as primary_count,
        SUM(CASE WHEN DX_CHRONIC_YN = 'Y' THEN 1 ELSE 0 END) as chronic_count
    FROM PAT_ENC_DX
    GROUP BY PAT_ENC_CSN_ID
)
SELECT 
    diagnosis_count,
    COUNT(*) as encounters,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(DISTINCT PAT_ENC_CSN_ID) FROM PAT_ENC_DX), 1) as percentage
FROM dx_summary
GROUP BY diagnosis_count
ORDER BY diagnosis_count;
</example-query>

### Common Diagnosis Queries

**Find all encounters for a specific condition:**
<example-query description="Find all GERD encounters">
SELECT 
    e.PAT_ENC_CSN_ID,
    p.CONTACT_DATE,
    e.PRIMARY_DX_YN,
    d.DX_NAME
FROM PAT_ENC_DX e
JOIN CLARITY_EDG d ON e.DX_ID = d.DX_ID
JOIN PAT_ENC p ON e.PAT_ENC_CSN_ID = p.PAT_ENC_CSN_ID
WHERE d.DX_NAME LIKE '%reflux%'
ORDER BY p.CONTACT_DATE DESC;
</example-query>

**Build a patient's diagnostic history:**
<example-query description="Create a timeline of diagnoses">
SELECT 
    p.CONTACT_DATE,
    e.LINE,
    e.PRIMARY_DX_YN,
    d.DX_NAME,
    e.DX_CHRONIC_YN
FROM PAT_ENC_DX e
JOIN CLARITY_EDG d ON e.DX_ID = d.DX_ID
JOIN PAT_ENC p ON e.PAT_ENC_CSN_ID = p.PAT_ENC_CSN_ID
WHERE p.PAT_ID = 'Z7004242'
ORDER BY p.PAT_ENC_DATE_REAL, e.LINE;
</example-query>

### Quality Measure Considerations

Many quality measures require identifying patients with specific conditions. The approach differs based on the measure:

<example-query description="Find diabetic patients (would check both sources)">
-- In practice, you'd check both encounter diagnoses and problem list
-- This example shows the encounter diagnosis approach
SELECT DISTINCT
    p.PAT_ID,
    d.DX_NAME,
    MAX(p.CONTACT_DATE) as most_recent_visit
FROM PAT_ENC_DX e
JOIN CLARITY_EDG d ON e.DX_ID = d.DX_ID
JOIN PAT_ENC p ON e.PAT_ENC_CSN_ID = p.PAT_ENC_CSN_ID
WHERE d.DX_NAME LIKE '%diabetes%'
GROUP BY p.PAT_ID, d.DX_NAME;
</example-query>

### Data Quality Checks

Verify diagnosis data integrity:

<example-query description="Check for data quality issues">
-- Encounters with multiple primary diagnoses (should be none)
WITH primary_count AS (
    SELECT 
        PAT_ENC_CSN_ID,
        SUM(CASE WHEN PRIMARY_DX_YN = 'Y' THEN 1 ELSE 0 END) as primary_dx_count
    FROM PAT_ENC_DX
    GROUP BY PAT_ENC_CSN_ID
)
SELECT 
    primary_dx_count,
    COUNT(*) as encounters
FROM primary_count
GROUP BY primary_dx_count
ORDER BY primary_dx_count;
</example-query>

### Working Without Direct ICD Mapping

Since this extract lacks DX_ID to ICD mapping, alternative approaches include:

<example-query description="Use diagnosis names for approximate matching">
-- Find potential hypertension cases by name
SELECT DISTINCT
    DX_ID,
    DX_NAME
FROM CLARITY_EDG
WHERE UPPER(DX_NAME) LIKE '%HYPERTENSION%'
   OR UPPER(DX_NAME) LIKE '%HIGH BLOOD PRESSURE%'
ORDER BY DX_NAME;
</example-query>

For precise ICD-based reporting, you would need to:
1. Request the full CLARITY_EDG table with REF_BILL_CODE
2. Use CLM_DX for claims-based analysis
3. Implement name-based matching with clinical validation

---

### Key Takeaways

- **PAT_ENC_DX** stores encounter-specific diagnoses using the (CSN_ID, LINE) pattern
- **PROBLEM_LIST** maintains longitudinal health conditions with status tracking
- **PRIMARY_DX_YN = 'Y'** identifies the primary diagnosis—never rely on LINE = 1
- **CLARITY_EDG** provides diagnosis names but lacks ICD codes in this extract
- **CLM_DX** contains actual ICD codes but only for billed claims
- Chronic conditions appear in both systems—encounter diagnoses with DX_CHRONIC_YN and the problem list
- Quality measures often require querying both encounter diagnoses and problem lists
- The separation of clinical documentation from billing codes is intentional

---