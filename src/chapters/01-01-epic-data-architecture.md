# Epic's Data Architecture: From Chronicles to Clarity

*Purpose: To understand why Epic's data looks the way it does by tracing its journey from hierarchical to relational.*

### The Tale of Two Databases

To understand Epic's EHI export, you must first understand Epic's unique dual-database architecture. Unlike most modern systems that use a single database, Epic runs two completely different databases in parallel:

1. **Chronicles**: The real-time hierarchical database where clinicians work
2. **Clarity**: The relational reporting database that feeds analytics

This isn't a design quirk—it's a deliberate architecture that balances the competing needs of speed (for patient care) and structure (for reporting). Let's explore how this shapes everything you see in the EHI export.

### Chronicles: The MUMPS Legacy

Epic's Chronicles database runs on technology older than the Internet itself. Born in 1966 at Massachusetts General Hospital, **MUMPS** (Massachusetts General Hospital Utility Multi-Programming System) was revolutionary for its time. It combined a programming language with an integrated database—a radical idea when RAM was measured in kilobytes.

<example-query description="See evidence of hierarchical data in relational form">
-- Count tables that use the LINE pattern
SELECT COUNT(DISTINCT table_name) as tables_with_line_column
FROM _metadata
WHERE column_name = 'LINE';
</example-query>

That `LINE` column? It's Chronicles' way of handling multiple values for a single concept—what MUMPS calls "multiple responses." In a hierarchical database, you don't create separate tables for one-to-many relationships; you create numbered lines within the same record.

### How Chronicles Stores Data

In Chronicles, data lives in **Master Files** (called INIs), each containing records with:
- **Item Number**: The unique identifier for the record
- **Items**: Individual data fields, which can be single-valued or multi-valued

Here's how this translates to what you see:

<example-query description="Observe hierarchical patterns in account contacts">
SELECT 
    ACCOUNT_ID,
    LINE,
    LETTER_NAME as contact_name,
    CONTACT_STATUS_C_NAME,
    CONTACT_DATE
FROM ACCOUNT_CONTACT
WHERE ACCOUNT_ID IN (
    SELECT ACCOUNT_ID 
    FROM ACCOUNT_CONTACT 
    GROUP BY ACCOUNT_ID 
    HAVING COUNT(*) > 1
)
ORDER BY ACCOUNT_ID, LINE
LIMIT 10;
</example-query>

In Chronicles, this would be stored as a single account record with multiple contact "lines." The ETL process flattens this into rows, preserving the line numbers.

### The Nightly Transformation: ETL

Every night, Epic performs a massive **Extract, Transform, Load (ETL)** operation:

<mermaid>
graph LR
    A[Chronicles<br/>Hierarchical<br/>Real-time] -->|Extract| B[ETL Process<br/>Nightly Run]
    B -->|Transform| C[Data Restructuring<br/>Flatten Hierarchies]
    C -->|Load| D[Clarity<br/>Relational<br/>SQL Server]
    D -->|Export| E[EHI Export<br/>Your SQLite DB]
    
    style A fill:#2b6cb0,stroke:#1a4d80,color:white
    style D fill:#2f855a,stroke:#1e5438,color:white
    style E fill:#718096,stroke:#4a5568,color:white
</mermaid>

This process:
1. **Extracts** data from Chronicles' hierarchical structure
2. **Transforms** it into relational tables (creating those LINE columns)
3. **Loads** it into Clarity's 18,000+ SQL Server tables

The result? Yesterday's real-time data becomes today's analytics.

### Why Two Databases?

This architecture seems complex, but it solves real problems:

<example-query description="See the scale that demands this architecture">
-- Epic must handle massive transaction volumes
SELECT 
    'Orders' as data_type, COUNT(*) as record_count FROM ORDER_PROC
UNION ALL
SELECT 'Results', COUNT(*) FROM ORDER_RESULTS
UNION ALL
SELECT 'Medications', COUNT(*) FROM ORDER_MED
UNION ALL
SELECT 'Encounters', COUNT(*) FROM PAT_ENC
ORDER BY record_count DESC;
</example-query>

