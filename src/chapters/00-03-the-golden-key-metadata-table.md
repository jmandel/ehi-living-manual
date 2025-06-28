# Chapter 0.3: The Golden Key: The `_metadata` Table

*Purpose: To master the single most powerful tool for navigating Epic's 551-table database independently.*

### Your Rosetta Stone for Epic Data

Imagine trying to explore a vast library where every book is written in a different language. That's what Epic's EHI export can feel like with its 551 tables and thousands of columns. Fortunately, Epic provides a Rosetta Stone: the **`_metadata`** table.

This single table transforms the overwhelming into the manageable. It contains three columns that document every table and column in the database:

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

That documentation you see? It's Epic's official explanation of what `PAT_ID` means and how it's used. This pattern extends to every table and column in the database.

### How `_metadata` Works

The table has just three columns, but they unlock everything:

<example-query description="Understanding the _metadata structure">
SELECT 
    COUNT(DISTINCT table_name) as documented_tables,
    COUNT(*) as total_documentation_entries,
    COUNT(CASE WHEN column_name IS NULL THEN 1 END) as table_descriptions,
    COUNT(CASE WHEN column_name IS NOT NULL THEN 1 END) as column_descriptions
FROM _metadata;
</example-query>

Here's what each column means:
- **`table_name`**: The table being documented
- **`column_name`**: The specific column (NULL for table-level documentation)
- **`documentation`**: Epic's explanation of purpose and usage

### The Power of Table Documentation

When `column_name` is NULL, you get the table's overall purpose:

<example-query description="Discover what each table does">
SELECT 
    table_name,
    SUBSTR(documentation, 1, 150) as table_purpose
FROM _metadata
WHERE column_name IS NULL
  AND table_name IN ('PATIENT', 'PAT_ENC', 'ORDER_MED', 'CLARITY_EDG')
ORDER BY table_name;
</example-query>

### The Rosetta Stone Query

Here's the most valuable query you'll ever write—it generates complete documentation for any table:

<example-query description="The Rosetta Stone: Get full documentation for any table">
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

This query combines SQLite's schema information with Epic's documentation, giving you a complete picture of any table. Bookmark this—you'll use it constantly.

### Discovering Tables by Concept

Don't know which table contains what you need? Search by keyword:

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

Try changing `'%diagnos%'` to other medical concepts: `'%medication%'`, `'%insurance%'`, `'%allergy%'`, or `'%appointment%'`.

### Finding Specific Data Elements

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

### Understanding Data Relationships

The `_metadata` table reveals how tables connect:

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

Every table with a `PAT_ID` column links back to the `PATIENT` table. This pattern repeats throughout Epic: shared column names indicate relationships.

### Metadata Coverage Analysis

How complete is the documentation? Let's check:

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

With 99.6% coverage, you can trust that almost every table and column has documentation.

### Pro Tips for Using `_metadata`

**1. Create Column Inventories**

Find all columns that store financial amounts by searching for the `_AMT` suffix pattern.

**2. Understand Epic's Naming Conventions**

Epic uses consistent suffixes: `_YN` for yes/no flags, `_C_NAME` for category names, `_ID` for identifiers, and `_REAL` for precise dates.

**3. Build Your Own Documentation**

Combine the Rosetta Stone query with your own notes to create personalized documentation for the tables you use most frequently.

### When Documentation Isn't Enough

Sometimes you need to see actual data to understand a column. Here's how to combine metadata with real examples:

<example-query description="Combine documentation with real examples">
-- First get the documentation
SELECT documentation 
FROM _metadata 
WHERE table_name = 'PAT_ENC' AND column_name = 'CONTACT_DATE';
</example-query>

<example-query description="Then see actual data patterns">
-- Then see it in practice
SELECT 
    CONTACT_DATE,
    COUNT(*) as encounters_on_date
FROM PAT_ENC
WHERE CONTACT_DATE IS NOT NULL
GROUP BY CONTACT_DATE
ORDER BY encounters_on_date DESC
LIMIT 5;
</example-query>

---

### Key Takeaways

- The `_metadata` table is your guide to all 551 tables and 10,000+ columns in the Epic EHI export
- When `column_name` is NULL, documentation describes the entire table's purpose
- Use the "Rosetta Stone" query to generate complete documentation for any table instantly
- Search documentation by keyword to discover relevant tables for any healthcare concept
- 99.6% of tables are documented, making this an incredibly reliable resource
- Combine metadata queries with actual data sampling for deeper understanding