# Orchestrating Clinical Care Through Orders

*Purpose: Learn how Epic manages the full spectrum of clinical orders beyond medications and labs, including procedures, imaging, referrals, and nursing orders.*

### The Order Ecosystem

Epic uses two main systems for orders:
1. **ORDER_MED** - Medication orders
2. **ORDER_PROC** - Everything else (labs, imaging, procedures, referrals)

Let's explore the non-medication order world.

### Viewing All Order Types

Start by seeing what types of orders exist:

<example-query description="View order types for a patient">
SELECT 
    ORDER_TYPE_C_NAME as Order_Type,
    COUNT(*) as Count
FROM ORDER_PROC
WHERE PAT_ID = 'Z7004242'
GROUP BY ORDER_TYPE_C_NAME
ORDER BY Count DESC;
</example-query>

### Imaging Orders

Track radiology and imaging orders:

<example-query description="View imaging orders">
SELECT 
    ORDER_PROC_ID,
    DESCRIPTION as Study,
    SUBSTR(ORDERING_DATE, 1, 10) as Order_Date,
    ORDER_STATUS_C_NAME as Status,
    PRIORITY_C_NAME as Priority
FROM ORDER_PROC
WHERE PAT_ID = 'Z7004242'
  AND ORDER_TYPE_C_NAME = 'Imaging'
ORDER BY ORDERING_DATE DESC
LIMIT 10;
</example-query>

### Referrals and Consults

See specialty referrals:

<example-query description="Track referrals to specialists">
SELECT 
    DESCRIPTION as Referral_To,
    SUBSTR(ORDERING_DATE, 1, 10) as Referred_Date,
    ORDER_STATUS_C_NAME as Status,
    REFERRING_PROV_ID_PROV_NAME as Referred_By
FROM ORDER_PROC
WHERE PAT_ID = 'Z7004242'
  AND ORDER_TYPE_C_NAME = 'Referral'
ORDER BY ORDERING_DATE DESC;
</example-query>

### Procedure Orders

View ordered procedures:

<example-query description="Find procedure orders">
SELECT 
    DESCRIPTION as Procedure,
    SUBSTR(ORDERING_DATE, 1, 10) as Order_Date,
    ORDER_STATUS_C_NAME as Status,
    PROC_CODE as CPT_Code
FROM ORDER_PROC
WHERE PAT_ID = 'Z7004242'
  AND ORDER_TYPE_C_NAME = 'Procedures'
ORDER BY ORDERING_DATE DESC;
</example-query>

### Order Timing and Instructions

See detailed order instructions:

<example-query description="View order timing and special instructions">
SELECT 
    DESCRIPTION as Order_Item,
    ORDER_TIME as When_Ordered,
    START_DATE_TIME as When_To_Start,
    CLINICAL_INFO as Special_Instructions
FROM ORDER_PROC
WHERE PAT_ID = 'Z7004242'
  AND CLINICAL_INFO IS NOT NULL
ORDER BY ORDERING_DATE DESC
LIMIT 5;
</example-query>

### Key Tables Summary

**Core Tables:**
- `ORDER_PROC` - Non-medication orders
- `ORDER_MED` - Medication orders
- `ORDER_PROC_2/3` - Additional order details
- `ORDER_DX_PROC` - Diagnoses supporting orders

**Key Fields:**
- `ORDER_PROC_ID` - Unique order identifier
- `ORDER_TYPE_C_NAME` - Type of order
- `ORDER_STATUS_C_NAME` - Current status
- `PRIORITY_C_NAME` - Stat, routine, etc.

### Common Order Types

- **Lab** - Laboratory tests
- **Imaging** - X-rays, CT, MRI
- **Procedures** - Surgical and diagnostic procedures
- **Referral** - Specialty consults
- **Nursing** - Nursing-specific orders

### Common Pitfalls

1. **Status Complexity**: Many possible order statuses
2. **Missing Results**: Not all orders have results in ORDER_RESULTS
3. **Code Systems**: PROC_CODE might be CPT, internal, or other
4. **Date Fields**: Multiple dates (ordered, scheduled, completed)

### Summary

Epic's order management system:
- Handles all non-medication clinical orders
- Tracks complete order lifecycle
- Supports complex clinical workflows
- Integrates with departmental systems

Understanding orders enables:
- Clinical workflow analysis
- Utilization management
- Order set optimization
- Quality improvement initiatives