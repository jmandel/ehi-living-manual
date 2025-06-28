# Chapter 1.4: Modeling Categories: The `_C_NAME` Pattern

*Purpose: To understand Epic's denormalized approach to categorical data in the EHI export.*

### The Missing Lookup Tables

In a traditional database, you'd expect to find lookup tables—small tables mapping codes to descriptions. You might see `appointment_status` with rows like `(1, 'Scheduled')`, `(2, 'Completed')`, `(3, 'Canceled')`. But search Epic's EHI export and you'll find something surprising:

<example-query description="Prove that ZC_ lookup tables don't exist">
-- Traditional Epic systems use ZC_ tables for lookups
SELECT 
    COUNT(*) as zc_tables_found,
    CASE 
        WHEN COUNT(*) = 0 THEN '❌ No ZC_ lookup tables in EHI export!'
        ELSE 'Found lookup tables'
    END as finding
FROM sqlite_master 
WHERE type = 'table' 
  AND name LIKE 'ZC_%';
</example-query>

Instead, Epic uses the **`_C_NAME` pattern**—storing human-readable category names directly in each table.

### The Scale of Denormalization

<example-query description="Discover the prevalence of the _C_NAME pattern">
SELECT 
    COUNT(DISTINCT column_name) as category_columns,
    COUNT(DISTINCT table_name) as tables_with_categories
FROM _metadata
WHERE column_name LIKE '%_C_NAME%';
</example-query>

With 1,695 category columns across the database, this pattern is fundamental to Epic's data model.

### How Categories Work

Let's examine a typical category column:

<example-query description="See category values in practice">
-- First, see the distinct values
SELECT 
    APPT_STATUS_C_NAME as status,
    COUNT(*) as encounter_count
FROM pat_enc 
WHERE APPT_STATUS_C_NAME IS NOT NULL
GROUP BY APPT_STATUS_C_NAME
ORDER BY encounter_count DESC;
</example-query>

Notice the documentation reveals the hidden numeric codes: "1 - Scheduled, 2 - Completed, 3 - Canceled". These codes exist in Chronicles but are translated to text for the export.

### The Hidden Code System

Epic's documentation often exposes the underlying numeric categories:

<example-query description="Find columns where documentation reveals numeric codes">
SELECT 
    table_name,
    column_name,
    SUBSTR(documentation, 1, 100) || '...' as shows_numeric_codes
FROM _metadata
WHERE column_name LIKE '%_C_NAME'
  AND documentation LIKE '%1 -%'
LIMIT 5;
</example-query>

This proves that Chronicles uses numeric categories internally, but the EHI export provides only the human-readable names.

### Why This Matters for Queries

The denormalized approach has significant implications:

**1. Text Matching Instead of Codes**
```sql
-- You must use text values, not numeric codes
SELECT * FROM pat_enc 
WHERE APPT_STATUS_C_NAME = 'Completed';  -- ✓ Correct

SELECT * FROM pat_enc 
WHERE APPT_STATUS_C_NAME = '2';  -- ✗ Won't work
```

**2. Case and Whitespace Sensitivity**
<example-query description="Check for case variations in category values">
-- Are category values consistent?
SELECT 
    APPT_STATUS_C_NAME,
    UPPER(APPT_STATUS_C_NAME) as uppercase,
    LOWER(APPT_STATUS_C_NAME) as lowercase,
    COUNT(*) as occurrences
FROM pat_enc
WHERE APPT_STATUS_C_NAME IS NOT NULL
GROUP BY APPT_STATUS_C_NAME
ORDER BY APPT_STATUS_C_NAME;
</example-query>

**3. No Referential Integrity**
Without lookup tables, there's no database-enforced consistency:

<example-query description="Demonstrate lack of referential constraints">
-- Find all unique statuses across different status columns
WITH all_statuses AS (
    SELECT DISTINCT 'APPT_STATUS' as status_type, APPT_STATUS_C_NAME as status_value 
    FROM pat_enc WHERE APPT_STATUS_C_NAME IS NOT NULL
    
    UNION
    
    SELECT DISTINCT 'PROBLEM_STATUS', PROBLEM_STATUS_C_NAME 
    FROM PROBLEM_LIST WHERE PROBLEM_STATUS_C_NAME IS NOT NULL
)
SELECT * FROM all_statuses
ORDER BY status_type, status_value;
</example-query>

### Common Category Types

Categories follow predictable patterns based on their suffix:

<example-query description="Analyze category naming patterns">
WITH category_types AS (
    SELECT 
        SUBSTR(column_name, 1, INSTR(column_name, '_C_NAME') - 1) as base_name,
        column_name,
        table_name
    FROM _metadata
    WHERE column_name LIKE '%_C_NAME%'
)
SELECT 
    base_name,
    COUNT(DISTINCT table_name) as table_count,
    GROUP_CONCAT(DISTINCT table_name) as appears_in_tables
FROM category_types
GROUP BY base_name
HAVING COUNT(DISTINCT table_name) > 3
ORDER BY table_count DESC
LIMIT 10;
</example-query>

### The _C Without _NAME Mystery

Occasionally you'll find columns ending in `_C` without the `_NAME` suffix:

<example-query description="Investigate _C columns without _NAME">
SELECT 
    column_name,
    table_name,
    documentation
FROM _metadata
WHERE column_name LIKE '%_C'
  AND column_name NOT IN (
      SELECT REPLACE(column_name, '_NAME', '') 
      FROM _metadata 
      WHERE column_name LIKE '%_C_NAME%'
  )
LIMIT 10;
</example-query>

These 66 columns are remnants where the numeric code leaked through, but they're exceptions to the rule.

### Working with Categories

Best practices for the `_C_NAME` pattern:

**1. Build Category Inventories**
<example-query description="Create a reference list of valid values">
-- Build a reference of all appointment statuses
SELECT DISTINCT 
    APPT_STATUS_C_NAME as status_name,
    COUNT(*) as usage_count
FROM PAT_ENC
WHERE APPT_STATUS_C_NAME IS NOT NULL
GROUP BY APPT_STATUS_C_NAME
ORDER BY usage_count DESC;
</example-query>

**2. Handle NULL Values**
```sql
-- Categories can be NULL - always check
SELECT COUNT(*) as total,
       COUNT(APPT_STATUS_C_NAME) as with_status,
       COUNT(*) - COUNT(APPT_STATUS_C_NAME) as missing_status
FROM pat_enc;
```

**3. Use LIKE for Flexible Matching**
```sql
-- When exact values might vary
SELECT * FROM diagnoses
WHERE DX_CATEGORY_C_NAME LIKE '%Emergency%';
```

### The Trade-offs

This denormalized approach has pros and cons:

**Advantages:**
- Human-readable without joins
- Self-contained tables
- Simpler queries for basic reporting

**Disadvantages:**
- No enforced consistency
- Text matching is less efficient than numeric comparisons  
- Category changes require updating all rows
- Potential for typos and variations

---

### Key Takeaways

- Epic stores category names as text (`_C_NAME`), not numeric codes
- 1,695 category columns make this the most common pattern after `LINE`
- No `ZC_` lookup tables exist in the EHI export—everything is denormalized
- Documentation often reveals the hidden numeric codes from Chronicles
- Always use exact text matching for category values
- This pattern trades referential integrity for simplicity and readability
- Build your own category inventories when consistency matters