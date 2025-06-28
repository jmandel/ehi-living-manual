# Chapter 1.1: Modeling a Simple List: The `(ID, LINE)` Pattern

*Purpose: To master Epic's most fundamental pattern for representing one-to-many relationships.*

### The Pattern That Rules Them All

Open any Epic database and you'll find one pattern repeated more than any other. It appears in 275 tables—exactly half of the entire database. It's the foundation for storing everything from multiple diagnoses per encounter to multiple addresses per patient. This is the **`(ID, LINE)`** pattern.

<example-query description="Discover the prevalence of the LINE pattern">
SELECT COUNT(DISTINCT table_name) as tables_with_line_column
FROM _metadata
WHERE column_name = 'LINE';
</example-query>

### Understanding the Pattern

The `(ID, LINE)` pattern solves a universal problem: how do you store multiple related items for a single entity? In a hierarchical database like Chronicles, you simply add multiple values to the same field. But in a relational database, you need rows. The `LINE` column creates those rows while maintaining order.

Let's see it in action with patient encounter diagnoses:

<example-query description="Examine the (ID, LINE) pattern in encounter diagnoses">
SELECT 
    PAT_ENC_CSN_ID,
    LINE,
    DX_ID,
    PRIMARY_DX_YN,
    ANNOTATION
FROM PAT_ENC_DX
WHERE PAT_ENC_CSN_ID = 991225117
ORDER BY LINE;
</example-query>

Here's what each part means:
- **ID** (PAT_ENC_CSN_ID): Links all diagnoses to one encounter
- **LINE**: Orders the diagnoses (1, 2, 3...)
- Together they form a **composite key** that uniquely identifies each diagnosis

### The Critical Insight: LINE ≠ Priority

Here's a common misconception: "LINE 1 must be the primary diagnosis." Let's prove this wrong:

<example-query description="Proof that LINE does not indicate priority">
SELECT 
    PAT_ENC_CSN_ID,
    LINE,
    DX_ID,
    PRIMARY_DX_YN,
    CASE 
        WHEN PRIMARY_DX_YN = 'Y' AND LINE > 1 
        THEN '⚠️ Primary diagnosis not in LINE 1!'
        ELSE 'Normal'
    END as note
FROM PAT_ENC_DX
WHERE PRIMARY_DX_YN = 'Y' 
  AND LINE > 1
LIMIT 5;
</example-query>

As you can see, primary diagnoses can appear in any LINE position. **LINE indicates entry order, not clinical importance.** This is crucial for correct data interpretation.

### LINE Numbering Rules

Through empirical testing, we can establish Epic's LINE numbering rules:

<example-query description="Verify LINE numbering always starts at 1">
WITH line_analysis AS (
    SELECT 
        table_name,
        MIN(line) as min_line,
        MAX(line) as max_line,
        COUNT(DISTINCT line) as distinct_lines
    FROM (
        SELECT 'PAT_ENC_DX' as table_name, PAT_ENC_CSN_ID as id, LINE 
        FROM PAT_ENC_DX
        UNION ALL
        SELECT 'ALLERGY_REACTIONS', ALLERGY_ID, LINE 
        FROM ALLERGY_REACTIONS
        UNION ALL
        SELECT 'PAT_ADDRESS', PAT_ID, LINE 
        FROM PAT_ADDRESS
    )
    GROUP BY table_name, id
)
SELECT 
    table_name,
    MIN(min_line) as always_starts_at,
    MAX(max_line) as can_go_up_to,
    COUNT(*) as parent_records
FROM line_analysis
GROUP BY table_name;
</example-query>

The rules are consistent:
1. **LINE always starts at 1** (never 0)
2. **LINE increments by 1** (no gaps in sequences)
3. **LINE is always an INTEGER** data type

### Real-World Applications

The `(ID, LINE)` pattern appears everywhere in healthcare data:

<example-query description="See the variety of data using the (ID, LINE) pattern">
SELECT 
    table_name,
    SUBSTR(documentation, 1, 100) || '...' as table_purpose
FROM _metadata
WHERE column_name IS NULL
  AND table_name IN (
    SELECT DISTINCT table_name 
    FROM _metadata 
    WHERE column_name = 'LINE'
  )
ORDER BY table_name
LIMIT 10;
</example-query>

Each use case follows the same pattern:
- **Patient Addresses**: Multiple addresses per patient (home, work, billing)
- **Allergy Reactions**: Multiple reactions per allergy
- **Coverage Members**: Multiple family members per insurance plan
- **Order Diagnoses**: Multiple diagnoses justifying a single order

### Working with (ID, LINE) Data

When querying these tables, remember:

**1. Always include LINE in your ORDER BY**
```sql
-- Correct: Preserves the intended sequence
SELECT * FROM PAT_ENC_DX 
WHERE PAT_ENC_CSN_ID = 12345
ORDER BY LINE;
```

**2. Use both columns for joins**
```sql
-- When the child table also uses (ID, LINE)
SELECT * FROM parent p
JOIN child c ON p.ID = c.ID AND p.LINE = c.LINE;
```

**3. Aggregate carefully**
<example-query description="Count items per parent correctly">
SELECT 
    PAT_ENC_CSN_ID,
    COUNT(*) as diagnosis_count,
    MAX(LINE) as max_line_number,
    COUNT(CASE WHEN PRIMARY_DX_YN = 'Y' THEN 1 END) as primary_dx_count
FROM PAT_ENC_DX
GROUP BY PAT_ENC_CSN_ID
HAVING COUNT(*) > 2
LIMIT 5;
</example-query>

### The Chronicles Connection

Why does Epic use this pattern so extensively? It's a direct translation of Chronicles' **"related multiple"** concept. In Chronicles, a single field can hold multiple values. When this hierarchical data moves to relational Clarity, each value becomes a row, with LINE preserving the original sequence.

This is why you'll never see:
- LINE numbers starting at 0
- Gaps in LINE sequences (like 1, 2, 4)
- Non-integer LINE values

These would violate Chronicles' data model.

---

### Key Takeaways

- The `(ID, LINE)` pattern appears in 275 tables—half of Epic's database
- LINE always starts at 1 and increments sequentially without gaps
- **Critical**: LINE indicates entry order, NOT priority or importance
- The pattern directly translates Chronicles' "related multiple" concept to relational tables
- Always include LINE in ORDER BY clauses to preserve intended sequences
- Primary diagnoses, preferred addresses, etc. can appear at any LINE position