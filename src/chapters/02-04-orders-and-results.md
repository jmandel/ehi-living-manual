# Orders and Results: The Engine of Clinical Care

*Purpose: To trace the complete data trail of all non-medication clinical orders—from provider request through fulfillment and results—covering labs, imaging, procedures, and referrals.*

### The Order Ecosystem: Beyond Medications

While medication orders are handled by `ORDER_MED`, nearly every other clinical action is initiated through the **`ORDER_PROC`** table. This powerful table orchestrates a vast range of clinical activities.

<example-query description="View the different types of non-medication orders">
SELECT 
    ORDER_TYPE_C_NAME as Order_Type,
    COUNT(*) as Count
FROM ORDER_PROC
WHERE PAT_ID = 'Z7004242'
GROUP BY ORDER_TYPE_C_NAME
ORDER BY Count DESC;
</example-query>

This single table manages labs, imaging studies, referrals, procedures, and more, each with its own specific workflow and data model.

### Deep Dive: Lab Orders and Results

Laboratory testing is one of the most common workflows. It begins with an order in `ORDER_PROC` and is fulfilled with results in `ORDER_RESULTS`.

<example-query description="Examine a lab order and its status">
SELECT 
    ORDER_PROC_ID,
    DESCRIPTION as Test_Name,
    SUBSTR(ORDERING_DATE, 1, 10) as Order_Date,
    ORDER_STATUS_C_NAME as Status,
    ABNORMAL_YN as Has_Abnormal_Results
FROM ORDER_PROC
WHERE PAT_ID = 'Z7004242'
  AND ORDER_TYPE_C_NAME = 'Lab'
ORDER BY ORDERING_DATE DESC
LIMIT 5;
</example-query>

Once the lab is completed, the results are stored in `ORDER_RESULTS`. A single lab order (like a metabolic panel) can generate many result components.

<example-query description="Examine a complete metabolic panel with all its result components">
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

Key aspects of lab results:
- **`ORD_VALUE`**: The result, stored as text to accommodate values like "Positive" or "Not Detected".
- **`ORD_NUM_VALUE`**: A numeric version for calculations.
- **`RESULT_FLAG_C_NAME`**: Flags results as 'High', 'Low', 'Abnormal', etc.
- **`ABNORMAL_YN`**: A summary flag on the main `ORDER_PROC` record indicating if *any* component was abnormal.

### Imaging Orders

Imaging studies like X-rays and MRIs are also managed as procedures.

<example-query description="View imaging orders and their status">
SELECT 
    ORDER_PROC_ID,
    DESCRIPTION as Study,
    SUBSTR(ORDERING_DATE, 1, 10) as Order_Date,
    ORDER_STATUS_C_NAME as Status,
    ORDER_PRIORITY_C_NAME as Priority
FROM ORDER_PROC
WHERE PAT_ID = 'Z7004242'
  AND ORDER_TYPE_C_NAME = 'Imaging'
ORDER BY ORDERING_DATE DESC
LIMIT 10;
</example-query>

### Referrals and Consults

Orders are also used to manage referrals to specialists.

<example-query description="Track referrals to specialists">
SELECT 
    DESCRIPTION as Referral_To,
    SUBSTR(ORDERING_DATE, 1, 10) as Referred_Date,
    ORDER_STATUS_C_NAME as Status,
    REFERRING_PROV_ID_REFERRING_PROV_NAM as Referred_By
FROM ORDER_PROC
WHERE PAT_ID = 'Z7004242'
  AND ORDER_TYPE_C_NAME = 'Outpatient Referral'
ORDER BY ORDERING_DATE DESC;
</example-query>

### The Order Lifecycle: Status and Timing

All orders progress through a series of statuses, from creation to completion.

<example-query description="Analyze order status distribution">
SELECT 
    ORDER_STATUS_C_NAME,
    COUNT(*) as orders,
    SUM(CASE WHEN ORDER_PROC_ID IN (SELECT DISTINCT ORDER_PROC_ID FROM ORDER_RESULTS) 
             THEN 1 ELSE 0 END) as has_results
FROM ORDER_PROC
GROUP BY ORDER_STATUS_C_NAME
ORDER BY orders DESC;
</example-query>

### Linking Orders to Encounters

Orders are always linked to the encounter where they were placed, providing critical context. An order record is linked to its encounter via the `PAT_ENC_CSN_ID` column.

---

### Key Takeaways

- **`ORDER_PROC`** is the central table for all non-medication orders, identified by `ORDER_PROC_ID`.
- **Order Types**: The `ORDER_TYPE_C_NAME` field differentiates labs, imaging, referrals, and other procedures.
- **Lab Results**: Lab results are stored in **`ORDER_RESULTS`**, with one row per component, linked back to `ORDER_PROC`.
- **Abnormality Flags**: Epic uses a two-tier system: `RESULT_FLAG_C_NAME` at the component level and `ABNORMAL_YN` as an order-level summary.
- **Result Values**: Results are stored as text (`ORD_VALUE`) for flexibility and as numbers (`ORD_NUM_VALUE`) for computation.
- **Context is Key**: Orders are always linked to an encounter (`PAT_ENC_CSN_ID`).

---
