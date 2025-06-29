# Tracking Patient Conditions: Diagnoses and Problem Lists

*Purpose: Learn how Epic tracks patient health conditions through two complementary systems - longitudinal problem lists and encounter-specific diagnoses - and how they work together to support clinical care and billing.*

### The Two-Track System for Patient Conditions

Imagine you're a physician seeing a patient with diabetes. When they come in for a routine check-up, you need to know their ongoing health issues (their problem list), but you also need to document what you addressed in today's visit (encounter diagnoses). Epic's diagnosis domain elegantly handles both needs through separate but connected systems.

In our sample database, we have 33 distinct diagnoses being used across 19 patient encounters, with comprehensive tracking of both acute visit reasons and chronic conditions. Let's explore how this dual system works.

### Starting Simple: The Diagnosis Master

Every diagnosis in Epic starts with a master record in CLARITY_EDG. This table serves as the single source of truth for diagnosis definitions:

<example-query description="Explore the diagnosis master table to see available diagnoses">
SELECT 
    DX_ID,
    DX_NAME,
    PAT_FRIENDLY_TEXT
FROM CLARITY_EDG
WHERE DX_NAME LIKE '%concussion%' 
   OR DX_NAME LIKE '%reflux%'
   OR DX_NAME LIKE '%hypertension%'
ORDER BY DX_NAME;
</example-query>

Notice how each diagnosis has:
- A unique DX_ID for internal reference
- A clinical DX_NAME for providers
- An optional PAT_FRIENDLY_TEXT for patient portals

### Problem Lists: The Longitudinal View

Problem lists track ongoing health issues that persist across multiple encounters. Let's examine how Epic structures this critical clinical data:

<example-query description="View active problems with their key attributes">
SELECT 
    pl.PROBLEM_LIST_ID,
    edg.DX_NAME,
    pl.PROBLEM_STATUS_C_NAME as status,
    pl.CHRONIC_YN as is_chronic,
    pl.NOTED_DATE,
    pl.SHOW_IN_MYC_YN as visible_to_patient
FROM PROBLEM_LIST pl
JOIN CLARITY_EDG edg ON pl.DX_ID = edg.DX_ID
WHERE pl.PROBLEM_STATUS_C_NAME = 'Active';
</example-query>

The PROBLEM_LIST table captures not just what conditions a patient has, but also:
- When each problem was first noted
- Whether it's chronic
- If patients can see it in their portal
- The current status (Active, Resolved, or Deleted)

### Connecting Patients to Their Problems

Epic uses the PAT_PROBLEM_LIST table to efficiently link patients to their problems. This follows Epic's common ID-LINE pattern:

<example-query description="See how problems are linked to a specific patient">
SELECT 
    p.PAT_NAME,
    ppl.LINE as problem_number,
    edg.DX_NAME,
    pl.NOTED_DATE,
    JULIANDAY('now') - JULIANDAY(pl.NOTED_DATE) as days_on_list
FROM PATIENT p
JOIN PAT_PROBLEM_LIST ppl ON p.PAT_ID = ppl.PAT_ID
JOIN PROBLEM_LIST pl ON ppl.PROBLEM_LIST_ID = pl.PROBLEM_LIST_ID
JOIN CLARITY_EDG edg ON pl.DX_ID = edg.DX_ID
WHERE p.PAT_ID = 'Z7004242'
ORDER BY ppl.LINE;
</example-query>

This patient has two problems on their list, tracked for different durations. The LINE field provides ordering but doesn't indicate priority - that's stored separately in the PROBLEM_LIST table.

### The Audit Trail: Problem List History

Healthcare requires meticulous documentation of changes. The PROBLEM_LIST_HX table captures every modification:

<example-query description="View the complete history of changes to problem lists">
SELECT 
    plh.PROBLEM_LIST_ID,
    plh.LINE as change_number,
    plh.HX_STATUS_C_NAME as status_at_time,
    plh.HX_ENTRY_INST as change_timestamp,
    plh.HX_ENTRY_USER_ID_NAME as changed_by,
    plh.HX_PROBLEM_EPT_CSN as encounter_id
FROM PROBLEM_LIST_HX plh
ORDER BY plh.PROBLEM_LIST_ID, plh.LINE;
</example-query>

Each row represents a snapshot of the problem at a specific point in time, showing who made changes and during which encounter.

### Encounter Diagnoses: The Visit-Specific View

While problem lists track ongoing conditions, PAT_ENC_DX captures diagnoses specific to each encounter:

