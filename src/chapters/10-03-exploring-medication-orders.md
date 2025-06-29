# Exploring Epic's Medication Orders: From Prescription to Pharmacy

*Learn how Epic tracks the complete medication lifecycle through interconnected tables, from the moment a provider orders a medication to when it reaches the pharmacy.*

## The Medication Puzzle

Imagine tracking every prescription for millions of patients - not just what was ordered, but who prescribed it, which pharmacy received it, what instructions were given, and how coverage was determined. Epic's medication domain accomplishes this through an intricate web of 48+ tables. Today, we'll explore how these pieces fit together by following a real patient's medication journey.

Our sample database contains 4 medication orders for patient Z7004242. Let's trace these prescriptions through the system to understand Epic's medication architecture.

## Starting Simple: Finding a Patient's Medications

Let's begin by discovering what medications our patient is taking:

<example-query description="View all medication orders for a patient">
SELECT 
    ORDER_MED_ID,
    DESCRIPTION,
    ORDER_STATUS_C_NAME,
    ORDERING_DATE
FROM ORDER_MED
WHERE PAT_ID = 'Z7004242'
ORDER BY ORDERING_DATE DESC;
</example-query>

This reveals our patient has been prescribed Nortriptyline (an antidepressant) three times and Lisinopril (for blood pressure) once. All orders show a status of "Sent", meaning they were successfully transmitted to pharmacies.

## Understanding the Core: ORDER_MED Structure

The ORDER_MED table is massive - 116 columns capturing every aspect of a prescription. Let's examine its key components:

<example-query description="Explore key ORDER_MED fields for a single prescription">
SELECT 
    ORDER_MED_ID,
    DESCRIPTION,
    MEDICATION_ID,
    DOSAGE,
    QUANTITY,
    REFILLS,
    START_DATE,
    MED_PRESC_PROV_ID,
    PHARMACY_ID,
    ORDER_STATUS_C_NAME
FROM ORDER_MED
WHERE ORDER_MED_ID = 772179261.0;
</example-query>

Notice the MEDICATION_ID field - this links to Epic's medication formulary. The table uses Epic's standard patterns:
- Denormalized fields like PHARMACY_ID_PHARMACY_NAME
- Multiple provider IDs for different roles
- Category fields ending in _C_NAME

## Following the Prescription: The Sig Text

Every prescription needs instructions for the patient. Epic stores these separately in ORDER_MED_SIG:

<example-query description="Get prescription instructions (sig) for medications">
SELECT 
    om.DESCRIPTION,
    oms.SIG_TEXT
FROM ORDER_MED om
JOIN ORDER_MED_SIG oms ON om.ORDER_MED_ID = oms.ORDER_ID
WHERE om.PAT_ID = 'Z7004242'
ORDER BY om.ORDERING_DATE DESC;
</example-query>

The sig text is exactly what appears on the prescription label. Notice how the Nortriptyline instructions include titration guidance - "Start with 10 mg at night; can increase to 20 mg after 1-2 weeks if no side effects."

## The Medication Master: Understanding Drug References

Each medication order links to Epic's formulary through CLARITY_MEDICATION:

<example-query description="Join orders with the medication master to see generic names">
SELECT 
    om.ORDER_MED_ID,
    om.DESCRIPTION as ORDER_DESCRIPTION,
    cm.GENERIC_NAME,
    om.DOSAGE,
    om.QUANTITY
FROM ORDER_MED om
LEFT JOIN CLARITY_MEDICATION cm ON om.MEDICATION_ID = cm.MEDICATION_ID
WHERE om.PAT_ID = 'Z7004242';
</example-query>

The CLARITY_MEDICATION table provides the standardized generic name, while ORDER_MED.DESCRIPTION contains the ordering name. This separation allows for formulary management while preserving the exact order text.

## Pharmacy Routing: Where Prescriptions Go

Epic tracks detailed pharmacy information for each prescription:

<example-query description="See which pharmacies received each prescription">
SELECT 
    om.DESCRIPTION,
    om.PHARMACY_ID_PHARMACY_NAME,
    rxp.PHARMACY_NAME as VERIFIED_PHARMACY_NAME
FROM ORDER_MED om
LEFT JOIN RX_PHR rxp ON om.PHARMACY_ID = rxp.PHARMACY_ID
WHERE om.PAT_ID = 'Z7004242'
ORDER BY om.ORDERING_DATE;
</example-query>

