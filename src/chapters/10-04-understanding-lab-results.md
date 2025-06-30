# Understanding Lab Results

*Purpose: Learn how Epic tracks laboratory tests from order through result, including components, reference ranges, and abnormal flags.*

### Lab Results in Epic

Lab results in Epic involve three main tables:
1. **ORDER_PROC** - The lab order itself
2. **ORDER_RESULTS** - Individual test results  
3. **CLARITY_COMPONENT** - What was measured

Let's explore how they work together.

### Viewing Lab Orders

Start by finding a patient's lab orders:

<example-query description="View recent lab orders">
SELECT 
    ORDER_PROC_ID,
    DESCRIPTION as Test_Name,
    SUBSTR(ORDERING_DATE, 1, 10) as Order_Date,
    ORDER_STATUS_C_NAME as Status
FROM ORDER_PROC
WHERE PAT_ID = 'Z7004242'
  AND ORDER_TYPE_C_NAME = 'Lab'
ORDER BY ORDERING_DATE DESC
LIMIT 10;
</example-query>

### Getting Lab Results

Now let's see the actual results:

<example-query description="View lab results with values">
SELECT 
    op.DESCRIPTION as Test,
    cc.NAME as Component,
    ore.ORD_VALUE as Result,
    ore.REFERENCE_UNIT as Unit,
    ore.REFERENCE_LOW || '-' || ore.REFERENCE_HIGH as Normal_Range
FROM ORDER_PROC op
JOIN ORDER_RESULTS ore ON op.ORDER_PROC_ID = ore.ORDER_PROC_ID
JOIN CLARITY_COMPONENT cc ON ore.COMPONENT_ID = cc.COMPONENT_ID
WHERE op.PAT_ID = 'Z7004242'
  AND op.ORDER_TYPE_C_NAME = 'Lab'
  AND ore.ORD_VALUE IS NOT NULL
ORDER BY op.ORDERING_DATE DESC
LIMIT 20;
</example-query>

### Finding Abnormal Results

Identify results outside normal ranges:

<example-query description="Find abnormal lab results">
SELECT 
    SUBSTR(op.ORDERING_DATE, 1, 10) as Order_Date,
    cc.NAME as Test,
    ore.ORD_VALUE || ' ' || ore.REFERENCE_UNIT as Result,
    ore.RESULT_FLAG_C_NAME as Flag
FROM ORDER_PROC op
JOIN ORDER_RESULTS ore ON op.ORDER_PROC_ID = ore.ORDER_PROC_ID
JOIN CLARITY_COMPONENT cc ON ore.COMPONENT_ID = cc.COMPONENT_ID
WHERE op.PAT_ID = 'Z7004242'
  AND ore.RESULT_FLAG_C_NAME IN ('High', 'Low', 'Abnormal')
ORDER BY op.ORDERING_DATE DESC
LIMIT 10;
</example-query>

### Lab Panels

See how panels break into components:

<example-query description="View components of a lab panel">
SELECT 
    op.DESCRIPTION as Panel,
    cc.NAME as Component,
    ore.ORD_VALUE || ' ' || ore.REFERENCE_UNIT as Result,
    ore.LINE as Display_Order
FROM ORDER_PROC op
JOIN ORDER_RESULTS ore ON op.ORDER_PROC_ID = ore.ORDER_PROC_ID
JOIN CLARITY_COMPONENT cc ON ore.COMPONENT_ID = cc.COMPONENT_ID
WHERE op.DESCRIPTION LIKE '%METABOLIC%'
  AND op.PAT_ID = 'Z7004242'
ORDER BY op.ORDERING_DATE DESC, ore.LINE
LIMIT 20;
</example-query>

### Trending Lab Values

Track how values change over time:

<example-query description="Trend glucose values over time">
SELECT 
    SUBSTR(op.ORDERING_DATE, 1, 10) as Test_Date,
    ore.ORD_VALUE as Glucose_Value,
    ore.REFERENCE_LOW || '-' || ore.REFERENCE_HIGH as Normal_Range,
    ore.RESULT_FLAG_C_NAME as Flag
FROM ORDER_PROC op
JOIN ORDER_RESULTS ore ON op.ORDER_PROC_ID = ore.ORDER_PROC_ID
JOIN CLARITY_COMPONENT cc ON ore.COMPONENT_ID = cc.COMPONENT_ID
WHERE op.PAT_ID = 'Z7004242'
  AND cc.NAME = 'GLUCOSE'
ORDER BY op.ORDERING_DATE DESC;
</example-query>

### Key Tables Summary

**Core Tables:**
- `ORDER_PROC` - Lab orders and procedures
- `ORDER_RESULTS` - Individual result values
- `CLARITY_COMPONENT` - Component definitions
- `LNC_DB_MAIN` - LOINC codes for standardization

**Key Fields:**
- `ORDER_PROC_ID` - Unique order identifier
- `COMPONENT_ID` - What was measured
- `ORD_VALUE` - The actual result
- `RESULT_FLAG_C_NAME` - High/Low/Normal indicators

### Common Pitfalls

1. **Multiple Results**: One order can have many result components
2. **String Values**: ORD_VALUE is text, may need conversion for math
3. **Missing Units**: Not all results have units defined
4. **Panel Complexity**: CBC might have 10+ component results

### Summary

Epic's lab system provides:
- Comprehensive result tracking with components
- Automatic flagging of abnormal values
- Reference range management
- Support for complex panels

Understanding lab tables is essential for:
- Clinical decision support
- Quality measure reporting
- Population health analytics
- Research data extraction