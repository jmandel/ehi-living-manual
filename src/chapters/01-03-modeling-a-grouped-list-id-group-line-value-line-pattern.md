# Modeling a Grouped List: The `(ID, GROUP_LINE, VALUE_LINE)` Pattern

*Purpose: To understand Epic's elegant solution for nested lists—lists within lists.*

### When Simple Lists Aren't Enough

In the previous chapter, you mastered the `(ID, LINE)` pattern for simple lists. But what happens when you need to store groups of related items, where each group itself contains multiple values? Enter the **`(ID, GROUP_LINE, VALUE_LINE)`** pattern—Epic's solution for hierarchical data.

<example-query description="Discover tables using the grouped list pattern">
SELECT 
    table_name,
    COUNT(*) as column_count
FROM _metadata
WHERE column_name IN ('GROUP_LINE', 'VALUE_LINE')
GROUP BY table_name
HAVING COUNT(*) = 2
ORDER BY table_name;
</example-query>

### Understanding Nested Structure

Think of this pattern as a two-level hierarchy:
- **Level 1**: Groups (identified by GROUP_LINE)
- **Level 2**: Values within each group (identified by VALUE_LINE)

Let's examine a real example with patient history review:

<example-query description="See the grouped list pattern in action">
-- During an encounter, providers review different aspects of patient history
-- Each review session (GROUP_LINE) covers multiple history types (VALUE_LINE)
SELECT 
    tp.GROUP_LINE as review_session,
    tp.VALUE_LINE as item_number,
    tp.HX_REVIEWED_HEADER_ as review_location,
    ty.HX_REVIEWED_TYPE_C_NAME_ as history_type
FROM PAT_HX_REV_TOPIC tp
JOIN PAT_HX_REV_TYPE ty 
    ON tp.PAT_ENC_CSN_ID = ty.PAT_ENC_CSN_ID 
    AND tp.GROUP_LINE = ty.GROUP_LINE 
    AND tp.VALUE_LINE = ty.VALUE_LINE
WHERE tp.PAT_ENC_CSN_ID = 724623985 
    AND tp.GROUP_LINE IN (6,7)
ORDER BY tp.GROUP_LINE, tp.VALUE_LINE;
</example-query>

Notice how:
- **Group 6** represents one review session covering Alcohol, Sexual Activity, Drug Use, and Tobacco
- **Group 7** represents another review session covering the same topics
- Each group has multiple VALUE_LINEs (1-4) for different history types
- The same review location can have multiple review sessions

### The Pattern Anatomy

<example-query description="Examine the structure of a grouped list table">
SELECT 
    name as column_name,
    CASE 
        WHEN name LIKE '%_ID' THEN 'Parent identifier'
        WHEN name = 'GROUP_LINE' THEN 'Group sequence number'
        WHEN name = 'VALUE_LINE' THEN 'Item sequence within group'
        ELSE 'Data column'
    END as column_role
FROM pragma_table_info('PAT_HX_REV_TOPIC')
ORDER BY cid;
</example-query>

The composite key for these tables is always **(ID, GROUP_LINE, VALUE_LINE)**:
- **ID**: Links to the parent record
- **GROUP_LINE**: Identifies which group (1, 2, 3...)
- **VALUE_LINE**: Identifies the position within the group (1, 2, 3...)

### Real-World Applications

Let's explore where Epic uses this pattern:

<example-query description="Understand the variety of grouped list applications">
SELECT DISTINCT
    m1.table_name,
    SUBSTR(m1.documentation, 1, 80) || '...' as table_purpose
FROM _metadata m1
WHERE m1.column_name IS NULL
  AND m1.table_name IN (
    SELECT table_name
    FROM _metadata
    WHERE column_name IN ('GROUP_LINE', 'VALUE_LINE')
    GROUP BY table_name
    HAVING COUNT(*) = 2
  )
LIMIT 5;
</example-query>

