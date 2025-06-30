# The Patient Safety Triad: Medications, Allergies, and Immunizations

*Purpose: To master Epic's approach to three safety-critical datasets that work together to prevent adverse events: what medications a patient is on, what they are allergic to, and what protections they have from immunizations.*

### The Foundation of Patient Safety

These three clinical domains form the foundation of preventive care and clinical decision support. Medications must be checked against allergies to prevent adverse reactions, and immunizations are tracked to prevent disease. Together, they create a safety net for every patient.

<example-query description="Overview of safety-critical data volumes">
SELECT 
    'Medication Orders' as data_type, COUNT(*) as records FROM ORDER_MED
UNION ALL
SELECT 'Allergies', COUNT(*) FROM PAT_ALLERGIES
UNION ALL
SELECT 'Immunizations', COUNT(*) FROM PAT_IMMUNIZATIONS
ORDER BY records DESC;
</example-query>

### 1. Medications: The Prescription Trail

Medication management starts with an order in `ORDER_MED` and follows a complex lifecycle from prescription to pharmacy and potentially to discontinuation.

<example-query description="View current medication orders with status">
SELECT 
    ORDER_MED_ID,
    DESCRIPTION as Medication,
    ORDER_STATUS_C_NAME as Status,
    SUBSTR(ORDERING_DATE, 1, 10) as Order_Date,
    QUANTITY,
    REFILLS
FROM ORDER_MED
WHERE PAT_ID = 'Z7004242'
  AND ORDER_STATUS_C_NAME IN ('Sent', 'Active')
ORDER BY ORDERING_DATE DESC
LIMIT 10;
</example-query>

The patient's instructions, or "sig," are stored in a separate table.

<example-query description="Get patient sig instructions for a medication">
SELECT 
    om.DESCRIPTION as Medication,
    oms.SIG_TEXT as Instructions
FROM ORDER_MED om
JOIN ORDER_MED_SIG oms ON om.ORDER_MED_ID = oms.ORDER_ID
WHERE om.PAT_ID = 'Z7004242'
ORDER BY om.ORDERING_DATE DESC
LIMIT 5;
</example-query>

**The Missing MAR:** A critical point is the absence of Medication Administration Records (MAR) in this EHI export. We can see what was *ordered*, but we cannot verify what was *administered*.

### 2. Allergies: The Safety Net

Epic's allergy model is robust, tracking not just allergens but also specific reactions and their severity.

<example-query description="View a patient's active allergies and their severity">
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

For each allergy, multiple specific reactions can be documented.

<example-query description="See detailed reactions for a specific allergy">
SELECT 
    a.ALLERGEN_ID_ALLERGEN_NAME,
    ar.REACTION_C_NAME as Specific_Reaction
FROM PAT_ALLERGIES pa
JOIN ALLERGY a ON pa.ALLERGY_RECORD_ID = a.ALLERGY_ID
JOIN ALLERGY_REACTIONS ar ON a.ALLERGY_ID = ar.ALLERGY_ID
WHERE pa.PAT_ID = 'Z7004242' AND UPPER(a.ALLERGEN_ID_ALLERGEN_NAME) LIKE '%PENICILLIN%'
ORDER BY a.ALLERGEN_ID_ALLERGEN_NAME, ar.LINE;
</example-query>

### 3. Immunizations: Proactive Protection

Immunization records track a patient's vaccination history, including the vaccine, date, dose, and source.

<example-query description="View a patient's immunization history">
SELECT 
    i.IMMUNZATN_ID_NAME as Vaccine,
    SUBSTR(i.IMMUNE_DATE, 1, 10) as Date_Given,
    i.DOSE,
    i.ROUTE_C_NAME as Route
FROM PAT_IMMUNIZATIONS pi
JOIN IMMUNE i ON pi.IMMUNE_ID = i.IMMUNE_ID
WHERE pi.PAT_ID = 'Z7004242'
ORDER BY i.IMMUNE_DATE DESC;
</example-query>

Epic distinguishes between vaccines administered at the facility (`Given`) and those reported by the patient or another provider (`Historical`).

<example-query description="View complete vaccine administration details including lot number">
SELECT 
    IMMUNZATN_ID_NAME as vaccine,
    IMMUNE_DATE,
    MFG_C_NAME as manufacturer,
    LOT as lot_number,
    EXP_DATE as expiration
FROM IMMUNE
WHERE LOT IS NOT NULL
ORDER BY IMMUNE_DATE DESC
LIMIT 5;
</example-query>

Lot number tracking is crucial for safety recalls.

---

### Key Takeaways

- **The Safety Triad**: Medications (`ORDER_MED`), Allergies (`PAT_ALLERGIES`, `ALLERGY`), and Immunizations (`PAT_IMMUNIZATIONS`, `IMMUNE`) work together to ensure patient safety.
- **Medication Lifecycle**: `ORDER_MED` tracks prescriptions, but this EHI export lacks Medication Administration Records (MAR) to confirm if they were taken.
- **Allergy Details**: The allergy model captures not just the allergen but also specific reactions and severity, providing crucial detail for clinical decisions.
- **Immunization Source**: The `IMMNZTN_STATUS_C_NAME` field is vital for distinguishing between vaccines given on-site and historical records.
- **Critical Missing Data**: Key safety features like MAR, drug-drug interaction checks, and standardized CVX vaccine codes are not present in this EHI export.

---
