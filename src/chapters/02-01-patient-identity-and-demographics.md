---
# Chapter 2.1: Patient Identity and Demographics

*Purpose: To master Epic's comprehensive model for capturing who patients are—from unique identifiers to demographics, addresses, and provider relationships.*

### The Foundation of Everything

Before any diagnosis is made or medication prescribed, the healthcare system must answer a fundamental question: Who is this person? Epic's patient data model provides a comprehensive answer, spanning multiple tables that capture identity, demographics, contact information, and care relationships.

<example-query description="Explore the core patient record">
SELECT 
    PAT_ID,
    PAT_MRN_ID,
    PAT_NAME,
    BIRTH_DATE,
    SEX_C_NAME_
FROM PATIENT;
</example-query>

This single row represents the starting point for all clinical data. But Epic's patient model extends far beyond these basics.

### The Master Patient Table

The **`PATIENT`** table serves as the central hub for demographic data:

<example-query description="View the comprehensive patient master documentation">
SELECT documentation
FROM _metadata
WHERE table_name = 'PATIENT' 
  AND column_name IS NULL
</example-query>

With 86 columns in the main table alone, Epic captures everything from basic demographics to care preferences. But that's just the beginning.

### Understanding Patient Identifiers

Epic uses two distinct identifier systems, each serving a critical purpose:

<example-query description="Compare internal and external patient identifiers">
SELECT 
    PAT_ID,
    PAT_MRN_ID,
    -- Extract the prefix patterns
    SUBSTR(PAT_ID, 1, 1) as pat_id_prefix,
    SUBSTR(PAT_MRN_ID, 1, 3) as mrn_prefix
FROM PATIENT;
</example-query>

**PAT_ID** (Patient ID):
- Internal database identifier
- Immutable—never changes
- Used for all table relationships
- Format: Alphanumeric with system prefix (e.g., "Z7004242")

**PAT_MRN_ID** (Medical Record Number):
- Human-facing identifier
- Appears on wristbands and documents
- Can be facility-specific
- Format: Often includes location prefix (e.g., "APL324672")

<example-query description="Prove PAT_ID is the universal foreign key">
SELECT 
    table_name,
    COUNT(*) as tables_with_pat_id
FROM _metadata
WHERE column_name = 'PAT_ID'
  AND table_name != 'PATIENT'
GROUP BY table_name
ORDER BY table_name
LIMIT 10
</example-query>

### Modeling Patient Names

Epic stores names in multiple formats to support different use cases:

<example-query description="Examine the multiple name storage formats">
SELECT 
    PAT_NAME,
    PAT_FIRST_NAME,
    PAT_MIDDLE_NAME,
    PAT_LAST_NAME
FROM PATIENT;
</example-query>

The system maintains:
- **PAT_NAME**: Formatted as "LASTNAME,FIRSTNAME MI"
- **Component fields**: Separate first, middle, and last names
- **Alternative names**: Stored in the PATIENT_ALIAS table

<example-query description="Explore patient aliases and alternative names">
SELECT 
    p.PAT_NAME as primary_name,
    a.LINE,
    a.ALIAS_ as alternative_name
FROM PATIENT p
LEFT JOIN PATIENT_ALIAS a ON p.PAT_ID = a.PAT_ID
ORDER BY a.LINE;
</example-query>

### Race and Ethnicity: Different Models

Epic models race and ethnicity differently, reflecting federal reporting requirements:

<example-query description="Compare race and ethnicity storage patterns">
-- Race: Stored in separate table (supports multiple selections)
SELECT 
    'Race' as data_type,
    pr.LINE,
    pr.PATIENT_RACE_C_NAME_ as value
FROM PATIENT_RACE pr
WHERE pr.PAT_ID = 'Z7004242'

UNION ALL

-- Ethnicity: Stored directly in PATIENT table (single selection)
SELECT 
    'Ethnicity' as data_type,
    1 as line,
    p.ETHNIC_GROUP_C_NAME as value
FROM PATIENT p
WHERE p.PAT_ID = 'Z7004242'
ORDER BY data_type, line;
</example-query>

This design reflects the federal distinction:
- **Race**: Multiple selections allowed (separate table with LINE pattern)
- **Ethnicity**: Single selection (Hispanic/Latino or Not)

### The Complex Address Model

Patient addresses demonstrate Epic's sophisticated approach to contact information:

<example-query description="Understand the three-tier address system">
-- Permanent address components in PATIENT table
SELECT 
    'Permanent' as address_type,
    CITY,
    STATE_C_NAME,
    ZIP,
    COUNTY_C_NAME
FROM PATIENT
WHERE PAT_ID = 'Z7004242'

UNION ALL

-- Temporary address fields (if populated)
SELECT 
    'Temporary' as address_type,
    TMP_CITY,
    TMP_STATE_C_NAME,
    TMP_ZIP,
    TMP_COUNTY_C_NAME
FROM PATIENT
WHERE PAT_ID = 'Z7004242' 
  AND TMP_CITY IS NOT NULL;
</example-query>

Street addresses require joining to PAT_ADDRESS:

<example-query description="Get complete address with street lines">
SELECT 
    p.CITY,
    p.STATE_C_NAME,
    p.ZIP,
    pa.LINE,
    pa.ADDRESS_ as street_line
FROM PATIENT p
LEFT JOIN PAT_ADDRESS pa ON p.PAT_ID = pa.PAT_ID
ORDER BY pa.LINE;
</example-query>

### Language Preferences

Epic tracks multiple language preferences for different contexts:

