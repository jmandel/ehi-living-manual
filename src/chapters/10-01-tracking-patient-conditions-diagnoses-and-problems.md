# Tracking Patient Conditions: Diagnoses and Problem Lists

*Purpose: Learn how Epic tracks patient health conditions through two complementary systems - longitudinal problem lists and encounter-specific diagnoses.*

### The Two-Track System for Patient Conditions

Epic tracks patient conditions in two ways:
1. **Problem Lists** - Ongoing conditions like diabetes or hypertension
2. **Encounter Diagnoses** - What was addressed in a specific visit

Let's see how this works with real data.

### Starting Simple: The Diagnosis Master

All diagnoses are stored in the CLARITY_EDG table:

<example-query description="Look up common diagnoses">
SELECT DX_ID, DX_NAME
FROM CLARITY_EDG
WHERE DX_NAME LIKE '%diabetes%' 
   OR DX_NAME LIKE '%hypertension%'
LIMIT 10;
</example-query>

### View a Patient's Problem List

Now let's see a patient's ongoing health issues:

<example-query description="View a patient's active problem list">
SELECT 
    edg.DX_NAME as Problem,
    pl.PROBLEM_STATUS_C_NAME as Status,
    SUBSTR(pl.NOTED_DATE, 1, 10) as Date_Noted
FROM PATIENT p
JOIN PAT_PROBLEM_LIST ppl ON p.PAT_ID = ppl.PAT_ID
JOIN PROBLEM_LIST pl ON ppl.PROBLEM_LIST_ID = pl.PROBLEM_LIST_ID
JOIN CLARITY_EDG edg ON pl.DX_ID = edg.DX_ID
WHERE p.PAT_ID = 'Z7004242'
  AND pl.PROBLEM_STATUS_C_NAME = 'Active'
ORDER BY pl.NOTED_DATE;
</example-query>

### Encounter Diagnoses

Each visit records what was addressed:

<example-query description="See diagnoses for a specific encounter">
SELECT 
    ped.LINE as Priority,
    edg.DX_NAME as Diagnosis,
    ped.PRIMARY_DX_YN as Is_Primary
FROM PAT_ENC pe
JOIN PAT_ENC_DX ped ON pe.PAT_ENC_CSN_ID = ped.PAT_ENC_CSN_ID
JOIN CLARITY_EDG edg ON ped.DX_ID = edg.DX_ID
WHERE pe.PAT_ID = 'Z7004242'
  AND EXISTS (SELECT 1 FROM PAT_ENC_DX WHERE PAT_ENC_CSN_ID = pe.PAT_ENC_CSN_ID)
ORDER BY pe.CONTACT_DATE DESC, ped.LINE
LIMIT 5;
</example-query>

### Linking Problems to Encounters

Let's see how problems connect to visits:

<example-query description="Find when problems were addressed in encounters">
SELECT 
    SUBSTR(pe.CONTACT_DATE, 1, 10) as Visit_Date,
    edg.DX_NAME as Problem_Addressed
FROM PAT_ENC pe
JOIN PAT_ENC_DX ped ON pe.PAT_ENC_CSN_ID = ped.PAT_ENC_CSN_ID
JOIN CLARITY_EDG edg ON ped.DX_ID = edg.DX_ID
WHERE pe.PAT_ID = 'Z7004242'
  AND ped.DX_LINK_PROB_ID IS NOT NULL
ORDER BY pe.CONTACT_DATE DESC;
</example-query>

### Analyzing Care Patterns

Finally, let's analyze how often problems are addressed:

<example-query description="Analyze active problems and care gaps">
SELECT 
    edg.DX_NAME as Problem,
    SUBSTR(pl.NOTED_DATE, 1, 10) as Date_Added,
    COUNT(DISTINCT pe.PAT_ENC_CSN_ID) as Times_Addressed
FROM PROBLEM_LIST pl
JOIN CLARITY_EDG edg ON pl.DX_ID = edg.DX_ID
JOIN PAT_PROBLEM_LIST ppl ON pl.PROBLEM_LIST_ID = ppl.PROBLEM_LIST_ID
LEFT JOIN PAT_ENC_DX ped ON ped.DX_LINK_PROB_ID = pl.PROBLEM_LIST_ID
LEFT JOIN PAT_ENC pe ON ped.PAT_ENC_CSN_ID = pe.PAT_ENC_CSN_ID
WHERE ppl.PAT_ID = 'Z7004242'
  AND pl.PROBLEM_STATUS_C_NAME = 'Active'
GROUP BY edg.DX_NAME, pl.NOTED_DATE;
</example-query>

### Key Tables Summary

**Core Tables:**
- `CLARITY_EDG` - Master diagnosis definitions
- `PROBLEM_LIST` - Ongoing health issues
- `PAT_PROBLEM_LIST` - Links patients to their problems
- `PAT_ENC_DX` - Encounter-specific diagnoses

**Key Relationships:**
- Problems can persist across many encounters
- Each encounter can have multiple diagnoses
- One diagnosis per encounter should be primary
- Encounter diagnoses can link to problem list entries

### Beyond the Basics

The diagnosis system extends to many other areas:
- **Billing**: TX_DIAG and HSP_ACCT_DX_LIST link diagnoses to charges
- **Admissions**: HSP_ADMIT_DIAG tracks admission diagnoses
- **Procedures**: ORDER_DX_PROC justifies procedures with diagnoses
- **History**: PROBLEM_LIST_HX tracks all changes over time

### Common Pitfalls

1. **Missing Joins**: Always join to CLARITY_EDG for readable names
2. **Status Filtering**: Remember to filter by PROBLEM_STATUS_C_NAME
3. **Primary Diagnosis**: Only one diagnosis per encounter should have PRIMARY_DX_YN = 'Y'
4. **Date Formats**: Epic dates are strings, use SUBSTR for cleaner display

### Summary

Epic's dual diagnosis system provides both longitudinal problem tracking and encounter-specific documentation. Understanding how these systems work together is essential for:
- Clinical decision support
- Quality reporting
- Population health management
- Revenue cycle optimization