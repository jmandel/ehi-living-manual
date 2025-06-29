# Tracking Patient Safety: Allergies and Immunizations

*Purpose: Learn how Epic tracks critical safety information including allergies, adverse reactions, and immunization history to prevent harmful events and ensure comprehensive care.*

### Two Pillars of Patient Safety

Epic's patient safety tracking focuses on:
1. **Allergies & Reactions** - What the patient can't tolerate
2. **Immunizations** - What protections they have

Let's explore both systems.

### Understanding Allergies

Start by viewing a patient's allergy list:

<example-query description="View a patient's active allergies">
SELECT 
    a.ALLERGEN_ID_ALLERGEN_NAME,
    a.REACTION as Reaction,
    a.SEVERITY_C_NAME as Severity,
    SUBSTR(a.DATE_NOTED, 1, 10) as Date_Noted
FROM PAT_ALLERGIES pa
JOIN ALLERGY a ON pa.ALLERGY_RECORD_ID = a.ALLERGY_ID
WHERE pa.PAT_ID = 'Z7004242'
  AND a.ALRGY_STATUS_C_NAME = 'Active'
ORDER BY a.SEVERITY_C_NAME, a.ALLERGEN_ID_ALLERGEN_NAME;
</example-query>

### Allergy Details

For each allergy, we can see specific reactions:

<example-query description="See detailed reactions for allergies">
SELECT 
    a.ALLERGEN_ID_ALLERGEN_NAME,
    ar.REACTION_C_NAME as Specific_Reaction
FROM PAT_ALLERGIES pa
JOIN ALLERGY a ON pa.ALLERGY_RECORD_ID = a.ALLERGY_ID
JOIN ALLERGY_REACTIONS ar ON a.ALLERGY_ID = ar.ALLERGY_ID
WHERE pa.PAT_ID = 'Z7004242'
ORDER BY a.ALLERGEN_ID_ALLERGEN_NAME, ar.LINE;
</example-query>

### Immunization Records

Now let's check the patient's immunization history:

<example-query description="View immunization history">
SELECT 
    imm.IMMUNIZATION_ID_NAME as Vaccine,
    SUBSTR(pi.IMMUNE_DATE, 1, 10) as Date_Given,
    pi.DOSE_NUMBER,
    pi.DOSE_AMOUNT || ' ' || pi.DOSE_UNIT_C_NAME as Dose
FROM PAT_IMMUNIZATIONS pi
JOIN CLARITY_IMMUNZATN imm ON pi.IMMUNIZATION_ID = imm.IMMUNIZATION_ID
WHERE pi.PAT_ID = 'Z7004242'
ORDER BY pi.IMMUNE_DATE DESC;
</example-query>

### Safety Alerts at Point of Care

See how allergies create clinical alerts:

<example-query description="Check for penicillin allergies before prescribing">
SELECT 
    a.ALLERGEN_ID_ALLERGEN_NAME,
    a.SEVERITY_C_NAME as Severity,
    'DO NOT PRESCRIBE: ' || a.ALLERGEN_ID_ALLERGEN_NAME as Alert_Message
FROM PAT_ALLERGIES pa
JOIN ALLERGY a ON pa.ALLERGY_RECORD_ID = a.ALLERGY_ID
WHERE pa.PAT_ID = 'Z7004242'
  AND a.ALRGY_STATUS_C_NAME = 'Active'
  AND UPPER(a.ALLERGEN_ID_ALLERGEN_NAME) LIKE '%PENICILLIN%';
</example-query>

### Immunization Due Dates

Finally, check what vaccines might be due:

<example-query description="Simple immunization gap check">
SELECT 
    imm.IMMUNIZATION_ID_NAME as Vaccine,
    MAX(SUBSTR(pi.IMMUNE_DATE, 1, 10)) as Last_Given,
    CASE 
        WHEN imm.IMMUNIZATION_ID_NAME LIKE '%Influenza%' THEN 'Annual'
        WHEN imm.IMMUNIZATION_ID_NAME LIKE '%Tetanus%' THEN 'Every 10 years'
        ELSE 'Check guidelines'
    END as Frequency
FROM PAT_IMMUNIZATIONS pi
JOIN CLARITY_IMMUNZATN imm ON pi.IMMUNIZATION_ID = imm.IMMUNIZATION_ID
WHERE pi.PAT_ID = 'Z7004242'
GROUP BY imm.IMMUNIZATION_ID_NAME
ORDER BY MAX(pi.IMMUNE_DATE) DESC;
</example-query>

### Key Tables Summary

**Allergy Tables:**
- `ALLERGY` - Master allergy records with severity and status
- `PAT_ALLERGIES` - Links patients to their allergies
- `ALLERGY_REACTIONS` - Specific reactions for each allergy

**Immunization Tables:**
- `PAT_IMMUNIZATIONS` - Patient's immunization records
- `CLARITY_IMMUNZATN` - Master immunization definitions

### Critical Safety Points

1. **Always Check Status**: Only active allergies should trigger alerts
2. **Severity Matters**: Life-threatening allergies need special handling
3. **Reaction Types**: Different reactions require different precautions
4. **Historical Records**: Keep deleted allergies for audit purposes

### Common Use Cases

- **Medication Safety**: Check allergies before prescribing
- **Procedure Planning**: Identify latex or contrast allergies
- **Emergency Care**: Quick access to critical allergy info
- **Population Health**: Track immunization rates
- **School Records**: Generate required immunization reports

### Summary

Epic's allergy and immunization tracking provides essential safety nets:
- Prevents medication errors through allergy checking
- Ensures complete immunization documentation
- Supports both individual care and population health
- Maintains comprehensive audit trails for safety events

Understanding these systems is crucial for patient safety and quality care delivery.