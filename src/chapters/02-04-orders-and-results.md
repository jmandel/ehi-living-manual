---
# Orders and Results

*Purpose: To trace the complete data trail of clinical orders—from provider request through laboratory processing to final results.*

### The Two Order Streams

Epic separates orders into two distinct workflows, each with its own master table:

<example-query description="Compare the two order types">
SELECT 
    'Procedures (Labs, Imaging)' as order_type, 
    COUNT(*) as total_orders
FROM ORDER_PROC

UNION ALL

SELECT 
    'Medications', 
    COUNT(*)
FROM ORDER_MED

ORDER BY total_orders DESC;
</example-query>

Each type follows different workflows, documentation requirements, and result patterns.

### Procedural Orders: The Investigation Trail

The **ORDER_PROC** table captures all non-medication orders:

<example-query description="Explore the procedural order structure">
SELECT 
    ORDER_PROC_ID,
    PAT_ID,
    PAT_ENC_CSN_ID,
    ORDERING_DATE,
    DESCRIPTION,
    ORDER_STATUS_C_NAME,
    ABNORMAL_YN
FROM ORDER_PROC
WHERE ORDER_STATUS_C_NAME = 'Completed'
LIMIT 5;
</example-query>

Key fields include:
- **ORDER_PROC_ID**: Unique order identifier
- **PAT_ENC_CSN_ID**: Links to the encounter
- **ORDER_STATUS_C_NAME**: Tracks order lifecycle
- **ABNORMAL_YN**: Summary flag for any abnormal results

### Order Status Lifecycle

Orders progress through defined statuses:

<example-query description="Analyze order status distribution">
SELECT 
    ORDER_STATUS_C_NAME,
    COUNT(*) as orders,
    -- Check which have results
    SUM(CASE WHEN ORDER_PROC_ID IN (SELECT DISTINCT ORDER_PROC_ID FROM ORDER_RESULTS) 
             THEN 1 ELSE 0 END) as has_results
FROM ORDER_PROC
GROUP BY ORDER_STATUS_C_NAME
ORDER BY orders DESC;
</example-query>

Only completed orders typically have results, though the relationship isn't absolute.

### The Results Table: Multiple Components

Most lab orders produce multiple result components:

<example-query description="Examine a complete metabolic panel with results">
SELECT 
    o.DESCRIPTION as panel_name,
    r.LINE,
    r.COMPONENT_ID_NAME,
    r.ORD_VALUE,
    r.REFERENCE_LOW || '-' || r.REFERENCE_HIGH as reference_range,
    r.REFERENCE_UNIT,
    r.RESULT_FLAG_C_NAME
FROM ORDER_PROC o
JOIN ORDER_RESULTS r ON o.ORDER_PROC_ID = r.ORDER_PROC_ID
WHERE o.ORDER_PROC_ID = 772179262
ORDER BY r.LINE;
</example-query>

Each component has:
- **LINE**: Sequential order within the panel
- **ORD_VALUE**: The result (stored as text)
- **Reference range**: Low and high bounds
- **RESULT_FLAG_C_NAME**: Abnormality indicator

### Understanding Result Storage

Epic stores results in both text and numeric formats:

<example-query description="Compare text vs numeric result storage">
SELECT 
    COMPONENT_ID_NAME,
    ORD_VALUE as text_value,
    ORD_NUM_VALUE as numeric_value,
    -- Check for non-numeric results
    CASE 
        WHEN ORD_NUM_VALUE = 9999999 THEN 'Non-numeric result'
        WHEN ORD_NUM_VALUE IS NULL THEN 'No numeric value'
        ELSE 'Numeric result'
    END as value_type
FROM ORDER_RESULTS
WHERE ORDER_PROC_ID IN (
    SELECT ORDER_PROC_ID 
    FROM ORDER_RESULTS 
    WHERE ORD_VALUE NOT LIKE '%.%' 
      AND ORD_VALUE NOT GLOB '[0-9]*'
    LIMIT 5
);
</example-query>

The dual storage accommodates:
- Numeric results for calculations
- Text results like "Positive" or "See Note"
- Special value 9999999 for non-numeric entries

