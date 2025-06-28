---
# Chapter 2.5: Medications, Allergies, and Immunizations

*Purpose: To master Epic's approach to three safety-critical datasets—medications, allergies, and immunizations—that together prevent adverse events and ensure patient safety.*

### The Safety Triad

These three clinical domains share a common purpose: preventing harm. Medications must be checked against allergies. Immunizations prevent disease. Together, they form the foundation of preventive care and clinical decision support.

<example-query description="Overview of safety-critical data volumes">
SELECT 
    'Medication Orders' as data_type, COUNT(*) as records FROM ORDER_MED
UNION ALL
SELECT 'Allergies', COUNT(*) FROM PAT_ALLERGIES
UNION ALL
SELECT 'Immunizations', COUNT(*) FROM PAT_IMMUNIZATIONS
ORDER BY records DESC;
</example-query>

### Medication Orders: Beyond the Prescription

We explored ORDER_MED in the previous chapter, but medications have unique lifecycle considerations:

<example-query description="Analyze medication lifecycle with discontinuation">
SELECT 
    om.ORDER_MED_ID,
    cm.GENERIC_NAME_,
    om.ORDERING_DATE,
    om.ORDER_END_TIME,
    om.DISCON_TIME,
    -- Calculate if discontinued early
    CASE 
        WHEN om.DISCON_TIME IS NOT NULL 
         AND om.DISCON_TIME < om.ORDER_END_TIME
        THEN 'Discontinued Early'
        WHEN om.DISCON_TIME IS NOT NULL
        THEN 'Completed as Ordered'
        ELSE 'Active/Unknown'
    END as medication_status
FROM ORDER_MED om
JOIN CLARITY_MEDICATION cm ON om.MEDICATION_ID = cm.MEDICATION_ID
ORDER BY om.ORDERING_DATE;
</example-query>

Key lifecycle fields:
- **ORDER_END_TIME**: Planned end date
- **DISCON_TIME**: Actual discontinuation
- Early discontinuation may indicate adverse effects or ineffectiveness

### The Missing MAR

As noted previously, this extract lacks Medication Administration Records:

<example-query description="Search for administration data">
-- Check for any MAR-related tables
SELECT name 
FROM sqlite_master 
WHERE type = 'table' 
  AND (name LIKE '%MAR%' OR name LIKE '%ADMIN%')
  AND name LIKE '%MED%';
</example-query>

Without MAR data, we cannot verify:
- If medications were actually given
- Doses administered vs. prescribed
- Administration times and compliance

### Allergies: The Safety Net

Epic's allergy model uses multiple related tables:

<example-query description="Explore the allergy data model">
-- Patient-to-allergy linking
SELECT 
    pa.PAT_ID,
    pa.LINE,
    pa.ALLERGY_RECORD_ID_,
    a.ALLERGEN_ID_ALLERGEN_NAME,
    a.SEVERITY_C_NAME,
    a.ALRGY_STATUS_C_NAME
FROM PAT_ALLERGIES pa
JOIN ALLERGY a ON a.ALLERGY_ID = pa.ALLERGY_RECORD_ID_
WHERE pa.PAT_ID = 'Z7004242'
ORDER BY pa.LINE;
</example-query>

The two-table structure:
- **PAT_ALLERGIES**: Links patients to allergies using (PAT_ID, LINE)
- **ALLERGY**: Contains allergy details and severity

### Allergy Reactions

Allergies can have multiple documented reactions:

<example-query description="View allergy reactions detail">
SELECT 
    a.ALLERGEN_ID_ALLERGEN_NAME as allergen,
    a.SEVERITY_C_NAME as severity,
    ar.LINE,
    ar.REACTION_C_NAME_
FROM ALLERGY a
JOIN ALLERGY_REACTIONS ar ON a.ALLERGY_ID = ar.ALLERGY_ID
WHERE a.ALLERGY_ID IN (
    SELECT ALLERGY_RECORD_ID_ 
    FROM PAT_ALLERGIES 
    WHERE PAT_ID = 'Z7004242'
)
ORDER BY a.ALLERGY_ID, ar.LINE;
</example-query>

Multiple reactions per allergy support comprehensive documentation of patient responses.

### Allergy Status and Updates

Allergies aren't static—they can be confirmed, refuted, or deleted:

<example-query description="Analyze allergy statuses">
SELECT 
    ALRGY_STATUS_C_NAME,
    COUNT(*) as count,
    GROUP_CONCAT(ALLERGEN_ID_ALLERGEN_NAME, ', ') as examples
FROM ALLERGY
GROUP BY ALRGY_STATUS_C_NAME;
</example-query>

### Finding "No Known Allergies"

Distinguishing between "no data" and "no allergies" is critical:

<example-query description="Search for NKA documentation">
-- Look for No Known Allergies entries and show actual allergens
SELECT 
    ALLERGEN_ID_ALLERGEN_NAME,
    ALRGY_STATUS_C_NAME,
    COUNT(*) as patient_count,
    CASE 
        WHEN UPPER(ALLERGEN_ID_ALLERGEN_NAME) LIKE '%NO%KNOWN%' 
          OR UPPER(ALLERGEN_ID_ALLERGEN_NAME) LIKE '%NKA%' 
        THEN 'NKA Entry'
        ELSE 'Specific Allergen'
    END as entry_type
FROM ALLERGY
GROUP BY ALLERGEN_ID_ALLERGEN_NAME, ALRGY_STATUS_C_NAME
ORDER BY patient_count DESC;
</example-query>

Without explicit NKA entries, absence of allergy records is ambiguous.

### Immunization History

The immunization model follows Epic's familiar patterns:

<example-query description="Explore immunization records">
SELECT 
    pi.PAT_ID,
    pi.LINE,
    i.IMMUNZATN_ID_NAME,
    i.IMMUNE_DATE,
    i.DOSE,
    i.ROUTE_C_NAME,
    i.IMMNZTN_STATUS_C_NAME
FROM PAT_IMMUNIZATIONS pi
JOIN IMMUNE i ON pi.IMMUNE_ID_ = i.IMMUNE_ID
WHERE pi.PAT_ID = 'Z7004242'
ORDER BY i.IMMUNE_DATE DESC;
</example-query>

Key immunization fields:
- **IMMUNZATN_ID_NAME**: Vaccine name
- **DOSE**: Dose number in series
- **ROUTE_C_NAME**: Administration route
- **IMMNZTN_STATUS_C_NAME**: Given vs. historical

### Immunization Status Types

Not all immunizations were given at your facility:

<example-query description="Analyze immunization sources">
SELECT 
    i.IMMNZTN_STATUS_C_NAME,
    COUNT(*) as count,
    GROUP_CONCAT(DISTINCT i.IMMUNZATN_ID_NAME) as vaccines
FROM IMMUNE i
GROUP BY i.IMMNZTN_STATUS_C_NAME;
</example-query>

Status types typically include:
- **Given**: Administered at this facility
- **Historical**: Patient-reported or transferred records
- **Refused**: Documented refusal

### Vaccine Details

Immunization tracking includes lot numbers for safety:

<example-query description="View complete vaccine administration details">
SELECT 
    IMMUNZATN_ID_NAME as vaccine,
    IMMUNE_DATE,
    MFG_C_NAME as manufacturer,
    LOT as lot_number,
    EXP_DATE as expiration,
    DOSE,
    ROUTE_C_NAME as route,
    SITE_C_NAME as site
FROM IMMUNE
WHERE LOT IS NOT NULL
ORDER BY IMMUNE_DATE DESC
LIMIT 5;
</example-query>

Lot tracking enables rapid response to vaccine recalls or adverse event patterns.

### Cross-Domain Safety Checks

The real power comes from combining these domains:

<example-query description="Check for potential medication-allergy conflicts">
-- Find patients with medication orders who have allergies
-- (In production, you'd check for specific drug-allergy interactions)
WITH patient_allergies AS (
    SELECT DISTINCT 
        pa.PAT_ID,
        COUNT(DISTINCT a.ALLERGEN_ID) as allergy_count
    FROM PAT_ALLERGIES pa
    JOIN ALLERGY a ON pa.ALLERGY_RECORD_ID_ = a.ALLERGY_ID
    WHERE a.ALRGY_STATUS_C_NAME = 'Active'
    GROUP BY pa.PAT_ID
),
patient_meds AS (
    SELECT DISTINCT
        om.PAT_ID,
        COUNT(DISTINCT om.MEDICATION_ID) as med_count
    FROM ORDER_MED om
    WHERE om.ORDER_STATUS_C_NAME = 'Sent'
    GROUP BY om.PAT_ID
)
SELECT 
    pm.PAT_ID,
    pm.med_count as active_medications,
    COALESCE(pa.allergy_count, 0) as active_allergies
FROM patient_meds pm
LEFT JOIN patient_allergies pa ON pm.PAT_ID = pa.PAT_ID;
</example-query>

### Immunization Completeness

Track vaccine series completion:

<example-query description="Analyze vaccine series completion">
WITH vaccine_doses AS (
    SELECT 
        IMMUNZATN_ID_NAME,
        MAX(CAST(DOSE AS INTEGER)) as max_dose,
        COUNT(*) as total_records
    FROM IMMUNE
    WHERE CAST(DOSE AS TEXT) GLOB '[0-9]*'  -- Only numeric doses
    GROUP BY IMMUNZATN_ID_NAME
)
SELECT 
    IMMUNZATN_ID_NAME as vaccine,
    max_dose as highest_dose_given,
    total_records,
    CASE 
        WHEN max_dose >= 2 THEN 'Multi-dose series'
        ELSE 'Single dose'
    END as series_type
FROM vaccine_doses
ORDER BY max_dose DESC;
</example-query>

### Temporal Analysis

Track medication and allergy timelines:

<example-query description="Create a patient safety timeline">
-- Combine medications and allergy updates in chronological order
SELECT 
    'Medication Started' as event_type,
    ORDERING_DATE as event_date,
    GENERIC_NAME_ as description
FROM ORDER_MED om
JOIN CLARITY_MEDICATION cm ON om.MEDICATION_ID = cm.MEDICATION_ID
WHERE om.PAT_ID = 'Z7004242'

UNION ALL

SELECT 
    'Allergy Noted' as event_type,
    a.DATE_NOTED as event_date,
    a.ALLERGEN_ID_ALLERGEN_NAME as description
FROM ALLERGY a
JOIN PAT_ALLERGIES pa ON a.ALLERGY_ID = pa.ALLERGY_RECORD_ID_
WHERE pa.PAT_ID = 'Z7004242'

ORDER BY event_date DESC;
</example-query>

### Missing Safety Features

This extract lacks several safety-critical elements:

1. **Drug-Allergy Interaction Checking**: No cross-reference tables
2. **Medication Administration**: No MAR for verification
3. **Adverse Event Reporting**: No reaction documentation beyond allergies
4. **Vaccine Information Statements**: No VIS tracking
5. **CVX Codes**: No standard vaccine codes for interoperability

### Best Practices for Safety Queries

Always consider the completeness of safety data:

<example-query description="Create a comprehensive patient safety summary">
WITH safety_summary AS (
    SELECT 
        p.PAT_ID,
        p.PAT_NAME,
        -- Count active medications
        (SELECT COUNT(*) FROM ORDER_MED om 
         WHERE om.PAT_ID = p.PAT_ID 
           AND om.ORDER_STATUS_C_NAME = 'Sent'
           AND om.DISCON_TIME IS NULL) as active_meds,
        -- Count active allergies
        (SELECT COUNT(DISTINCT pa.ALLERGY_RECORD_ID_) 
         FROM PAT_ALLERGIES pa
         JOIN ALLERGY a ON pa.ALLERGY_RECORD_ID_ = a.ALLERGY_ID
         WHERE pa.PAT_ID = p.PAT_ID
           AND a.ALRGY_STATUS_C_NAME = 'Active') as active_allergies,
        -- Count immunizations
        (SELECT COUNT(*) FROM PAT_IMMUNIZATIONS pi
         WHERE pi.PAT_ID = p.PAT_ID) as total_immunizations
    FROM PATIENT p
)
SELECT * FROM safety_summary;
</example-query>

---

### Key Takeaways

- **ORDER_MED** tracks prescriptions but lacks administration data (no MAR table)
- **Allergies** use a two-table model: PAT_ALLERGIES links patients to ALLERGY details
- **ALLERGY_REACTIONS** allows multiple reactions per allergy using the LINE pattern
- **Immunizations** also use two tables: PAT_IMMUNIZATIONS links to IMMUNE records
- **IMMNZTN_STATUS_C_NAME** distinguishes given vs. historical immunizations
- Lot tracking in IMMUNE enables vaccine safety monitoring
- Cross-domain queries are essential for medication-allergy checking
- Critical safety features missing: MAR, drug interactions, CVX codes
- Always distinguish "no data" from "no allergies" (NKA)

---