Our patient uses three different pharmacies - CVS, Walgreens, and Costco. The denormalized PHARMACY_ID_PHARMACY_NAME field provides quick access to pharmacy info without joining, while RX_PHR contains the authoritative pharmacy data.

## Patient Preferences: Preferred Pharmacies

Patients can designate preferred pharmacies for easier prescription routing:

<example-query description="Check patient's preferred pharmacy settings">
SELECT 
    pp.LINE,
    pp.PREF_PHARMACY_ID_PHARMACY_NAME,
    rxp.PHARMACY_NAME
FROM PAT_PREF_PHARMACY pp
LEFT JOIN RX_PHR rxp ON pp.PREF_PHARMACY_ID = rxp.PHARMACY_ID
WHERE pp.PAT_ID = 'Z7004242';
</example-query>

This patient prefers Costco, though they've used other pharmacies for different prescriptions - a common pattern when insurance or availability drives pharmacy selection.

## Tracking Medication History

Epic maintains a complete medication history through PAT_MEDS_HX:

<example-query description="View complete medication history with timeline">
SELECT 
    pmh.LINE as HISTORY_ORDER,
    om.DESCRIPTION,
    om.ORDERING_DATE,
    om.ORDER_STATUS_C_NAME,
    CASE 
        WHEN om.DISCON_TIME IS NOT NULL THEN 'Discontinued'
        WHEN om.ORDER_STATUS_C_NAME = 'Sent' THEN 'Active'
        ELSE om.ORDER_STATUS_C_NAME
    END as CURRENT_STATUS
FROM PAT_MEDS_HX pmh
JOIN ORDER_MED om ON pmh.MEDS_HX_ID = om.ORDER_MED_ID
WHERE pmh.PAT_ID = 'Z7004242'
ORDER BY pmh.LINE;
</example-query>

The LINE field preserves the chronological order of prescriptions, essential for medication reconciliation and clinical decision-making.

## Beyond the Basics: Overflow Tables

Epic uses numbered overflow tables to store additional prescription details:

<example-query description="Access extended prescription information from ORDER_MED_2">
SELECT 
    om.DESCRIPTION,
    om2.RX_NUM_FORMATTED,
    om2.RX_WRITTEN_DATE,
    om2.TXT_AUTHPROV_NAME,
    om2.TXT_AUTHPROV_DEA
FROM ORDER_MED om
LEFT JOIN ORDER_MED_2 om2 ON om.ORDER_MED_ID = om2.ORDER_ID
WHERE om.PAT_ID = 'Z7004242'
  AND om2.TXT_AUTHPROV_NAME IS NOT NULL;
</example-query>

ORDER_MED_2 through ORDER_MED_7 contain fields like DEA numbers, prior authorization details, and clinical decision support overrides - information that doesn't fit in the primary table's 116 columns.

## Clinical Instructions: Beyond Patient Sig

Providers can add separate administration instructions through ORD_MED_ADMININSTR:

<example-query description="Find detailed administration instructions">
SELECT 
    om.DESCRIPTION,
    omai.LINE,
    omai.MED_ADMIN_INSTR
FROM ORDER_MED om
JOIN ORD_MED_ADMININSTR omai ON om.ORDER_MED_ID = omai.ORDER_MED_ID
WHERE om.PAT_ID = 'Z7004242'
  AND omai.MED_ADMIN_INSTR IS NOT NULL
ORDER BY om.ORDER_MED_ID, omai.LINE;
</example-query>

These instructions guide clinical staff and may include titration schedules, monitoring requirements, or special handling notes not appropriate for patient labels.

## Coverage and Formulary: The Financial Side

Epic tracks insurance coverage and formulary information through MED_CVG_INFO:

<example-query description="Check medication coverage details">
SELECT 
    om.DESCRIPTION,
    mci.CNCT_TYPE_C_NAME as Connection_Type,
    mci.EPRESCRIBING_NET_ID_EXTERNAL_NAME as Network,
    mci.CVG_PAYER_IDNT as Payer_ID
FROM ORDER_MED om
JOIN MED_CVG_INFO mci ON om.PAT_ID = mci.PAT_ID
WHERE mci.PAT_ID = 'Z7004242'
LIMIT 10;
</example-query>

