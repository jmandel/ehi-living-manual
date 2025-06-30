# Other Common Patterns

*Purpose: To complete your pattern recognition toolkit with additional conventions found throughout Epic's database.*

### Beyond the Big Five

You've mastered the major patterns, but Epic's database contains several more conventions that appear repeatedly. Understanding these completes your ability to navigate any table confidently.

<example-query description="Discover the most common column patterns">
WITH pattern_analysis AS (
    SELECT 
        CASE
            WHEN column_name LIKE '%_YN' THEN '_YN (Yes/No)'
            WHEN column_name LIKE '%_ID_%NAME' THEN '_ID/_NAME pairs'
            WHEN column_name LIKE '%_AMT' THEN '_AMT (Amounts)'
            WHEN column_name LIKE '%_DTTM' THEN '_DTTM (DateTime)'
            WHEN column_name LIKE '%_DT' THEN '_DT (Date)'
            WHEN column_name LIKE '%_NUM' THEN '_NUM (Number)'
            WHEN column_name LIKE '%_CSN' THEN '_CSN (Contact Serial)'
            ELSE 'Other'
        END as pattern_type,
        column_name
    FROM _metadata
    WHERE column_name IS NOT NULL
)
SELECT 
    pattern_type,
    COUNT(*) as occurrence_count
FROM pattern_analysis
WHERE pattern_type != 'Other'
GROUP BY pattern_type
ORDER BY occurrence_count DESC
</example-query>

### The _YN Boolean Pattern

Epic uses **`_YN`** suffix for all boolean fields, with only two valid values:

<example-query description="Understand the _YN boolean pattern">
-- Check valid values
SELECT DISTINCT 
    PRIMARY_DX_YN as yn_value,
    COUNT(*) as occurrences
FROM PAT_ENC_DX
GROUP BY PRIMARY_DX_YN
ORDER BY yn_value;

-- See variety of boolean fields
SELECT 
    column_name,
    REPLACE(column_name, '_YN', '') as what_it_tracks
FROM _metadata
WHERE column_name LIKE '%_YN'
  AND table_name = 'PATIENT'
ORDER BY column_name
LIMIT 10
</example-query>

The rules are simple:
- **'Y'** = Yes/True
- **'N'** = No/False  
- **NULL** = Unknown/Not specified

Never expect 'T'/'F', '1'/'0', or 'true'/'false'—Epic exclusively uses Y/N.

### The ID/NAME Pairing Pattern

Epic frequently pairs technical IDs with human-readable names:

<example-query description="Explore ID/NAME pairs">
-- Find examples of paired columns
SELECT 
    REPLACE(column_name, '_NAME', '') as base_column,
    GROUP_CONCAT(column_name, ' + ') as paired_columns
FROM _metadata
WHERE table_name = 'PROBLEM_LIST'
  AND (column_name LIKE '%USER_ID' OR column_name LIKE '%USER_ID_NAME')
GROUP BY REPLACE(column_name, '_NAME', '')
ORDER BY base_column
</example-query>

This pattern serves two purposes:
1. **ID**: For joining and referential integrity
2. **NAME**: For immediate human readability without joins

<example-query description="See ID/NAME pairs in action">
SELECT 
    PROBLEM_LIST_ID,
    ENTRY_USER_ID,
    ENTRY_USER_ID_NAME,
    DESCRIPTION
FROM PROBLEM_LIST
WHERE ENTRY_USER_ID IS NOT NULL
LIMIT 5;
</example-query>

### The Continuation Table Pattern (_2, _3, _4)

Epic splits wide tables across multiple physical tables:

<example-query description="Discover continuation tables">
SELECT 
    SUBSTR(name, 1, LENGTH(name) - 2) as base_table,
    GROUP_CONCAT(name, ', ') as all_parts,
    COUNT(*) as table_count
