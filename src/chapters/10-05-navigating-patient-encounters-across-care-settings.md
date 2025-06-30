# Navigating Patient Encounters Across Care Settings

*Purpose: Learn how Epic tracks patient encounters from outpatient visits to hospital stays, including the universal CSN identifier system.*

### The Universal Encounter Identifier

Every patient interaction in Epic gets a Contact Serial Number (CSN). This CSN_ID connects all data from that encounter - diagnoses, orders, notes, and charges.

### Basic Encounter Information

Start by viewing a patient's encounters:

<example-query description="View recent patient encounters">
SELECT 
    PAT_ENC_CSN_ID as CSN,
    SUBSTR(CONTACT_DATE, 1, 10) as Visit_Date,
    DEPARTMENT_ID_DEPARTMENT_NAME as Department,
    VISIT_PROV_ID_PROV_NAME as Provider,
    APPT_STATUS_C_NAME as Status
FROM PAT_ENC
WHERE PAT_ID = 'Z7004242'
ORDER BY CONTACT_DATE DESC
LIMIT 10;
</example-query>

### Encounter Types and Settings

See what types of encounters occur:

<example-query description="Analyze encounter types">
SELECT 
    ENC_TYPE_C_NAME as Encounter_Type,
    COUNT(*) as Count,
    MIN(SUBSTR(CONTACT_DATE, 1, 10)) as First_Visit,
    MAX(SUBSTR(CONTACT_DATE, 1, 10)) as Last_Visit
FROM PAT_ENC
WHERE PAT_ID = 'Z7004242'
GROUP BY ENC_TYPE_C_NAME
ORDER BY Count DESC;
</example-query>

### Hospital Admissions

Find inpatient stays:

<example-query description="View hospital admissions">
SELECT 
    PAT_ENC_CSN_ID as CSN,
    SUBSTR(HOSP_ADMSN_TIME, 1, 10) as Admission_Date,
    SUBSTR(HOSP_DISCH_TIME, 1, 10) as Discharge_Date,
    HOSP_ADMSN_TYPE_C_NAME as Admission_Type,
    DISCH_DISP_C_NAME as Discharge_Disposition
FROM PAT_ENC
WHERE PAT_ID = 'Z7004242'
  AND HOSP_ADMSN_TIME IS NOT NULL
ORDER BY HOSP_ADMSN_TIME DESC;
</example-query>

### Appointment Details

See scheduled appointment information:

<example-query description="View appointment scheduling details">
SELECT 
    SUBSTR(CONTACT_DATE, 1, 10) as Appointment_Date,
    APPT_TIME,
    APPT_STATUS_C_NAME as Status,
    APPT_LENGTH as Duration_Minutes,
    CHECKIN_TIME,
    CHECKOUT_TIME
FROM PAT_ENC
WHERE PAT_ID = 'Z7004242'
  AND APPT_STATUS_C_NAME IN ('Completed', 'Arrived', 'Scheduled')
ORDER BY CONTACT_DATE DESC
LIMIT 10;
</example-query>

### Emergency Department Visits

Track ED encounters:

<example-query description="Find emergency department visits">
SELECT 
    PAT_ENC_CSN_ID as CSN,
    SUBSTR(CONTACT_DATE, 1, 10) as ED_Date,
    DEPARTMENT_ID_DEPARTMENT_NAME as Department,
    LOS_MINUTES as Length_of_Stay_Minutes,
    CASE 
        WHEN HOSP_ADMSN_TIME IS NOT NULL THEN 'Admitted'
        ELSE 'Discharged'
    END as Outcome
FROM PAT_ENC
WHERE PAT_ID = 'Z7004242'
  AND (DEPARTMENT_ID_DEPARTMENT_NAME LIKE '%EMERGENCY%' 
       OR DEPARTMENT_ID_DEPARTMENT_NAME LIKE '%ED%')
ORDER BY CONTACT_DATE DESC;
</example-query>

### Key Tables Summary

**Core Tables:**
- `PAT_ENC` - Main encounter table
- `PAT_ENC_2/3/4` - Overflow tables for additional fields
- `PAT_ENC_HSP` - Hospital-specific encounter data
- `PAT_ENC_DX` - Encounter diagnoses

**Key Fields:**
- `PAT_ENC_CSN_ID` - Universal encounter identifier
- `CONTACT_DATE` - When encounter occurred
- `DEPARTMENT_ID` - Where it happened
- `VISIT_PROV_ID` - Primary provider

### Common Pitfalls

1. **Multiple CSNs**: One visit might have multiple CSNs (professional/hospital)
2. **Date Formats**: All dates are strings, use SUBSTR for display
3. **Overflow Tables**: Additional data in PAT_ENC_2, PAT_ENC_3, etc.
4. **Status Values**: Many different appointment statuses exist

### Summary

Epic's encounter system provides:
- Universal CSN tracking across all venues
- Detailed appointment and scheduling data
- Hospital admission and discharge tracking
- Emergency department visit information

Understanding encounters is essential for:
- Patient flow analysis
- Utilization reporting
- Care coordination
- Revenue cycle management