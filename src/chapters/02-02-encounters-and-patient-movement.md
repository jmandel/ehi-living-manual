# Encounters and Patient Movement

*Purpose: To dissect the encounter—the central organizing event in healthcare—and understand how Epic tracks every patient interaction and movement through the system, from outpatient clinics to hospital stays.*

### The Spine of Clinical Data

Every diagnosis, order, and clinical note connects to an encounter. It's the fundamental organizing principle of the medical record, representing each discrete interaction between a patient and the healthcare system. Epic's encounter model captures everything from a five-minute telehealth check-in to a month-long hospital stay.

<example-query description="View recent patient encounters">
SELECT 
    pe.PAT_ENC_CSN_ID as CSN,
    SUBSTR(pe.CONTACT_DATE, 1, 10) as Visit_Date,
    cd.DEPARTMENT_NAME as Department,
    cs.PROV_NAME as Provider,
    pe.APPT_STATUS_C_NAME as Status
FROM PAT_ENC pe
LEFT JOIN CLARITY_DEP cd ON pe.DEPARTMENT_ID = cd.DEPARTMENT_ID
LEFT JOIN CLARITY_SER cs ON pe.VISIT_PROV_ID = cs.PROV_ID
WHERE pe.PAT_ID = 'Z7004242'
ORDER BY pe.CONTACT_DATE DESC
LIMIT 10;
</example-query>

Each row represents a unique patient interaction, identified by the Contact Serial Number (CSN).

### Understanding the CSN (Contact Serial Number)

The **PAT_ENC_CSN_ID** is Epic's unique identifier for every patient interaction. It serves as the universal foreign key linking all encounter-related data.

<example-query description="Verify CSN uniqueness and its role as a primary key">
SELECT 
    COUNT(*) as total_encounters,
    COUNT(DISTINCT PAT_ENC_CSN_ID) as unique_csns,
    CASE 
        WHEN COUNT(*) = COUNT(DISTINCT PAT_ENC_CSN_ID) 
        THEN 'CSNs are unique (primary key)' 
        ELSE 'CSNs are not unique' 
    END as verification
FROM PAT_ENC;
</example-query>

### The Magic of PAT_ENC_DATE_REAL

When multiple encounters occur on the same day, how do you maintain chronological order? Epic's elegant solution uses decimal sequencing.

<example-query description="Demonstrate the decimal date pattern for chronological sorting">
SELECT 
    PAT_ID,
    CONTACT_DATE,
    PAT_ENC_DATE_REAL,
    -- Extract the sequence number
    ROUND((PAT_ENC_DATE_REAL - CAST(PAT_ENC_DATE_REAL AS INT)) * 100, 0) + 1 as encounter_sequence
FROM PAT_ENC
WHERE CONTACT_DATE = '9/28/2023 12:00:00 AM'
ORDER BY PAT_ENC_DATE_REAL;
</example-query>

The decimal portion (0.00, 0.01, 0.02...) provides unique sequencing for same-day encounters, guaranteeing a correct timeline.

### Encounter Types and Settings

Encounters occur in various settings, which can often be identified by the department name or specific encounter type fields.

<example-query description="Analyze encounter types across different departments">
SELECT 
    cd.DEPARTMENT_NAME as Department,
    COUNT(*) as Count,
    MIN(SUBSTR(pe.CONTACT_DATE, 1, 10)) as First_Visit,
    MAX(SUBSTR(pe.CONTACT_DATE, 1, 10)) as Last_Visit
FROM PAT_ENC pe
LEFT JOIN CLARITY_DEP cd ON pe.DEPARTMENT_ID = cd.DEPARTMENT_ID
WHERE pe.PAT_ID = 'Z7004242'
GROUP BY cd.DEPARTMENT_NAME
ORDER BY Count DESC;
</example-query>

### Hospital Admissions

For inpatient stays, `PAT_ENC` and the related `PAT_ENC_HSP` table track admission and discharge details.

<example-query description="View hospital admissions and length of stay">
SELECT 
    pe.PAT_ENC_CSN_ID as CSN,
    SUBSTR(pe.HOSP_ADMSN_TIME, 1, 10) as Admission_Date,
    SUBSTR(pe.HOSP_DISCHRG_TIME, 1, 10) as Discharge_Date,
    pe.HOSP_ADMSN_TYPE_C_NAME as Admission_Type,
    hsp.DISCH_DISP_C_NAME as Discharge_Disposition,
    CASE 
        WHEN pe.HOSP_ADMSN_TIME IS NOT NULL AND pe.HOSP_DISCHRG_TIME IS NOT NULL
        THEN ROUND(julianday(pe.HOSP_DISCHRG_TIME) - julianday(pe.HOSP_ADMSN_TIME), 2)
        ELSE NULL
    END as los_days