<example-query description="Examine diagnoses from a specific encounter with problem linkage">
SELECT 
    ped.LINE as dx_priority,
    ped.PRIMARY_DX_YN as is_primary,
    edg.DX_NAME,
    CASE 
        WHEN ped.DX_LINK_PROB_ID IS NOT NULL THEN 'Yes'
        ELSE 'No'
    END as linked_to_problem,
    ped.DX_CHRONIC_YN as is_chronic
FROM PAT_ENC_DX ped
JOIN CLARITY_EDG edg ON ped.DX_ID = edg.DX_ID
WHERE ped.PAT_ENC_CSN_ID = 948004323.0
ORDER BY ped.LINE;
</example-query>

Key insights from encounter diagnoses:
- Each encounter can have multiple diagnoses
- One should be marked as primary (PRIMARY_DX_YN = 'Y')
- Diagnoses can link back to problem list entries
- The system tracks whether each diagnosis is chronic

### The Power of Linked Diagnoses

When encounter diagnoses link to problem lists, it creates powerful clinical intelligence:

<example-query description="Find encounters where existing problems were addressed">
SELECT 
    pe.CONTACT_DATE,
    edg_enc.DX_NAME as encounter_diagnosis,
    edg_prob.DX_NAME as linked_problem,
    pl.NOTED_DATE as problem_start_date
FROM PAT_ENC_DX ped
JOIN PAT_ENC pe ON ped.PAT_ENC_CSN_ID = pe.PAT_ENC_CSN_ID
JOIN CLARITY_EDG edg_enc ON ped.DX_ID = edg_enc.DX_ID
JOIN PROBLEM_LIST pl ON ped.DX_LINK_PROB_ID = pl.PROBLEM_LIST_ID
JOIN CLARITY_EDG edg_prob ON pl.DX_ID = edg_prob.DX_ID
WHERE ped.DX_LINK_PROB_ID IS NOT NULL
  AND pe.PAT_ID = 'Z7004242'
ORDER BY pe.CONTACT_DATE DESC
LIMIT 5;
</example-query>

This linkage helps providers understand which chronic conditions are being actively managed during each visit.

### From Clinical Documentation to Billing

The TX_DIAG table bridges clinical documentation to revenue cycle:

<example-query description="See how diagnoses flow to billing transactions">
SELECT 
    td.TX_ID,
    td.LINE as billing_priority,
    edg.DX_NAME,
    td.DX_QUALIFIER_C_NAME as status,
    td.POST_DATE
FROM TX_DIAG td
JOIN CLARITY_EDG edg ON td.DX_ID = edg.DX_ID
WHERE td.LINE = 1  -- Primary diagnoses for billing
ORDER BY td.POST_DATE DESC
LIMIT 5;
</example-query>

Notice how:
- LINE determines billing priority (1 = primary)
- Each transaction can have multiple supporting diagnoses
- The qualifier indicates the diagnosis status

### Hospital-Specific Diagnosis Tracking

Inpatient care requires additional diagnosis tracking. The HSP_ADMIT_DIAG table captures admission diagnoses:

<example-query description="View hospital admission diagnoses">
SELECT 
    had.PAT_ENC_CSN_ID,
    had.LINE,
    edg.DX_NAME as admission_diagnosis,
    pe.HOSP_ADMSN_TIME
FROM HSP_ADMIT_DIAG had
JOIN CLARITY_EDG edg ON had.DX_ID = edg.DX_ID
JOIN PAT_ENC pe ON had.PAT_ENC_CSN_ID = pe.PAT_ENC_CSN_ID;
</example-query>

Admission diagnoses are crucial for:
- DRG assignment
- Medical necessity documentation
- Quality reporting

### Supporting Clinical Orders with Diagnoses

Epic links diagnoses to orders to establish medical necessity:

<example-query description="See diagnoses supporting procedure orders">
SELECT 
    odp.ORDER_PROC_ID,
    edg.DX_NAME as supporting_diagnosis,
    odp.DX_QUALIFIER_C_NAME,
    op.DESCRIPTION as procedure_ordered
FROM ORDER_DX_PROC odp
JOIN CLARITY_EDG edg ON odp.DX_ID = edg.DX_ID
JOIN ORDER_PROC op ON odp.ORDER_PROC_ID = op.ORDER_PROC_ID
WHERE edg.DX_NAME LIKE '%screening%'
LIMIT 5;
</example-query>

