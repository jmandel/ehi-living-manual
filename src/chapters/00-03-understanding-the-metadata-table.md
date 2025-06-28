# Chapter 0.3: Understanding the `_metadata` Table

*Purpose: To master Epic's built-in documentation system that makes the 551-table database navigable and understandable.*

### Epic's Built-In Documentation

Every Epic EHI export includes comprehensive documentation for its tables and columns. Epic publishes this documentation at [https://open.epic.com/EHITables](https://open.epic.com/EHITables), and a copy is included with each patient's export. We've loaded this documentation into SQLite as the `_metadata` table, making it queryable right alongside your actual health data.

This single table transforms an overwhelming database into something you can explore systematically. It contains Epic's official explanations for every table and column:

<example-query description="Your first look at the _metadata table structure">
SELECT 
    table_name,
    column_name,
    SUBSTR(documentation, 1, 100) || '...' as documentation_preview
FROM _metadata
WHERE table_name = 'PATIENT' 
  AND column_name = 'PAT_ID'
LIMIT 1;
</example-query>

### How `_metadata` Works

The table has three columns that document the entire database:

<example-query description="Understanding the _metadata structure">
SELECT 
    COUNT(DISTINCT table_name) as documented_tables,
    COUNT(*) as total_documentation_entries,
    COUNT(CASE WHEN column_name IS NULL THEN 1 END) as table_descriptions,
    COUNT(CASE WHEN column_name IS NOT NULL THEN 1 END) as column_descriptions
FROM _metadata;
</example-query>

- **`table_name`**: The table being documented
- **`column_name`**: The specific column (NULL for table-level documentation)
- **`documentation`**: Epic's explanation of purpose and usage

### Table-Level Documentation

When `column_name` is NULL, you get the table's overall purpose:

<example-query description="Discover what key tables do">
SELECT 
    table_name,
    SUBSTR(documentation, 1, 150) as table_purpose
FROM _metadata
WHERE column_name IS NULL
  AND table_name IN ('PATIENT', 'PAT_ENC', 'ORDER_MED', 'CLARITY_EDG')
ORDER BY table_name;
</example-query>

### The Essential Documentation Query

This query generates complete documentation for any table by combining SQLite's schema information with Epic's documentation:

<example-query description="Get full documentation for any table">
-- Replace 'PAT_ENC' with any table name
WITH table_info AS (
    SELECT name as column_name, cid as column_order
    FROM pragma_table_info('PAT_ENC')
)
SELECT 
    ti.column_name,
    COALESCE(m.documentation, '(No documentation available)') as description
FROM table_info ti
LEFT JOIN _metadata m 
    ON m.table_name = 'PAT_ENC' 
    AND m.column_name = ti.column_name
ORDER BY ti.column_order;
</example-query>

### Finding Tables by Healthcare Concept

Search documentation by keyword to discover relevant tables:

<example-query description="Find all tables related to diagnoses">
SELECT DISTINCT
    table_name,
    COUNT(*) as relevant_columns
FROM _metadata
WHERE LOWER(documentation) LIKE '%diagnos%'
  AND column_name IS NOT NULL
GROUP BY table_name
ORDER BY relevant_columns DESC
LIMIT 10;
</example-query>

Try other medical concepts: `'%medication%'`, `'%insurance%'`, `'%allergy%'`, or `'%appointment%'`.

### Locating Specific Data Elements

Need to find where a specific type of data lives? Search column documentation:

<example-query description="Find all date/time columns related to admission">
SELECT 
    table_name,
    column_name,
    SUBSTR(documentation, 1, 100) as description
FROM _metadata
WHERE column_name LIKE '%ADMSN%' 
   OR (LOWER(documentation) LIKE '%admission%' AND column_name LIKE '%_DT%')
ORDER BY table_name, column_name
LIMIT 10;
</example-query>

### Discovering Data Relationships

The `_metadata` table reveals how tables connect through shared columns:

<example-query description="Find foreign key relationships for patients">
SELECT 
    table_name,
    COUNT(*) as patient_linked_columns
FROM _metadata
WHERE column_name = 'PAT_ID'
  AND table_name != 'PATIENT'
GROUP BY table_name
ORDER BY table_name
LIMIT 15;
</example-query>

Every table with a `PAT_ID` column links back to the `PATIENT` table. This pattern—shared column names indicating relationships—is consistent throughout Epic.

### Documentation Coverage

Epic provides remarkably complete documentation:

<example-query description="Analyze metadata completeness">
WITH all_tables AS (
    SELECT name as table_name
    FROM sqlite_master
    WHERE type = 'table' AND name != '_metadata'
),
documented_tables AS (
    SELECT DISTINCT table_name
    FROM _metadata
)
SELECT 
    (SELECT COUNT(*) FROM all_tables) as total_tables,
    (SELECT COUNT(*) FROM documented_tables) as documented_tables,
    ROUND(
        100.0 * (SELECT COUNT(*) FROM documented_tables) / 
        (SELECT COUNT(*) FROM all_tables), 
        1
    ) as documentation_percentage,
    -- List any undocumented tables
    GROUP_CONCAT(
        CASE 
            WHEN at.table_name NOT IN (SELECT table_name FROM documented_tables)
            THEN at.table_name
        END
    ) as undocumented_tables
FROM all_tables at;
</example-query>

With 99.6% coverage, nearly every table and column has official documentation.

### Practical Documentation Strategies

**1. Search by Column Pattern**

Epic uses consistent naming conventions:
- `_YN` for yes/no flags
- `_C_NAME` for category names  
- `_ID` for identifiers
- `_REAL` for internal date format
- `_AMT` for currency amounts

**2. Combine Documentation with Data**

Documentation explains intent; actual data shows implementation:

<example-query description="First, get the documentation">
SELECT documentation 
FROM _metadata 
WHERE table_name = 'PAT_ENC' AND column_name = 'CONTACT_DATE';
</example-query>

<example-query description="Then see actual data patterns">
SELECT 
    CONTACT_DATE,
    COUNT(*) as encounters_on_date
FROM PAT_ENC
WHERE CONTACT_DATE IS NOT NULL
GROUP BY CONTACT_DATE
ORDER BY encounters_on_date DESC
LIMIT 5;
</example-query>

**3. Build Custom Views**

Create your own documentation views for frequently used tables, combining Epic's explanations with your notes about how the data appears in practice.

### Working with Undocumented Elements

While rare, some columns may lack documentation. When this happens:
1. Examine the column name for patterns
2. Look at actual data values
3. Check related columns in the same table
4. Search for similar columns in other tables

---

### Key Takeaways

- The `_metadata` table contains Epic's official documentation from [open.epic.com/EHITables](https://open.epic.com/EHITables)
- Every EHI export includes this documentation, loaded here as a queryable table
- Use table-level documentation (where `column_name` IS NULL) to understand table purposes
- Search documentation by keyword to discover relevant tables for any healthcare concept
- Shared column names (like `PAT_ID`) indicate relationships between tables
- 99.6% documentation coverage makes this an extremely reliable resource
- Combine documentation queries with actual data sampling for complete understanding

---