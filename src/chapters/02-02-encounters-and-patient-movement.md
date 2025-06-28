---
# Chapter 2.2: Encounters and Patient Movement

*Purpose: To dissect the encounter—the central organizing event in healthcare—and understand how Epic tracks every patient interaction and movement through the system.*

### The Spine of Clinical Data

Every diagnosis, order, and clinical note connects to an encounter. It's the fundamental organizing principle of the medical record, representing each discrete interaction between patient and healthcare system. Epic's encounter model captures everything from a five-minute telehealth check-in to a month-long hospital stay.

<example-query description="Explore the encounter master table">
SELECT 
    PAT_ENC_CSN_ID,
    PAT_ID,
    CONTACT_DATE,
    APPT_STATUS_C_NAME,
    DEPARTMENT_ID,
    VISIT_PROV_ID
FROM PAT_ENC
LIMIT 5;
</example-query>

Each row represents a unique patient interaction, identified by the Contact Serial Number (CSN).

### Understanding the CSN

The **PAT_ENC_CSN_ID** (Contact Serial Number) is Epic's unique identifier for every patient interaction:

<example-query description="Verify CSN uniqueness and understand its role">
SELECT 
    COUNT(*) as total_encounters,
    COUNT(DISTINCT PAT_ENC_CSN_ID) as unique_csns,
    -- CSN is the primary key
    CASE 
        WHEN COUNT(*) = COUNT(DISTINCT PAT_ENC_CSN_ID) 
        THEN 'CSNs are unique (primary key)' 
        ELSE 'CSNs are not unique' 
    END as verification
FROM PAT_ENC;
</example-query>

The CSN serves as the universal foreign key linking all encounter-related data:

<example-query description="See how CSN connects across the database">
SELECT 
    table_name,
    COUNT(*) as tables_using_csn
FROM _metadata
WHERE column_name = 'PAT_ENC_CSN_ID'
  AND table_name != 'PAT_ENC'
GROUP BY table_name
ORDER BY table_name
LIMIT 10
</example-query>

### The Magic of PAT_ENC_DATE_REAL

When multiple encounters occur on the same day, how do you maintain chronological order? Epic's elegant solution uses decimal sequencing:

<example-query description="Demonstrate the decimal date pattern">
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

The decimal portion (0.00, 0.01, 0.02...) provides unique sequencing for same-day encounters:

<example-query description="Prove decimal dates guarantee chronological ordering">
WITH date_analysis AS (
    SELECT 
        CONTACT_DATE,
        COUNT(*) as encounters_on_date,
        MIN(PAT_ENC_DATE_REAL) as first_encounter,
        MAX(PAT_ENC_DATE_REAL) as last_encounter,
        -- Calculate the decimal range
        ROUND((MAX(PAT_ENC_DATE_REAL) - MIN(PAT_ENC_DATE_REAL)) * 100, 0) + 1 as sequential_encounters
    FROM PAT_ENC
    GROUP BY CONTACT_DATE
    HAVING COUNT(*) > 1
)
SELECT * FROM date_analysis
ORDER BY encounters_on_date DESC
LIMIT 5;
</example-query>

### Appointment Status Lifecycle

The APPT_STATUS_C_NAME field tracks the encounter workflow:

<example-query description="Analyze appointment status distribution">
SELECT 
    APPT_STATUS_C_NAME,
    COUNT(*) as count,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM PAT_ENC), 1) as percentage
FROM PAT_ENC
GROUP BY APPT_STATUS_C_NAME
ORDER BY count DESC;
</example-query>

Note that many encounters (84.7%) have NULL status—these are typically hospital encounters that don't follow the appointment workflow.

### Provider Roles in Encounters

Epic tracks multiple provider relationships per encounter:

<example-query description="Understand the different provider roles">
SELECT 
    -- Count populated provider fields
    COUNT(VISIT_PROV_ID) as has_visit_provider,
    COUNT(PCP_PROV_ID) as has_pcp,
    -- REFERRING_PROV_ID not in this table
    -- UPDATE_PROV_ID not in this table
    -- Check if visit provider differs from PCP
    SUM(CASE WHEN VISIT_PROV_ID != PCP_PROV_ID THEN 1 ELSE 0 END) as different_visit_pcp
