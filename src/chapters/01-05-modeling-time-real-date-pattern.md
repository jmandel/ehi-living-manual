# Modeling Time: The `_REAL` Date Pattern

*Purpose: To understand Epic's ingenious solution for perfect chronological sorting.*

### The Problem with Standard Dates

Imagine you have four patient encounters on the same day. How do you sort them chronologically when they all have the same date? Epic's **`_REAL` pattern** solves this with mathematical elegance.

<example-query description="See why standard dates aren't enough">
-- Multiple encounters on the same day
SELECT 
    PAT_ENC_CSN_ID,
    CONTACT_DATE,
    PAT_ENC_DATE_REAL
FROM pat_enc
WHERE CONTACT_DATE LIKE '8/9/2018%'
ORDER BY PAT_ENC_DATE_REAL;
</example-query>

Notice how all encounters share the same `CONTACT_DATE`, but `PAT_ENC_DATE_REAL` adds decimal precision: 64869.0, 64869.01, 64869.02, 64869.03. This guarantees perfect chronological ordering.

### Decoding the _REAL Format

The `_REAL` format has two parts:
- **Integer part**: Days since December 31, 1840
- **Decimal part**: Sequence number for same-day events

Let's prove the epoch date:

<example-query description="Verify the Epic epoch date">
-- Calculate dates from _REAL values
SELECT 
    PAT_ENC_DATE_REAL,
    DATE('1840-12-31', '+' || CAST(PAT_ENC_DATE_REAL AS INT) || ' days') as calculated_date,
    SUBSTR(CONTACT_DATE, 1, 10) as actual_date,
    CASE 
        WHEN DATE('1840-12-31', '+' || CAST(PAT_ENC_DATE_REAL AS INT) || ' days') 
             = DATE(SUBSTR(CONTACT_DATE, 7, 4) || '-' || 
                    PRINTF('%02d', CAST(SUBSTR(CONTACT_DATE, 1, INSTR(CONTACT_DATE, '/') - 1) AS INT)) || '-' ||
                    PRINTF('%02d', CAST(SUBSTR(CONTACT_DATE, INSTR(CONTACT_DATE, '/') + 1, 2) AS INT)))
        THEN '✓ Match!'
        ELSE '✗ Mismatch'
    END as verification
FROM pat_enc
WHERE PAT_ENC_DATE_REAL IS NOT NULL
LIMIT 5;
</example-query>

Why December 31, 1840? This predates modern computing by over a century—it's a MUMPS convention from the 1960s that Epic inherited and maintains for backward compatibility.

### The Power of Decimal Sequencing

The decimal portion isn't a timestamp—it's a sequence number:

<example-query description="Analyze decimal sequencing patterns">
WITH real_analysis AS (
    SELECT 
        PAT_ID,
        CONTACT_DATE,
        PAT_ENC_CSN_ID,
        PAT_ENC_DATE_REAL,
        CAST(PAT_ENC_DATE_REAL AS INT) as date_part,
        ROUND((PAT_ENC_DATE_REAL - CAST(PAT_ENC_DATE_REAL AS INT)) * 100, 0) as sequence_part
    FROM pat_enc
    WHERE CONTACT_DATE LIKE '8/9/2018%'
)
SELECT 
    *,
    'Encounter #' || (sequence_part + 1) as encounter_order
FROM real_analysis
ORDER BY PAT_ENC_DATE_REAL;
</example-query>

### Where _REAL Dates Appear

<example-query description="Discover all _REAL date columns">
SELECT 
    column_name,
    COUNT(DISTINCT table_name) as table_count,
    GROUP_CONCAT(DISTINCT table_name) as appears_in_tables
FROM _metadata
WHERE column_name LIKE '%_REAL'
GROUP BY column_name
ORDER BY table_count DESC
</example-query>

These 13 columns appear wherever chronological precision matters:
- **PAT_ENC_DATE_REAL**: Order of patient encounters
- **ORD_DATE_REAL**: Precise timing of clinical orders
- **CONTACT_DATE_REAL**: Exact sequence of system interactions

### The Sorting Guarantee

The critical rule: **`_REAL` dates are the ONLY reliable way to sort events chronologically**. Here's why:

<example-query description="Demonstrate why _REAL sorting is essential">
-- Create a scenario showing the problem
WITH sorting_comparison AS (
    SELECT 
        PAT_ENC_CSN_ID,
        CONTACT_DATE,
        PAT_ENC_DATE_REAL,
        -- Different sorting approaches
        ROW_NUMBER() OVER (ORDER BY CONTACT_DATE, PAT_ENC_CSN_ID) as sort_by_date_and_id,
        ROW_NUMBER() OVER (ORDER BY PAT_ENC_DATE_REAL) as sort_by_real,
        -- Check if they match
        CASE 
            WHEN ROW_NUMBER() OVER (ORDER BY CONTACT_DATE, PAT_ENC_CSN_ID) = 
                 ROW_NUMBER() OVER (ORDER BY PAT_ENC_DATE_REAL)
            THEN 'Same'
            ELSE 'Different!'
        END as sort_order_match
    FROM pat_enc
    WHERE CONTACT_DATE LIKE '8/9/2018%'
)
SELECT * FROM sorting_comparison;
</example-query>

In this case they match, but that's pure luck—CSN_IDs happened to be assigned in chronological order. In production systems, you cannot rely on this coincidence.

### Uniqueness Properties

<example-query description="Verify _REAL values are unique per patient">
-- Check for any duplicate _REAL values
WITH duplicate_check AS (
    SELECT 
        PAT_ID,
        PAT_ENC_DATE_REAL,
        COUNT(*) as occurrence_count
    FROM pat_enc
    WHERE PAT_ENC_DATE_REAL IS NOT NULL
    GROUP BY PAT_ID, PAT_ENC_DATE_REAL
    HAVING COUNT(*) > 1
)
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✓ All _REAL values are unique per patient'
        ELSE '✗ Found ' || COUNT(*) || ' duplicates'
    END as uniqueness_check
FROM duplicate_check;
</example-query>

Epic guarantees that `_REAL` values are unique within a patient's record, making them perfect for identifying specific events.

### Working with _REAL Dates

**1. Convert to Standard Dates**
```sql
-- Convert _REAL to readable date
SELECT 
    PAT_ENC_DATE_REAL,
    DATE('1840-12-31', '+' || CAST(PAT_ENC_DATE_REAL AS INT) || ' days') as standard_date
FROM pat_enc;
```

**2. Extract Components**
```sql
-- Separate date and sequence parts
SELECT 
    PAT_ENC_DATE_REAL,
    CAST(PAT_ENC_DATE_REAL AS INT) as days_since_epoch,
    ROUND((PAT_ENC_DATE_REAL - CAST(PAT_ENC_DATE_REAL AS INT)) * 100, 2) as sequence_number
FROM pat_enc;
```

**3. Always Sort by _REAL**
```sql
-- The golden rule for chronological queries
SELECT * FROM encounters
ORDER BY PAT_ENC_DATE_REAL;  -- Always correct

-- Never rely on this
ORDER BY CONTACT_DATE, PAT_ENC_CSN_ID;  -- Might be wrong
```

### The Time Component Mystery

One clarification: the decimal part does NOT encode time of day:

<example-query description="Prove decimals aren't timestamps">
SELECT 
    column_name,
    SUBSTR(documentation, 1, 150) as description
FROM _metadata
WHERE column_name LIKE '%_REAL'
ORDER BY column_name
LIMIT 5;
</example-query>

Actual times are stored in separate `_TIME` or `_DTTM` columns. The decimal is purely for sequencing.

### Pattern Recognition

You can identify `_REAL` columns by:
1. Column name ends with `_REAL`
2. Data type is REAL (floating point)
3. Values are large numbers (60000+) with optional decimals
4. Usually paired with a human-readable date column

---

### Key Takeaways

- `_REAL` dates count days since December 31, 1840 (Epic's epoch)
- The decimal portion provides sequence numbers for same-day events
- This pattern appears in 13 columns across the database
- `_REAL` dates are the ONLY reliable way to sort events chronologically
- Values are guaranteed unique within a patient's record
- The decimal is NOT a timestamp—actual times are stored separately
- Always use `_REAL` columns for chronological sorting when available