# Exploring Medication Orders

*Purpose: Learn how Epic tracks medication orders from prescription through administration, including dosing, pharmacy routing, and safety checks.*

### The Medication Journey

Medications in Epic flow from provider orders to pharmacy dispensing to patient administration. Let's trace this journey.

### Basic Medication Orders

Start by viewing a patient's medications:

<example-query description="View current medication orders">
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

### Medication Details

Now let's see the clinical details:

<example-query description="Get medication dosing instructions">
SELECT 
    om.DESCRIPTION as Medication,
    cm.GENERIC_NAME,
    om.DOSAGE,
    om.FREQUENCY_NAME,
    om.DISP_QUANTITY || ' ' || om.DISP_QUANTITY_UNIT as Dispensed
FROM ORDER_MED om
LEFT JOIN CLARITY_MEDICATION cm ON om.MEDICATION_ID = cm.MEDICATION_ID
WHERE om.PAT_ID = 'Z7004242'
  AND om.ORDER_STATUS_C_NAME = 'Sent'
ORDER BY om.ORDERING_DATE DESC
LIMIT 10;
</example-query>

### Prescription Routing

See how prescriptions get to pharmacies:

<example-query description="View pharmacy and prescriber information">
SELECT 
    om.DESCRIPTION as Medication,
    om.PROV_ID_PROV_NAME as Prescriber,
    om.PHARMACY_ID_PHARMACY_NAME as Pharmacy,
    om.TRANSMIT_METHOD_C_NAME as Send_Method
FROM ORDER_MED om
WHERE om.PAT_ID = 'Z7004242'
  AND om.PHARMACY_ID IS NOT NULL
ORDER BY om.ORDERING_DATE DESC
LIMIT 5;
</example-query>

### Medication Instructions

Patient instructions are critical for safety:

<example-query description="Get patient sig instructions">
SELECT 
    om.DESCRIPTION as Medication,
    oms.SIG_TEXT as Instructions
FROM ORDER_MED om
JOIN ORDER_MED_SIG oms ON om.ORDER_MED_ID = oms.ORDER_ID
WHERE om.PAT_ID = 'Z7004242'
ORDER BY om.ORDERING_DATE DESC
LIMIT 10;
</example-query>

### Medication History

Finally, see medication changes over time:

<example-query description="Track medication status changes">
SELECT 
    DESCRIPTION as Medication,
    ORDER_STATUS_C_NAME as Current_Status,
    SUBSTR(ORDERING_DATE, 1, 10) as Started,
    SUBSTR(END_DATE, 1, 10) as Ended,
    CASE 
        WHEN END_DATE IS NOT NULL THEN 'Discontinued'
        WHEN ORDER_STATUS_C_NAME = 'Sent' THEN 'Active'
        ELSE ORDER_STATUS_C_NAME
    END as Status
FROM ORDER_MED
WHERE PAT_ID = 'Z7004242'
ORDER BY ORDERING_DATE DESC;
</example-query>

### Key Tables Summary

**Core Tables:**
- `ORDER_MED` - Main medication order table
- `CLARITY_MEDICATION` - Medication master with generic/brand info
- `ORDER_MED_SIG` - Patient instructions (sig text)
- `RX_PHR_DISP` - Pharmacy dispensing records

**Key Fields:**
- `ORDER_MED_ID` - Unique medication order identifier
- `ORDER_STATUS_C_NAME` - Current status (Sent, Discontinued, etc.)
- `MEDICATION_ID` - Links to medication master
- `PHARMACY_ID` - Where prescription was sent

### Common Pitfalls

1. **Multiple Sigs**: One medication can have multiple instruction records
2. **Status Values**: "Sent" usually means active, not "Active"
3. **Date Formats**: Dates are strings, use SUBSTR for display
4. **Pharmacy Links**: Not all meds have pharmacy (samples, inpatient)

### Summary

Epic's medication system provides:
- Complete medication lifecycle tracking
- Pharmacy integration for e-prescribing
- Detailed dosing and sig information
- Safety through allergy and interaction checking

Understanding medication tables is essential for:
- Medication reconciliation
- Adherence monitoring
- Pharmacy operations
- Clinical decision support