This reveals real-time benefit checks and prior authorization requirements, helping providers and patients understand medication costs before prescriptions reach the pharmacy.

## Putting It All Together: A Complete Medication View

Let's combine everything we've learned into a comprehensive medication query:

<example-query description="Build a complete medication profile">
SELECT 
    om.ORDER_MED_ID,
    om.DESCRIPTION as MEDICATION,
    cm.GENERIC_NAME,
    om.ORDER_STATUS_C_NAME as STATUS,
    om.ORDERING_DATE,
    oms.SIG_TEXT as INSTRUCTIONS,
    om.QUANTITY || ' ' || om.REFILLS as QTY_REFILLS,
    om.PHARMACY_ID_PHARMACY_NAME as PHARMACY,
    CASE 
        WHEN mci.ORDER_ID IS NOT NULL THEN 'Coverage Checked'
        ELSE 'No Coverage Info'
    END as COVERAGE_STATUS
FROM ORDER_MED om
LEFT JOIN CLARITY_MEDICATION cm ON om.MEDICATION_ID = cm.MEDICATION_ID
LEFT JOIN ORDER_MED_SIG oms ON om.ORDER_MED_ID = oms.ORDER_ID
LEFT JOIN MED_CVG_INFO mci ON om.PAT_ID = mci.PAT_ID AND om.ORDER_MED_ID = mci.ORDER_ID
WHERE om.PAT_ID = 'Z7004242'
ORDER BY om.ORDERING_DATE DESC;
</example-query>

This unified view demonstrates how Epic's distributed table design comes together to support clinical workflows.

## Best Practices for Medication Queries

**1. Always Use LEFT JOINs**
Not every medication order will have entries in all related tables. Using LEFT JOINs prevents missing data:

<example-query description="Safely join multiple medication tables">
SELECT 
    om.ORDER_MED_ID,
    om.DESCRIPTION,
    COALESCE(oms.SIG_TEXT, 'No sig recorded') as INSTRUCTIONS,
    COALESCE(rxp.PHARMACY_NAME, om.PHARMACY_ID_PHARMACY_NAME, 'No pharmacy') as PHARMACY
FROM ORDER_MED om
LEFT JOIN ORDER_MED_SIG oms ON om.ORDER_MED_ID = oms.ORDER_ID
LEFT JOIN RX_PHR rxp ON om.PHARMACY_ID = rxp.PHARMACY_ID
WHERE om.PAT_ID = 'Z7004242';
</example-query>

**2. Leverage Denormalized Fields**
When you don't need full joins, use Epic's denormalized fields for better performance:

<example-query description="Use denormalized fields for simple queries">
SELECT 
    ORDER_MED_ID,
    DESCRIPTION,
    PHARMACY_ID_PHARMACY_NAME,
    ORD_CREATR_USER_ID_NAME
FROM ORDER_MED
WHERE PAT_ID = 'Z7004242'
  AND ORDER_STATUS_C_NAME = 'Sent';
</example-query>

**3. Understand Status Workflows**
Medication orders move through various statuses. Filter appropriately for your use case:

<example-query description="Analyze medication status distribution">
SELECT 
    ORDER_STATUS_C_NAME,
    COUNT(*) as COUNT
FROM ORDER_MED
WHERE PAT_ID = 'Z7004242'
GROUP BY ORDER_STATUS_C_NAME;
</example-query>

## Key Takeaways

1. **ORDER_MED is the Center** - With 116 columns, it contains core prescription data but relies on many related tables for complete information

2. **Overflow Tables Matter** - ORDER_MED_2 through ORDER_MED_7 contain critical additional fields that don't fit in the primary table

3. **Separate Instructions** - Patient sig (ORDER_MED_SIG) and clinical instructions (ORD_MED_ADMININSTR) serve different purposes

4. **Pharmacy Flexibility** - Epic tracks both preferred pharmacies and actual routing, supporting complex pharmacy networks

5. **Coverage Integration** - Real-time benefit checking through MED_CVG_INFO enables cost transparency

Understanding these relationships allows you to navigate Epic's medication data effectively, whether you're analyzing prescribing patterns, tracking medication adherence, or investigating pharmacy utilization. The complexity reflects real-world medication management - every prescription touches multiple systems, providers, and checkpoints before reaching the patient.