FROM PAT_ENC pe
LEFT JOIN PAT_ENC_HSP hsp ON pe.PAT_ENC_CSN_ID = hsp.PAT_ENC_CSN_ID
WHERE pe.PAT_ID = 'Z7004242'
  AND pe.HOSP_ADMSN_TIME IS NOT NULL
ORDER BY pe.HOSP_ADMSN_TIME DESC;
</example-query>

### The ADT Event Trail: Tracking Patient Movement

The **CLARITY_ADT** table provides a detailed audit trail of patient movement (Admission, Discharge, Transfer) within a facility.

<example-query description="Show the complete patient journey for an encounter">
SELECT 
    EVENT_TYPE_C_NAME,
    EFFECTIVE_TIME,
    -- Calculate time between events
    ROUND((julianday(EFFECTIVE_TIME) - 
           julianday(LAG(EFFECTIVE_TIME) OVER (ORDER BY EFFECTIVE_TIME))) * 24, 2) as hours_since_last_event
FROM CLARITY_ADT
WHERE PAT_ENC_CSN_ID = 922942674
ORDER BY EFFECTIVE_TIME;
</example-query>

### Appointment Status Lifecycle

The `APPT_STATUS_C_NAME` field tracks the workflow of scheduled appointments.

<example-query description="Analyze appointment status distribution">
SELECT 
    APPT_STATUS_C_NAME,
    COUNT(*) as count,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM PAT_ENC), 1) as percentage
FROM PAT_ENC
GROUP BY APPT_STATUS_C_NAME
ORDER BY count DESC;
</example-query>

Note that many encounters (especially non-scheduled or inpatient) may have a NULL status.

### Provider Roles in Encounters

Epic tracks multiple provider relationships for each encounter.

<example-query description="Understand the different provider roles">
SELECT 
    pe.PAT_ENC_CSN_ID,
    vp.PROV_NAME as Visit_Provider,
    pcp.PROV_NAME as PCP_on_Visit,
    pe.REFERRAL_SOURCE_ID_REFERRING_PROV_NAM as Referring_Provider
FROM PAT_ENC pe
LEFT JOIN CLARITY_SER vp ON pe.VISIT_PROV_ID = vp.PROV_ID
LEFT JOIN CLARITY_SER pcp ON pe.PCP_PROV_ID = pcp.PROV_ID
WHERE pe.PAT_ID = 'Z7004242' AND pe.APPT_STATUS_C_NAME = 'Completed'
LIMIT 5;
</example-query>

- **Visit Provider**: The provider who saw the patient.
- **PCP**: The patient's primary care provider at the time of the visit.
- **Referring Provider**: The provider who sent the patient for the visit.

### Building an Encounter Timeline

To understand a patient's care journey, you can construct a chronological timeline of their visits.

<example-query description="Create a patient's encounter timeline">
WITH encounter_timeline AS (
    SELECT 
        pe.PAT_ENC_CSN_ID,
        pe.CONTACT_DATE,
        pe.PAT_ENC_DATE_REAL,
        pe.APPT_STATUS_C_NAME,
        cd.DEPARTMENT_NAME,
        cs.PROV_NAME as Visit_Provider,
        -- Calculate days since last encounter
        ROUND(pe.PAT_ENC_DATE_REAL - LAG(pe.PAT_ENC_DATE_REAL) OVER (
            PARTITION BY pe.PAT_ID 
            ORDER BY pe.PAT_ENC_DATE_REAL
        ), 0) as days_since_last_visit
    FROM PAT_ENC pe
    LEFT JOIN CLARITY_DEP cd ON pe.DEPARTMENT_ID = cd.DEPARTMENT_ID
    LEFT JOIN CLARITY_SER cs ON pe.VISIT_PROV_ID = cs.PROV_ID
    WHERE pe.PAT_ID = 'Z7004242'
)
SELECT * FROM encounter_timeline
ORDER BY PAT_ENC_DATE_REAL
LIMIT 10;
</example-query>

---

### Key Takeaways

- **PAT_ENC** is the master encounter table, with **PAT_ENC_CSN_ID** as the unique identifier for every interaction.
- **PAT_ENC_DATE_REAL** uses decimal sequencing to ensure unique and reliable chronological ordering.
- Encounters span all care settings, from outpatient appointments to inpatient hospital stays and ED visits.
- **CLARITY_ADT** provides a granular audit trail of patient movement during an admission.
- Multiple provider roles (Visit, PCP, Referring) are tracked for each encounter.
- Encounter types can be inferred from department names and admission type fields since this extract lacks a dedicated encounter type column.

---