**Chronicles excels at**:
- Lightning-fast lookups for individual patients
- Real-time data entry during patient care
- Handling constantly changing clinical workflows
- Supporting hundreds of simultaneous users

**Clarity excels at**:
- Complex queries across millions of records
- Population health analytics
- Financial reporting
- Research datasets

### Chronicles Artifacts in Your Data

Understanding Chronicles helps explain many "quirks" in the EHI export:

<example-query description="Discover Epic's internal date system">
-- Epic stores dates as days since 12/31/1840
SELECT 
    column_name,
    COUNT(DISTINCT table_name) as table_count,
    GROUP_CONCAT(DISTINCT table_name) as appears_in_tables
FROM _metadata
WHERE column_name LIKE '%_REAL'
GROUP BY column_name
ORDER BY table_count DESC
LIMIT 5;
</example-query>

These `_REAL` columns contain Epic's internal date format—the number of days since December 31, 1840. Why 1840? It's a MUMPS convention that predates Unix time by decades.

### The Hidden Hierarchy

Even in relational form, you can see Chronicles' hierarchical DNA:

<example-query description="Trace hierarchical relationships through shared IDs">
-- Find tables that share the same base record structure
WITH base_tables AS (
    SELECT DISTINCT 
        SUBSTR(table_name, 1, LENGTH(table_name) - 2) as base_name,
        table_name
    FROM _metadata
    WHERE table_name LIKE '%\_2' ESCAPE '\'
       OR table_name LIKE '%\_3' ESCAPE '\'
       OR table_name LIKE '%\_4' ESCAPE '\'
)
SELECT 
    base_name,
    GROUP_CONCAT(table_name, ', ') as related_tables,
    COUNT(*) as table_count
FROM base_tables
GROUP BY base_name
HAVING table_count > 1
ORDER BY table_count DESC
LIMIT 10;
</example-query>

Tables like `ACCOUNT`, `ACCOUNT_2`, `ACCOUNT_3` aren't separate entities—they're continuations of the same Chronicles record, split because SQL Server has column limits that Chronicles doesn't respect.

### From INI to Table

Chronicles master files (INIs) map directly to Clarity tables:

<example-query description="Common Epic master file prefixes">
SELECT 
    SUBSTR(table_name, 1, 3) as prefix,
    COUNT(*) as table_count,
    GROUP_CONCAT(DISTINCT table_name) as example_tables
FROM (
    SELECT table_name
    FROM _metadata
    WHERE column_name IS NULL
      AND table_name NOT LIKE '\_%' ESCAPE '\'
    ORDER BY table_name
    LIMIT 200
)
GROUP BY SUBSTR(table_name, 1, 3)
HAVING COUNT(*) >= 3
ORDER BY table_count DESC
LIMIT 10;
</example-query>

Each prefix typically represents a Chronicles master file:
- **PAT**: Patient master file
- **HSP**: Hospital accounts
- **ORD**: Orders
- **CLA**: Clarity-specific tables

### The Performance Trade-off

This dual architecture creates a 24-hour lag but enables both systems to excel at their jobs. Real-time clinical care happens in Chronicles. Historical analysis happens in Clarity. The EHI export gives you the Clarity view—comprehensive but not instantaneous.

Many tables include update tracking columns that show when data was last refreshed from Chronicles, though these are often empty in EHI exports.

### Working With the Architecture

Understanding this architecture helps you:

1. **Interpret LINE patterns**: When you see numbered lines, think "this was a multi-valued field in Chronicles"
2. **Handle split tables**: `PATIENT`, `PATIENT_2`, etc. are one logical record
3. **Understand timing**: Data is always at least one day old due to ETL
4. **Recognize Chronicles types**: `_YN` for yes/no, `_C` for category lists, `_REAL` for internal dates

---

### Key Takeaways

- Epic uses two databases: Chronicles (hierarchical, real-time) and Clarity (relational, analytical)
- The EHI export comes from Clarity after nightly ETL processing
- MUMPS, created in 1966 at Mass General, still powers Epic's core database
- The LINE column pattern (in 275 tables) reveals Chronicles' hierarchical structure
- Tables ending in _2, _3, etc. are continuations of the same logical record
- Understanding this architecture explains many "quirks" in the data model