### Abnormal Result Flagging

Epic uses a two-tier abnormality system:

<example-query description="Understand abnormal result hierarchy">
-- First, check order-level summary
SELECT 
    o.ORDER_PROC_ID,
    o.DESCRIPTION,
    o.ABNORMAL_YN as order_abnormal,
    COUNT(r.LINE) as total_components,
    SUM(CASE WHEN r.RESULT_FLAG_C_NAME != '(NONE)' AND r.RESULT_FLAG_C_NAME IS NOT NULL 
             THEN 1 ELSE 0 END) as abnormal_components
FROM ORDER_PROC o
JOIN ORDER_RESULTS r ON o.ORDER_PROC_ID = r.ORDER_PROC_ID
WHERE o.ABNORMAL_YN = 'Y'
GROUP BY o.ORDER_PROC_ID
LIMIT 5;
</example-query>

The ABNORMAL_YN flag on ORDER_PROC indicates if ANY component is abnormal.

### Medication Orders: The Prescription Trail

The **ORDER_MED** table handles all medication orders:

<example-query description="Explore medication order structure">
SELECT 
    om.ORDER_MED_ID,
    om.PAT_ENC_CSN_ID,
    om.MEDICATION_ID,
    cm.GENERIC_NAME_,
    om.ORDER_STATUS_C_NAME,
    om.ORDERING_MODE_C_NAME
FROM ORDER_MED om
JOIN CLARITY_MEDICATION cm ON om.MEDICATION_ID = cm.MEDICATION_ID
ORDER BY om.ORDERING_DATE DESC;
</example-query>