This linkage is essential for:
- Insurance authorization
- Clinical decision support
- Appropriate use criteria

### Analyzing Diagnosis Patterns

Understanding diagnosis patterns helps improve care quality:

<example-query description="Analyze primary diagnosis patterns across encounters">
WITH primary_diagnoses AS (
    SELECT 
        ped.DX_ID,
        COUNT(*) as encounter_count
    FROM PAT_ENC_DX ped
    WHERE ped.PRIMARY_DX_YN = 'Y'
    GROUP BY ped.DX_ID
)
SELECT 
    edg.DX_NAME,
    pd.encounter_count,
    ROUND(pd.encounter_count * 100.0 / 
        (SELECT COUNT(DISTINCT PAT_ENC_CSN_ID) 
         FROM PAT_ENC_DX WHERE PRIMARY_DX_YN = 'Y'), 1) as pct_of_encounters
FROM primary_diagnoses pd
JOIN CLARITY_EDG edg ON pd.DX_ID = edg.DX_ID
ORDER BY pd.encounter_count DESC
LIMIT 5;
</example-query>

This analysis reveals the most common primary diagnoses, helping identify:
- Service line volumes
- Population health needs
- Documentation patterns

### Identifying Care Gaps

The separation of problem lists and encounter diagnoses enables powerful quality analytics:

<example-query description="Find chronic problems not recently addressed">
SELECT 
    p.PAT_NAME,
    edg.DX_NAME as chronic_problem,
    pl.NOTED_DATE as problem_start,
    MAX(pe.CONTACT_DATE) as last_encounter
FROM PATIENT p
JOIN PAT_PROBLEM_LIST ppl ON p.PAT_ID = ppl.PAT_ID
JOIN PROBLEM_LIST pl ON ppl.PROBLEM_LIST_ID = pl.PROBLEM_LIST_ID
JOIN CLARITY_EDG edg ON pl.DX_ID = edg.DX_ID
LEFT JOIN PAT_ENC pe ON p.PAT_ID = pe.PAT_ID
WHERE pl.PROBLEM_STATUS_C_NAME = 'Active'
  AND pl.CHRONIC_YN = 'N'  -- Even non-chronic problems need follow-up
GROUP BY p.PAT_NAME, edg.DX_NAME, pl.NOTED_DATE
HAVING MAX(pe.CONTACT_DATE) < date('now', '-90 days')
    OR MAX(pe.CONTACT_DATE) IS NULL;
</example-query>

This helps identify patients who may need outreach for condition management.

### Best Practices for Diagnosis Data Analysis

**1. Always Join to CLARITY_EDG**
```sql
-- Get human-readable diagnosis names
SELECT 
    any_table.DX_ID,
    edg.DX_NAME  -- Much better than just the ID
FROM any_diagnosis_table any_table
JOIN CLARITY_EDG edg ON any_table.DX_ID = edg.DX_ID;
```

**2. Check for Primary Diagnosis Integrity**
```sql
-- Ensure each encounter has exactly one primary
SELECT 
    PAT_ENC_CSN_ID,
    SUM(CASE WHEN PRIMARY_DX_YN = 'Y' THEN 1 ELSE 0 END) as primary_count
FROM PAT_ENC_DX
GROUP BY PAT_ENC_CSN_ID
HAVING primary_count != 1;
```

**3. Use Problem-Diagnosis Links**
```sql
-- Leverage the built-in relationships
SELECT *
FROM PAT_ENC_DX 
WHERE DX_LINK_PROB_ID IS NOT NULL;  -- Linked to problem list
```

**4. Consider Diagnosis History**
```sql
-- Don't forget the audit trail
SELECT *
FROM PROBLEM_LIST_HX
WHERE PROBLEM_LIST_ID = ?
ORDER BY LINE;  -- Chronological order
```

### Summary

Epic's diagnosis domain implements a sophisticated two-track system:

1. **Problem Lists** provide the longitudinal view of ongoing conditions
2. **Encounter Diagnoses** capture visit-specific documentation
3. **Linkages** connect the two for clinical intelligence
4. **History Tables** maintain complete audit trails
5. **Integration Tables** support billing and quality reporting

This design enables providers to maintain comprehensive patient histories while documenting specific encounters, supporting both clinical care and administrative needs. The clear separation with optional linking provides flexibility while maintaining data integrity.

Remember: effective diagnosis documentation is the foundation for quality care, accurate billing, and meaningful analytics. Understanding these data structures empowers you to extract valuable insights from Epic's clinical data.