<example-query description="Explore granular language preferences">
SELECT 
    LANGUAGE_C_NAME as primary_language,
    LANG_CARE_C_NAME as care_language,
    LANG_WRIT_C_NAME as written_language,
    PREF_PCP_LANG_C_NAME as preferred_pcp_language
FROM PATIENT;
</example-query>

This granularity supports scenarios where patients:
- Speak one language but prefer written materials in another
- Want providers who speak their native language
- Need interpreters for clinical care but not for written communication

### The Overflow Table Pattern

Epic splits patient data across multiple tables to manage the 1000+ potential data elements:

<example-query description="Explore the continuation table pattern">
SELECT 
    'PATIENT' as table_name, COUNT(*) as column_count 
FROM pragma_table_info('PATIENT')
UNION ALL
SELECT 
    'PATIENT_2', COUNT(*) 
FROM pragma_table_info('PATIENT_2')
UNION ALL
SELECT 
    'PATIENT_3', COUNT(*) 
FROM pragma_table_info('PATIENT_3')
ORDER BY table_name;
</example-query>

Each overflow table serves specific purposes:

<example-query description="See specialized data in overflow tables">
-- PATIENT_2: Birth details and citizenship
SELECT 
    BIRTH_TM as birth_time,
    IS_ADOPTED_YN,
    CITIZENSHIP_C_NAME
FROM PATIENT_2
WHERE PAT_ID = 'Z7004242';
</example-query>

### Primary Care Provider Assignment

The patient's medical home is tracked through PCP assignment:

<example-query description="Examine PCP assignment and preferences">
SELECT 
    p.CUR_PCP_PROV_ID,
    p.PREF_PCP_SEX_C_NAME,
    p.PREF_PCP_SPEC_C_NAME,
    p.PREF_PCP_LANG_C_NAME
FROM PATIENT p
WHERE p.PAT_ID = 'Z7004242';
</example-query>

### What's Missing: Critical Gaps

This EHI export lacks several important elements found in full Epic systems:

**1. Gender Identity**
<example-query description="Confirm absence of gender identity fields">
SELECT column_name
FROM _metadata
WHERE table_name = 'PATIENT'
  AND (LOWER(column_name) LIKE '%gender%' 
       OR LOWER(column_name) LIKE '%sex%')
ORDER BY column_name;
</example-query>

Only biological sex is captured, not gender identity—a significant limitation for inclusive care.

**2. Patient Merge History**
<example-query description="Search for merge tracking tables">
SELECT 
    'No merge tracking tables found' as result,
    COUNT(*) as tables_checked
FROM sqlite_master 
WHERE type = 'table' 
  AND (name LIKE '%MERGE%' OR name LIKE '%DUPL%');
</example-query>

No merge history means you can't trace when duplicate records were consolidated.

**3. Test Patient Indicators**
<example-query description="Check for test patient identification">
SELECT 
    p2.RECORD_TYPE_6_C_NAME
FROM PATIENT_2 p2
WHERE p2.PAT_ID = 'Z7004242';
</example-query>

Empty values suggest real patients; test patients would have specific record types.

### Building a Complete Patient View

To construct a comprehensive patient profile, you must join multiple tables:

<example-query description="Create a complete patient demographic summary">
WITH patient_summary AS (
    SELECT 
        p.PAT_ID,
        p.PAT_MRN_ID,
        p.PAT_NAME,
        p.BIRTH_DATE,
        -- Calculate age
        CAST((julianday('now') - julianday(SUBSTR(p.BIRTH_DATE, 7, 4) || '-' || 
             PRINTF('%02d', CAST(SUBSTR(p.BIRTH_DATE, 1, INSTR(p.BIRTH_DATE, '/') - 1) AS INT)) || '-' ||
             PRINTF('%02d', CAST(SUBSTR(p.BIRTH_DATE, INSTR(p.BIRTH_DATE, '/') + 1, 2) AS INT)))) / 365.25 AS INT) as age,
        p.SEX_C_NAME_,
        p.ETHNIC_GROUP_C_NAME,
        p.LANGUAGE_C_NAME,
        p.CUR_PCP_PROV_ID
    FROM PATIENT p
)
SELECT 
    ps.*,
    -- Add race (concatenated if multiple)
    GROUP_CONCAT(pr.PATIENT_RACE_C_NAME_) as races,
    -- Add address
    pa.ADDRESS_ as street_address,
    p.CITY || ', ' || p.STATE_C_NAME || ' ' || p.ZIP as city_state_zip
FROM patient_summary ps
JOIN PATIENT p ON ps.PAT_ID = p.PAT_ID
LEFT JOIN PATIENT_RACE pr ON ps.PAT_ID = pr.PAT_ID
LEFT JOIN PAT_ADDRESS pa ON ps.PAT_ID = pa.PAT_ID AND pa.LINE = 1
GROUP BY ps.PAT_ID;
</example-query>

---

### Key Takeaways

- **PATIENT** is the master demographic table, extended by numbered overflow tables (PATIENT_2, PATIENT_3, etc.)
- **PAT_ID** is the immutable internal identifier; **PAT_MRN_ID** is the human-facing medical record number
- Names are stored both formatted (PAT_NAME) and componentized (first, middle, last)
- Race allows multiple selections (separate table); ethnicity is single selection (in PATIENT)
- Addresses use a hybrid model: city/state/zip in PATIENT, street lines in PAT_ADDRESS
- Language preferences are granular: spoken care, written materials, and provider preferences
- Critical gaps include gender identity, patient merge history, and comprehensive test patient flags

---