Key differences from procedural orders:
- Links to CLARITY_MEDICATION formulary
- Different status values
- No direct results (medications don't have lab values)

### The Medication Formulary

**CLARITY_MEDICATION** serves as the drug reference:

<example-query description="Explore the medication formulary">
SELECT 
    MEDICATION_ID,
    GENERIC_NAME_,
    -- Count how many times each medication was ordered
    (SELECT COUNT(*) FROM ORDER_MED om WHERE om.MEDICATION_ID = cm.MEDICATION_ID) as times_ordered
FROM CLARITY_MEDICATION cm
WHERE MEDICATION_ID IN (SELECT DISTINCT MEDICATION_ID FROM ORDER_MED)
ORDER BY times_ordered DESC;
</example-query>

The formulary provides standardized drug information across all orders.

### Linking Orders to Clinical Context

Orders connect to encounters and diagnoses:

<example-query description="Connect orders to their clinical context">
SELECT 
    o.ORDER_PROC_ID,
    o.DESCRIPTION as test_ordered,
    p.CONTACT_DATE,
    p.DEPARTMENT_ID,
    p.VISIT_PROV_ID,
    -- Get primary diagnosis for context
    d.DX_NAME as primary_diagnosis
FROM ORDER_PROC o
JOIN PAT_ENC p ON o.PAT_ENC_CSN_ID = p.PAT_ENC_CSN_ID
LEFT JOIN PAT_ENC_DX dx ON p.PAT_ENC_CSN_ID = dx.PAT_ENC_CSN_ID AND dx.PRIMARY_DX_YN = 'Y'
LEFT JOIN CLARITY_EDG d ON dx.DX_ID = d.DX_ID
WHERE o.ORDER_STATUS_C_NAME = 'Completed'
LIMIT 5;
</example-query>

### Provider Roles in Orders

Multiple providers may be involved in ordering:

<example-query description="Analyze provider patterns in orders">
-- Check ORDER_PROC provider fields
SELECT 
    COUNT(*) as total_orders,
    COUNT(AUTHRZING_PROV_ID) as has_authorizing,
    COUNT(REFERRING_PROV_ID) as has_referring,
    COUNT(BILLING_PROV_ID) as has_billing
FROM ORDER_PROC;
</example-query>

Different provider roles reflect workflow requirements:
- **Authorizing**: Who approved the order
- **Referring**: Who requested the service
- **Billing**: Provider for reimbursement

### Time Analysis: Order to Result

Calculate turnaround times for completed orders:

<example-query description="Analyze order to result turnaround times">
WITH turnaround AS (
    SELECT 
        o.ORDER_PROC_ID,
        o.DESCRIPTION,
        o.ORDERING_DATE,
        MIN(r.RESULT_DATE) as first_result,
        -- Calculate days between order and result
        ROUND(julianday(MIN(r.RESULT_DATE)) - julianday(o.ORDERING_DATE), 1) as days_to_result
    FROM ORDER_PROC o
    JOIN ORDER_RESULTS r ON o.ORDER_PROC_ID = r.ORDER_PROC_ID
    WHERE o.ORDERING_DATE IS NOT NULL 
      AND r.RESULT_DATE IS NOT NULL
    GROUP BY o.ORDER_PROC_ID
)
SELECT 
    CASE 
        WHEN days_to_result < 1 THEN 'Same day'
        WHEN days_to_result < 2 THEN '1 day'
        WHEN days_to_result < 7 THEN '2-6 days'
        ELSE '7+ days'
    END as turnaround_category,
    COUNT(*) as orders
FROM turnaround
GROUP BY turnaround_category
ORDER BY MIN(days_to_result);
</example-query>

### Missing Elements

This EHI extract lacks several order-related features:

**1. Medication Administration Records (MAR)**
<example-query description="Search for MAR tables">
SELECT name 
FROM sqlite_master 
WHERE type = 'table' 
  AND name LIKE '%MAR%';
</example-query>

Without MAR data, you cannot verify if ordered medications were actually administered.

**2. Order Sets and Protocols**
Order sets (standardized groups of orders) aren't visible in this extract.

**3. Detailed Order Status History**
The ORDER_STATUS table exists but contains limited historical tracking.

### Building a Complete Order View

To see the full lifecycle of a lab order with results:

<example-query description="Create a complete order-to-result summary">
WITH order_summary AS (
    SELECT 
        o.ORDER_PROC_ID,
        o.DESCRIPTION,
        o.ORDERING_DATE,
        o.ORDER_STATUS_C_NAME,
        o.ABNORMAL_YN,
        COUNT(r.LINE) as result_count,
        -- Aggregate result summaries
        GROUP_CONCAT(
            r.COMPONENT_ID_NAME || ': ' || r.ORD_VALUE || ' ' || 
            COALESCE(r.REFERENCE_UNIT, '') ||
            CASE WHEN r.RESULT_FLAG_C_NAME != '(NONE)' 
                 THEN ' [' || r.RESULT_FLAG_C_NAME || ']' 
                 ELSE '' 
            END, 
            '; '
        ) as results_summary
    FROM ORDER_PROC o
    LEFT JOIN ORDER_RESULTS r ON o.ORDER_PROC_ID = r.ORDER_PROC_ID
    WHERE o.ORDER_STATUS_C_NAME = 'Completed'
    GROUP BY o.ORDER_PROC_ID
)
SELECT * FROM order_summary
WHERE result_count > 0
LIMIT 3;
</example-query>

### Quality and Safety Checks

Identify potential issues in order data:

<example-query description="Check for orders without results">
-- Completed orders that lack results
SELECT 
    o.ORDER_PROC_ID,
    o.DESCRIPTION,
    o.ORDERING_DATE,
    o.ORDER_STATUS_C_NAME
FROM ORDER_PROC o
LEFT JOIN ORDER_RESULTS r ON o.ORDER_PROC_ID = r.ORDER_PROC_ID
WHERE o.ORDER_STATUS_C_NAME = 'Completed'
  AND r.ORDER_PROC_ID IS NULL;
</example-query>

---

### Key Takeaways

- **ORDER_PROC** handles all non-medication orders (labs, imaging, procedures)
- **ORDER_MED** manages medication prescriptions with different workflows
- **ORDER_RESULTS** stores multi-component results using the (ORDER_PROC_ID, LINE) pattern
- Results are stored in both text (ORD_VALUE) and numeric (ORD_NUM_VALUE) formats
- **ABNORMAL_YN** on orders summarizes component-level abnormalities
- **CLARITY_MEDICATION** provides the formulary reference for all medications
- Missing MAR data means medication administration cannot be verified
- Order status tracking shows lifecycle but lacks detailed history

---