Common use cases include:
- **Lab Results**: Multiple result sets from different labs, each with multiple components
- **Medication Instructions**: Multiple sig versions over time, each with multiple instruction lines
- **Patient History Reviews**: Multiple review sessions, each covering multiple topics
- **Immunization Groups**: Multiple vaccine series, each with multiple doses

### Querying Grouped Lists

Working with this pattern requires careful attention to the hierarchy:

**1. View Complete Groups**
<example-query description="Aggregate values within groups">
-- Count history types reviewed in each session
SELECT 
    PAT_ENC_CSN_ID,
    GROUP_LINE as review_session,
    COUNT(*) as history_types_reviewed,
    GROUP_CONCAT(HX_REVIEWED_TYPE_C_NAME_, ', ') as types_reviewed
FROM PAT_HX_REV_TYPE
WHERE PAT_ENC_CSN_ID = 724623985
GROUP BY PAT_ENC_CSN_ID, GROUP_LINE
HAVING COUNT(*) > 1
ORDER BY GROUP_LINE;
</example-query>

**2. Preserve Hierarchy in Results**
```sql
-- Always order by all three levels
SELECT * FROM grouped_table
ORDER BY ID, GROUP_LINE, VALUE_LINE;
```

**3. Join at the Appropriate Level**
```sql
-- Join at group level
SELECT * FROM parent p
JOIN child c ON p.ID = c.ID AND p.GROUP_LINE = c.GROUP_LINE;

-- Join at value level  
SELECT * FROM parent p
JOIN child c ON p.ID = c.ID 
    AND p.GROUP_LINE = c.GROUP_LINE 
    AND p.VALUE_LINE = c.VALUE_LINE;
```

### The Chronicles Connection

This pattern directly maps to Chronicles' nested "related multiples"—essentially lists within lists. In Chronicles, a single field can contain:
```
Group 1:
  - Value 1.1
  - Value 1.2
Group 2:
  - Value 2.1
  - Value 2.2
  - Value 2.3
```

The ETL process flattens this into rows while preserving the structure through GROUP_LINE and VALUE_LINE.

### Pattern Recognition

You can identify this pattern by:
1. Presence of both `GROUP_LINE` and `VALUE_LINE` columns
2. Primary key includes (ID, GROUP_LINE, VALUE_LINE)
3. Both LINE columns are INTEGER type
4. Both start at 1 and increment sequentially

<example-query description="Verify the numbering rules for grouped lists">
WITH line_rules AS (
    SELECT 
        'ORDER_RPTD_SIG_TEXT' as table_name,
        MIN(GROUP_LINE) as min_group,
        MAX(GROUP_LINE) as max_group,
        MIN(VALUE_LINE) as min_value,
        MAX(VALUE_LINE) as max_value
    FROM ORDER_RPTD_SIG_TEXT
    
    UNION ALL
    
    SELECT 
        'IMM_ADMIN_GROUPS',
        MIN(GROUP_LINE),
        MAX(GROUP_LINE),
        MIN(VALUE_LINE),
        MAX(VALUE_LINE)
    FROM IMM_ADMIN_GROUPS
)
SELECT * FROM line_rules;
</example-query>

### Best Practices

1. **Never assume single groups**: Even if current data shows only GROUP_LINE = 1, design queries to handle multiple groups
2. **Aggregate thoughtfully**: Decide whether to aggregate at the group or parent level
3. **Document the hierarchy**: When writing queries, comment what each level represents
4. **Test with complex data**: Simple test data may not reveal the pattern's full complexity

---

### Key Takeaways

- The `(ID, GROUP_LINE, VALUE_LINE)` pattern models nested lists—groups of related items
- 17 tables in Epic use this pattern for complex hierarchical data
- GROUP_LINE identifies groups (1, 2, 3...) while VALUE_LINE identifies items within each group
- The composite key is always (ID, GROUP_LINE, VALUE_LINE)
- This pattern is Chronicles' answer to nested data structures in a relational model
- Always query and join considering the full hierarchy to maintain data integrity