FROM PAT_ENC;
</example-query>

Each provider field serves a specific purpose:
- **VISIT_PROV_ID**: The provider actually seen during the encounter
- **PCP_PROV_ID**: The patient's primary care provider (for context)
- **REFERRING_PROV_ID**: Who referred the patient (crucial for consultations)
- **UPDATE_PROV_ID**: Department's default provider (rarely used)

### Hospital Admissions

For inpatient encounters, Epic tracks admission and discharge timestamps:

<example-query description="Examine hospital admission patterns">
SELECT 
    PAT_ENC_CSN_ID,
    HOSP_ADMSN_TIME,
    HOSP_DISCHRG_TIME,
    -- Calculate length of stay when both times exist
    CASE 
        WHEN HOSP_ADMSN_TIME IS NOT NULL AND HOSP_DISCHRG_TIME IS NOT NULL
        THEN ROUND(julianday(HOSP_DISCHRG_TIME) - julianday(HOSP_ADMSN_TIME), 2)
        ELSE NULL
    END as los_days
FROM PAT_ENC
WHERE HOSP_ADMSN_TIME IS NOT NULL
ORDER BY HOSP_ADMSN_TIME
LIMIT 5;
</example-query>

### The ADT Event Trail

The **CLARITY_ADT** table provides a detailed audit trail of patient movement:

<example-query description="Explore ADT (Admission, Discharge, Transfer) events">
SELECT 
    a.EVENT_ID,
    a.PAT_ENC_CSN_ID,
    a.EVENT_TYPE_C_NAME,
    a.EFFECTIVE_TIME,
    -- Link back to encounter
    p.CONTACT_DATE
FROM CLARITY_ADT a
JOIN PAT_ENC p ON a.PAT_ENC_CSN_ID = p.PAT_ENC_CSN_ID
ORDER BY a.EFFECTIVE_TIME;
</example-query>

Each encounter can have multiple ADT events tracking the patient journey:

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

### Financial Class Tracking

Every encounter includes financial classification for billing:

<example-query description="Analyze financial classes across encounters">
SELECT 
    FIN_CLASS_C_NAME,
    COUNT(*) as encounters,
    -- Show common appointment statuses for each financial class
    GROUP_CONCAT(DISTINCT APPT_STATUS_C_NAME) as appointment_statuses
FROM PAT_ENC
WHERE FIN_CLASS_C_NAME IS NOT NULL
GROUP BY FIN_CLASS_C_NAME
ORDER BY encounters DESC;
</example-query>

### Department and Location

Encounters are anchored to specific departments:

<example-query description="Find the busiest departments">
SELECT 
    DEPARTMENT_ID,
    COUNT(*) as encounter_count,
    COUNT(DISTINCT PAT_ID) as unique_patients
FROM PAT_ENC
WHERE DEPARTMENT_ID IS NOT NULL
GROUP BY DEPARTMENT_ID
ORDER BY encounter_count DESC
LIMIT 10;
</example-query>

### Encounter Closure

The encounter lifecycle includes a formal closure process:

<example-query description="Analyze encounter closure patterns">
SELECT 
    ENC_CLOSED_YN,
    COUNT(*) as count,
    -- For closed encounters, check closure timing
    AVG(CASE 
        WHEN ENC_CLOSED_YN = 'Y' AND ENC_CLOSE_DATE IS NOT NULL
        THEN julianday(ENC_CLOSE_DATE) - julianday(CONTACT_DATE)
        ELSE NULL
    END) as avg_days_to_close
FROM PAT_ENC
GROUP BY ENC_CLOSED_YN;
</example-query>

### Length of Stay Calculations

For hospital encounters, length of stay (LOS) is a critical metric:

<example-query description="Calculate length of stay using different methods">
-- Check hospital encounter data availability
SELECT 
    COUNT(*) as total_encounters,
    COUNT(HOSP_ADMSN_TIME) as has_admission_time,
    COUNT(HOSP_DISCHRG_TIME) as has_discharge_time,
    COUNT(CASE WHEN HOSP_ADMSN_TIME != '' AND HOSP_DISCHRG_TIME != '' THEN 1 END) as has_valid_times,
    -- Note about data quality
    'Note: Sample data may have empty timestamp fields' as data_note
FROM PAT_ENC;
</example-query>

### Missing Elements in This Extract

Several encounter elements typical in full Epic systems are absent:

<example-query description="Check for missing encounter type classification">
-- In full Epic, ENC_TYPE_C_NAME would classify encounters
SELECT 
    'ENC_TYPE_C_NAME' as missing_column,
    'Would classify encounters (Office Visit, Hospital, ED, etc.)' as purpose,
    COUNT(*) as columns_in_pat_enc
FROM _metadata
WHERE table_name = 'PAT_ENC';
</example-query>

Without encounter type classification, we can't easily distinguish:
- Office visits from hospital encounters
- Emergency visits from scheduled appointments
- Telehealth from in-person visits

### Building Encounter Timelines

To understand a patient's care journey, construct chronological timelines:

<example-query description="Create a patient's encounter timeline">
WITH encounter_timeline AS (
    SELECT 
        PAT_ENC_CSN_ID,
        CONTACT_DATE,
        PAT_ENC_DATE_REAL,
        APPT_STATUS_C_NAME,
        DEPARTMENT_ID,
        VISIT_PROV_ID,
        -- Calculate days since last encounter
        ROUND(PAT_ENC_DATE_REAL - LAG(PAT_ENC_DATE_REAL) OVER (
            PARTITION BY PAT_ID 
            ORDER BY PAT_ENC_DATE_REAL
        ), 0) as days_since_last_visit
    FROM PAT_ENC
    WHERE PAT_ID = 'Z7004242'
)
SELECT * FROM encounter_timeline
ORDER BY PAT_ENC_DATE_REAL
LIMIT 10;
</example-query>

### Encounter Relationships

Some encounters are related to others (follow-ups, readmissions):

<example-query description="Find potential readmissions within 30 days">
WITH readmission_check AS (
    SELECT 
        e1.PAT_ENC_CSN_ID as original_encounter,
        e1.CONTACT_DATE as original_date,
        e2.PAT_ENC_CSN_ID as potential_readmit,
        e2.CONTACT_DATE as readmit_date,
        ROUND(e2.PAT_ENC_DATE_REAL - e1.PAT_ENC_DATE_REAL, 0) as days_between
    FROM PAT_ENC e1
    JOIN PAT_ENC e2 ON e1.PAT_ID = e2.PAT_ID
    WHERE e1.HOSP_DISCHRG_TIME IS NOT NULL
      AND e2.HOSP_ADMSN_TIME IS NOT NULL
      AND e2.PAT_ENC_DATE_REAL > e1.PAT_ENC_DATE_REAL
      AND e2.PAT_ENC_DATE_REAL - e1.PAT_ENC_DATE_REAL <= 30
)
SELECT * FROM readmission_check
ORDER BY days_between
LIMIT 5;
</example-query>

---

### Key Takeaways

- **PAT_ENC** is the master encounter table, with PAT_ENC_CSN_ID as the unique identifier
- **PAT_ENC_DATE_REAL** uses decimal sequencing to ensure unique chronological ordering
- Multiple provider roles are tracked: visit provider, PCP, referring provider
- **CLARITY_ADT** provides detailed patient movement tracking with timestamped events
- Hospital admissions use HOSP_ADMSN_TIME and HOSP_DISCHRG_TIME for length of stay
- Appointment status (APPT_STATUS_C_NAME) tracks scheduled encounter workflows
- Financial class (FIN_CLASS_C_NAME) links clinical encounters to billing processes
- This extract lacks encounter type classification, limiting encounter categorization

---