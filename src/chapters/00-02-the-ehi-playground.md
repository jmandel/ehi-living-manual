# Chapter 0.2: The EHI Playground: Your Interactive Toolkit

*Purpose: To transform you from a passive reader into an active explorer of Epic's healthcare data.*

### Welcome to Your Interactive Database

This book isn't just about reading—it's about doing. Every SQL query you see can be executed directly in your browser against a real Epic EHI export. No setup required. No installation needed. Just click and explore.

Let's start with your very first query. Click the play button to see it in action:

<example-query description="Your first EHI query - see real patient encounters">
SELECT 
    PAT_ENC_CSN_ID,
    PAT_ID,
    CONTACT_DATE,
    ENC_CLOSED_YN
FROM pat_enc
WHERE CONTACT_DATE IS NOT NULL
ORDER BY CONTACT_DATE DESC
LIMIT 5;
</example-query>

Congratulations! You just queried an Epic EHI database. Those numbers you see? **PAT_ENC_CSN_ID** is the Contact Serial Number—Epic's unique identifier for each encounter. **ENC_CLOSED_YN** tells you whether the encounter documentation is complete ('Y' for yes).

### How This Interactive Environment Works

Our playground runs on a complete Epic EHI export loaded into SQLite, accessible directly in your browser. Here's what makes it special:

1. **Real Data Structure**: All 551 tables from an actual Epic export
2. **Complete Documentation**: The `_metadata` table contains Epic's official documentation
3. **Instant Feedback**: See results immediately, no waiting
4. **Safe Exploration**: Read-only access means you can't break anything

### Your First Data Exploration

Let's dig deeper. Epic stores timestamps in a specific format. Run this query to see how dates work:

<example-query description="Understanding Epic's date formats">
SELECT 
    CONTACT_DATE,
    -- Extract just the date part
    SUBSTR(CONTACT_DATE, 1, 10) as date_only,
    -- Count encounters by date
    COUNT(*) as encounters_on_date
FROM pat_enc
WHERE CONTACT_DATE IS NOT NULL
GROUP BY date_only
ORDER BY encounters_on_date DESC
LIMIT 5;
</example-query>

Notice the date format: `M/D/YYYY 12:00:00 AM`. This is Epic's standard—all dates include a midnight timestamp, even when only the date matters.

### Editing and Experimenting

Every query box is fully editable. Try modifying the previous query:
- Change `LIMIT 5` to `LIMIT 10` to see more results
- Add `WHERE YEAR(CONTACT_DATE) = 2023` to filter by year
- Remove the `GROUP BY` to see individual encounters

Don't worry about making mistakes—you can always reset to the original query.

### Understanding Query Results

When you run a query, you'll see:
- **Column Headers**: The field names from your SELECT statement
- **Data Rows**: The actual values from the database
- **Row Count**: How many records your query returned
- **Execution Time**: How long the query took (usually milliseconds)

### Power User Tips

**1. Use Comments for Learning**
```sql
-- Comments help explain what's happening
SELECT 
    PAT_ID,           -- Patient identifier
    COUNT(*) as visits -- Total encounters
FROM pat_enc
GROUP BY PAT_ID;
```

**2. Explore Schema While Querying**
```sql
-- See all columns in a table
PRAGMA table_info(pat_enc);
```

**3. Check Data Quality**
```sql
-- Find NULL values
SELECT COUNT(*) as total,
       COUNT(CONTACT_DATE) as with_date,
       COUNT(*) - COUNT(CONTACT_DATE) as missing_date
FROM pat_enc;
```

### Common Patterns You'll Use

Throughout this book, you'll see these query patterns repeatedly:

<example-query description="Pattern 1: Join patient data with encounters">
SELECT 
    p.PAT_NAME,
    p.BIRTH_DATE,
    COUNT(e.PAT_ENC_CSN_ID) as total_encounters
FROM PATIENT p
LEFT JOIN pat_enc e ON p.PAT_ID = e.PAT_ID
GROUP BY p.PAT_ID, p.PAT_NAME, p.BIRTH_DATE;
</example-query>

<example-query description="Pattern 2: Find tables by keyword using metadata">
SELECT 
    table_name,
    column_name,
    documentation
FROM _metadata
WHERE table_name = 'PATIENT'
  AND column_name IN ('PAT_ID', 'PAT_MRN_ID', 'BIRTH_DATE')
</example-query>

### When Things Go Wrong

Errors are part of learning. Here are common issues and fixes:

1. **"No such column" error**: Check spelling and use `PRAGMA table_info()` to see available columns
2. **Empty results**: Your WHERE clause might be too restrictive
3. **Too many results**: Add a LIMIT clause to manage output
4. **Syntax errors**: SQLite uses standard SQL—check for missing commas or quotes

### Your Learning Path

As you progress through this book:
- **Try every query**: Don't just read—execute and observe
- **Modify examples**: Change filters, add columns, experiment
- **Build intuition**: Notice patterns in table names and relationships
- **Ask questions**: Use the `_metadata` table (next chapter) to answer them

The beauty of this approach? You're not learning about a theoretical database—you're actively querying the same Epic EHI structure used by thousands of healthcare organizations worldwide.

---

### Key Takeaways

- Every SQL example in this book is executable in your browser against real Epic EHI data
- The interactive environment provides immediate feedback with no setup required
- Epic's date format includes timestamps even for date-only fields: `M/D/YYYY 12:00:00 AM`
- Experimentation is encouraged—you can't break anything in this read-only environment
- Common patterns include joining patient data, searching metadata, and handling Epic's specific data formats