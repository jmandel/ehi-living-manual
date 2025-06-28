# Chapter 1.3: Modeling History and Change: The `_HX` Pattern

*Purpose: To understand Epic's comprehensive approach to tracking data changes over time.*

### Healthcare's Audit Trail Imperative

In healthcare, knowing not just what data is current but how it changed over time can be critical. Who updated a diagnosis? When was an address changed? What was the patient's insurance last year? Epic's **`_HX` pattern** provides complete audit history for critical data elements.

<example-query description="Discover the scope of history tracking">
SELECT 
    COUNT(*) as history_tables,
    GROUP_CONCAT(REPLACE(name, '_HX', ''), ', ') as tracked_entities
FROM sqlite_master 
WHERE type = 'table' 
  AND name LIKE '%_HX'
ORDER BY name;
</example-query>

With 23 history tables, Epic tracks changes to everything from problem lists to addresses, medications to insurance coverage.

### Anatomy of a History Table

History tables mirror their parent tables but add crucial temporal tracking:

<example-query description="Compare a regular table to its history counterpart">
-- First, see a current address
SELECT 
    PAT_ID,
    LINE,
    ADDRESS_
FROM PAT_ADDRESS
WHERE PAT_ID = 'Z7004242';
</example-query>

<example-query description="See the address change history">
-- Then see the address history with full details
SELECT 
    PAT_ID,
    LINE,
    EFF_START_DATE,
    EFF_END_DATE,
    ADDR_HX_LINE1,
    CITY_HX,
    ZIP_HX
FROM PAT_ADDR_CHNG_HX
WHERE PAT_ID = 'Z7004242'
ORDER BY EFF_START_DATE;
</example-query>

The key additions in `_HX` tables:
- **EFF_START_DATE**: When this version became active
- **EFF_END_DATE**: When this version was replaced (NULL = currently active)
- **LINE**: Tracks multiple historical records

### The Active Record Rule

A NULL or empty `EFF_END_DATE` indicates the currently active record:

<example-query description="Understand the active record pattern">
SELECT 
    PAT_ID,
    LINE,
    EFF_START_DATE,
    EFF_END_DATE,
    CASE 
        WHEN EFF_END_DATE IS NULL OR EFF_END_DATE = '' 
        THEN '✓ Currently Active'
        ELSE 'Historical'
    END as record_status
FROM PAT_ADDR_CHNG_HX
ORDER BY PAT_ID, EFF_START_DATE;
</example-query>

This pattern is identical to data warehousing's **Type 2 Slowly Changing Dimension**, where:
- New records are added rather than updating existing ones
- Effective dates track the validity period
- The current record has no end date

### Point-in-Time Queries

The real power of `_HX` tables is reconstructing data as it existed at any moment:

<example-query description="Find a patient's address on a specific date">
-- What was the patient's address on August 1, 2018?
SELECT 
    PAT_ID,
    ADDR_HX_LINE1,
    CITY_HX,
    ZIP_HX,
    EFF_START_DATE,
    EFF_END_DATE,
    'Note: Sample data may not contain historical addresses' as note
FROM PAT_ADDR_CHNG_HX
LIMIT 5;
</example-query>

### Common History Tracking Patterns

Let's explore what Epic typically tracks in history tables:

<example-query description="Examine different types of historical data">
SELECT 
    table_name,
    COUNT(*) as column_count,
    GROUP_CONCAT(column_name, ', ') as example_columns
FROM _metadata
WHERE table_name LIKE '%_HX'
   OR table_name LIKE '%_HX_%'
   OR table_name LIKE '%HIST%'
   OR table_name LIKE '%CHNG%'
GROUP BY table_name
ORDER BY table_name
LIMIT 10;
</example-query>

History tables fall into several categories:
- **Clinical History**: Problem lists, medications, surgical procedures
- **Administrative History**: Addresses, phone numbers, insurance
- **Financial History**: Guarantor information, payment arrangements
- **Audit History**: User updates, system changes

### The Audit Trail

Many `_HX` tables include audit columns to track who made changes:

<example-query description="Identify audit tracking columns">
SELECT 
    column_name,
    COUNT(DISTINCT table_name) as table_count
FROM _metadata
WHERE column_name LIKE '%_INST%'
   OR column_name LIKE '%_DTTM'
   OR column_name LIKE '%_USER%'
GROUP BY column_name
ORDER BY table_count DESC
LIMIT 10;
</example-query>

Common audit columns include:
- User who made the change
- Timestamp of the change
- System or interface that triggered the update

### History Table Patterns

<example-query description="Analyze history table structures">
WITH hx_patterns AS (
    SELECT 
        table_name,
        CASE 
            WHEN column_name = 'LINE' THEN 'Has LINE'
            WHEN column_name LIKE '%EFF_START%' THEN 'Has EFF_START'
            WHEN column_name LIKE '%EFF_END%' THEN 'Has EFF_END'
            WHEN column_name LIKE '%UPDATE%USER%' THEN 'Has UPDATE_USER'
            ELSE NULL
        END as pattern
    FROM _metadata
    WHERE table_name LIKE '%_HX'
)
SELECT 
    pattern,
    COUNT(DISTINCT table_name) as table_count,
    GROUP_CONCAT(DISTINCT table_name) as example_tables
FROM hx_patterns
WHERE pattern IS NOT NULL
GROUP BY pattern
ORDER BY table_count DESC;
</example-query>

### Best Practices for History Queries

**1. Always Consider Time Windows**
```sql
-- Find all addresses for a patient during 2018
SELECT * FROM PAT_ADDR_CHNG_HX
WHERE PAT_ID = 'Z7004242'
  AND (EFF_START_DATE < '2019-01-01' 
       AND (EFF_END_DATE >= '2018-01-01' OR EFF_END_DATE IS NULL));
```

**2. Handle NULL End Dates**
```sql
-- Safe date comparison with NULL handling
WHERE start_date <= target_date
  AND (end_date > target_date OR end_date IS NULL OR end_date = '')
```

**3. Join to Current Data Carefully**
```sql
-- Get current data with its history
SELECT 
    c.*, 
    h.EFF_START_DATE as current_since
FROM current_table c
JOIN history_table h ON c.ID = h.ID
WHERE h.EFF_END_DATE IS NULL;
```

### History vs. Current Tables

Not all data needs history tracking. Epic's approach is selective:

<example-query description="Compare tables with and without history tracking">
WITH all_tables AS (
    SELECT 
        name as table_name,
        CASE 
            WHEN name LIKE '%_HX' THEN 'History Table'
            WHEN EXISTS (
                SELECT 1 FROM sqlite_master sm2
                WHERE sm2.name = sm.name || '_HX'
            ) THEN 'Has History Table'
            ELSE 'No History Tracking'
        END as history_status
    FROM sqlite_master sm
    WHERE type = 'table' AND name != '_metadata'
)
SELECT 
    history_status,
    COUNT(*) as table_count
FROM all_tables
GROUP BY history_status
ORDER BY table_count DESC;
</example-query>

---

### Key Takeaways

- The `_HX` suffix identifies history tables that track changes over time
- EFF_START_DATE and EFF_END_DATE define when each version was active
- NULL or empty EFF_END_DATE indicates the currently active record
- This pattern implements Type 2 Slowly Changing Dimensions from data warehousing
- 23 history tables track critical clinical, administrative, and financial changes
- Point-in-time queries let you reconstruct data as it existed at any moment
- Not all tables have history tracking—Epic selectively applies it where audit trails matter most