FROM sqlite_master
WHERE type = 'table'
  AND (name LIKE '%\_2' ESCAPE '\' 
       OR name LIKE '%\_3' ESCAPE '\' 
       OR name LIKE '%\_4' ESCAPE '\')
GROUP BY base_table
HAVING table_count >= 1
ORDER BY table_count DESC
LIMIT 10;
</example-query>

These aren't separate entities—they're chunks of the same logical record, split because:
- SQL Server has column limits
- Chronicles records can be enormous
- Historical reasons from older database versions

Always query them together:
```sql
SELECT p.*, p2.*, p3.*
FROM PATIENT p
LEFT JOIN PATIENT_2 p2 ON p.PAT_ID = p2.PAT_ID  
LEFT JOIN PATIENT_3 p3 ON p.PAT_ID = p3.PAT_ID;
```

### Date and Time Patterns

Epic uses multiple patterns for temporal data:

<example-query description="Analyze temporal column patterns">
WITH date_patterns AS (
    SELECT 
        CASE
            WHEN column_name LIKE '%_DTTM' THEN 'DateTime (_DTTM)'
            WHEN column_name LIKE '%_DT' AND column_name NOT LIKE '%_DTTM' THEN 'Date only (_DT)'
            WHEN column_name LIKE '%_DATE' THEN 'Date (spelled out)'
            WHEN column_name LIKE '%_TIME' THEN 'Time only (_TIME)'
            WHEN column_name LIKE '%_TM' AND column_name NOT LIKE '%_DTTM' THEN 'Time (_TM)'
        END as pattern,
        column_name,
        table_name
    FROM _metadata
    WHERE column_name LIKE '%_DT%' 
       OR column_name LIKE '%_DATE%'
       OR column_name LIKE '%_TIME%'
       OR column_name LIKE '%_TM'
)
SELECT 
    pattern,
    COUNT(*) as column_count,
    SUBSTR(GROUP_CONCAT(DISTINCT column_name), 1, 100) as examples
FROM date_patterns
WHERE pattern IS NOT NULL
GROUP BY pattern
ORDER BY column_count DESC
LIMIT 5
</example-query>

Each serves a specific purpose:
- **_DTTM**: Full datetime stamp
- **_DT**: Date only (often abbreviated)
- **_DATE**: Date only (spelled out)
- **_TIME**: Time portion only
- **_REAL**: Precise chronological ordering (as you learned)

### Financial Amount Pattern (_AMT)

All monetary values use the **`_AMT`** suffix:

<example-query description="Explore financial amount columns">
SELECT 
    table_name,
    column_name,
    SUBSTR(documentation, 1, 100) || '...' as description
FROM _metadata
WHERE column_name LIKE '%_AMT'
  AND documentation LIKE '%dollar%' OR documentation LIKE '%amount%'
ORDER BY RANDOM()
LIMIT 5
</example-query>

These are always:
- REAL data type
- Stored in dollars (not cents)
- Can be negative (credits, adjustments)
- NULL when not applicable

### The Contact Serial Number (_CSN) Pattern

CSN (Contact Serial Number) is Epic's unique identifier for encounters:

<example-query description="Understand CSN usage">
SELECT 
    column_name,
    COUNT(DISTINCT table_name) as used_in_tables
FROM _metadata
WHERE column_name LIKE '%_CSN%'
GROUP BY column_name
ORDER BY used_in_tables DESC
LIMIT 10
</example-query>

CSNs are:
- Globally unique across the entire Epic system
- Never reused
- The primary way to link encounter-related data

### Putting It All Together

Let's see multiple patterns in one query:

<example-query description="See all patterns working together">
SELECT 
    -- ID/NAME pair
    ENTRY_USER_ID,
    ENTRY_USER_ID_NAME,
    
    -- _YN boolean
    CHRONIC_YN,
    
    -- _C_NAME category
    PROBLEM_STATUS_C_NAME,
    
    -- Standard date
    DATE_OF_ENTRY,
    
    -- The actual problem
    DESCRIPTION
    
FROM PROBLEM_LIST
WHERE PROBLEM_LIST_ID IS NOT NULL
LIMIT 5;
</example-query>

### Pattern Recognition Checklist

When encountering a new table:

1. **Check for LINE columns** → Indicates one-to-many relationships
2. **Look for _HX suffix** → Has historical tracking
3. **Scan for _C_NAME** → Contains denormalized categories
4. **Find _REAL columns** → Use these for chronological sorting
5. **Identify _YN fields** → Boolean flags with Y/N values
6. **Spot ID/NAME pairs** → Denormalized for convenience
7. **Check for _2, _3 tables** → Continuation of the base table

---

### Key Takeaways

- **_YN** columns are Epic's boolean pattern (Y/N/NULL only)
- **ID/NAME pairs** provide both referential integrity and human readability
- **Continuation tables** (_2, _3, _4) are parts of the same logical record
- **Date patterns** vary: _DTTM (datetime), _DT (date), _TIME (time only)
- **_AMT** indicates financial amounts in dollars
- **_CSN** columns contain Contact Serial Numbers for encounter linking
- These patterns combine with the major five to form Epic's complete data grammar