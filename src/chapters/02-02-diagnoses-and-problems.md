# Diagnoses and Problems: Two Sides of the Same Coin

*Purpose: To explain the critical distinction between episodic diagnoses (what was treated during a visit) and longitudinal problems (a patient's ongoing health issues), and to teach you how to query both correctly.*

### Two Views of Patient Conditions

Epic separates patient conditions into two fundamentally different but related concepts:

1.  **Encounter Diagnoses**: Conditions addressed during a specific visit. These are temporary and visit-specific.
2.  **Problem List**: A curated list of ongoing health issues, like diabetes or hypertension, that are tracked longitudinally across all encounters.

Understanding this distinction is crucial for accurate clinical analysis, quality reporting, and population health management.

<example-query description="Compare the record counts of the two diagnosis storage models">
-- Encounter diagnoses: Multiple per visit
SELECT 'Encounter Diagnoses' as type, COUNT(*) as total_records
FROM PAT_ENC_DX

UNION ALL

-- Problem list: Ongoing conditions
SELECT 'Problem List', COUNT(*)
FROM PROBLEM_LIST;
</example-query>

### Encounter Diagnoses: The `PAT_ENC_DX` Table

Every encounter can have multiple diagnoses, organized using the familiar `(ID, LINE)` pattern. These represent the clinician's assessment for that specific visit.

<example-query description="Examine the diagnosis structure for a single encounter">
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

**Crucially, the `LINE` number indicates entry order, NOT clinical priority.**

### The Primary Diagnosis Flag

To identify the main reason for the visit, Epic uses an explicit flag, `PRIMARY_DX_YN`.

<example-query description="Prove that LINE number does not indicate priority">
-- Find cases where the primary diagnosis is NOT at LINE 1
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

Always use `PRIMARY_DX_YN = 'Y'` to identify the primary diagnosis; never assume `LINE = 1`.

### The Problem List: A Longitudinal View

The **`PROBLEM_LIST`** table tracks a patient's ongoing health conditions over time. This list is actively managed by the care team.

<example-query description="View a patient's active problem list">
SELECT 
    pl.PROBLEM_LIST_ID,
    pl.DESCRIPTION,
    pl.PROBLEM_STATUS_C_NAME,
    pl.DATE_OF_ENTRY,
    pl.RESOLVED_DATE,
    pl.CHRONIC_YN
FROM PAT_PROBLEM_LIST ppl
JOIN PROBLEM_LIST pl ON ppl.PROBLEM_LIST_ID = pl.PROBLEM_LIST_ID
WHERE ppl.PAT_ID = 'Z7004242' AND pl.PROBLEM_STATUS_C_NAME = 'Active'
ORDER BY pl.DATE_OF_ENTRY;
</example-query>

Problems have three key statuses:
- **Active**: A current health issue.
- **Resolved**: The issue is no longer a concern.
- **Deleted**: The problem was entered in error.

### Linking Encounter Diagnoses to the Problem List

An encounter diagnosis can be linked to an existing problem or used to create a new one. The `DX_LINK_PROB_ID` field in `PAT_ENC_DX` creates this connection.

<example-query description="Find when ongoing problems were addressed in specific encounters">
SELECT 
    SUBSTR(pe.CONTACT_DATE, 1, 10) as Visit_Date,
    pl.DESCRIPTION as Problem_Addressed
FROM PAT_ENC pe
JOIN PAT_ENC_DX ped ON pe.PAT_ENC_CSN_ID = ped.PAT_ENC_CSN_ID
JOIN PROBLEM_LIST pl ON ped.DX_LINK_PROB_ID = pl.PROBLEM_LIST_ID
WHERE pe.PAT_ID = 'Z7004242'
  AND ped.DX_LINK_PROB_ID IS NOT NULL
ORDER BY pe.CONTACT_DATE DESC;
</example-query>

### The Diagnosis Master: `CLARITY_EDG`

Both systems link to the **`CLARITY_EDG`** table, which contains the master list of all diagnosis codes and their descriptions.

<example-query description="Look up common diagnoses in the master table">
SELECT 
    DX_ID,
    DX_NAME
FROM CLARITY_EDG
WHERE DX_NAME LIKE '%reflux%' OR DX_NAME LIKE '%diabetes%'
ORDER BY DX_ID;
</example-query>

Note that this EHI extract contains Epic's internal diagnosis identifiers (`DX_ID`), not standardized ICD codes.

### Analyzing a Patient's Complete Diagnostic History

By combining these tables, you can create a comprehensive view of a patient's health conditions.

<example-query description="Create a timeline of all diagnoses for a patient">
SELECT 
    p.CONTACT_DATE,
    e.LINE,
    e.PRIMARY_DX_YN,
    d.DX_NAME,
    e.DX_CHRONIC_YN,
    CASE WHEN e.DX_LINK_PROB_ID IS NOT NULL THEN 'Yes' ELSE 'No' END as Linked_to_Problem_List
FROM PAT_ENC_DX e
JOIN CLARITY_EDG d ON e.DX_ID = d.DX_ID
JOIN PAT_ENC p ON e.PAT_ENC_CSN_ID = p.PAT_ENC_CSN_ID
WHERE p.PAT_ID = 'Z7004242'
ORDER BY p.PAT_ENC_DATE_REAL, e.LINE;
</example-query>

---

### Key Takeaways

- **Two Systems**: Epic uses two systems to track conditions: `PAT_ENC_DX` for visit-specific diagnoses and `PROBLEM_LIST` for ongoing issues.
- **Primary Diagnosis**: Use `PRIMARY_DX_YN = 'Y'` to find the main diagnosis for a visit; do not rely on `LINE = 1`.
- **Longitudinal View**: The `PROBLEM_LIST` provides a patient's long-term health summary.
- **Linking**: The `DX_LINK_PROB_ID` field connects a visit diagnosis to an ongoing problem.
- **Master List**: `CLARITY_EDG` is the dictionary for all diagnosis codes (`DX_ID`).
- **No ICD Codes**: This EHI export uses internal `DX_ID`s, not standardized ICD codes, for clinical diagnoses. ICD codes are found separately in billing data.

---
