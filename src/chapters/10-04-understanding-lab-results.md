# Understanding Epic's Lab Results: From Order to Interpretation

*Discover how Epic tracks laboratory tests through a sophisticated system that balances clinical needs, standardization requirements, and performance across millions of results.*

## The Laboratory Data Challenge

Lab results in Epic involve three main tables:
1. **ORDER_PROC** - The lab order itself
2. **ORDER_RESULTS** - Individual test results
3. **CLARITY_COMPONENT** - What was measured

Let's start with the basics and build up.

## Starting Our Investigation: Finding Lab Orders

Our patient Z7004242 has an extensive laboratory history. Let's begin by discovering what tests have been ordered:

<example-query description="Count and categorize all diagnostic orders">
SELECT 
    ORDER_TYPE_C_NAME,
    COUNT(*) as ORDER_COUNT
FROM ORDER_PROC
WHERE PAT_ID = 'Z7004242'
GROUP BY ORDER_TYPE_C_NAME
ORDER BY ORDER_COUNT DESC;
</example-query>

This reveals our patient has lab orders, imaging studies, and referrals. The ORDER_PROC table serves as the central hub for all diagnostic activities - a design choice that simplifies order management across departments.

## Exploring Laboratory Orders

Let's focus specifically on laboratory tests:

<example-query description="View recent completed lab orders">
SELECT 
    ORDER_PROC_ID,
    DESCRIPTION,
    ORDERING_DATE,
    RESULT_TIME,
    JULIANDAY(RESULT_TIME) - JULIANDAY(ORDERING_DATE) as TURNAROUND_DAYS
FROM ORDER_PROC
WHERE PAT_ID = 'Z7004242'
  AND ORDER_TYPE_C_NAME = 'Lab'
  AND ORDER_STATUS_C_NAME = 'Completed'
ORDER BY ORDERING_DATE DESC
LIMIT 5;
</example-query>

Notice how Epic tracks both ordering and result times, enabling turnaround time analysis - a critical metric for laboratory operations.

## Diving into Results: The Component Model

Laboratory tests often produce multiple results. A basic metabolic panel, for instance, includes glucose, electrolytes, and kidney function markers. Epic uses a component-based model to handle this complexity:

<example-query description="Examine components of a basic metabolic panel">
SELECT 
    cc.NAME as COMPONENT,
    ore.ORD_VALUE as RESULT,
    ore.REFERENCE_LOW || '-' || ore.REFERENCE_HIGH || ' ' || ore.REFERENCE_UNIT as NORMAL_RANGE
FROM ORDER_RESULTS ore
JOIN CLARITY_COMPONENT cc ON ore.COMPONENT_ID = cc.COMPONENT_ID
WHERE ore.ORDER_PROC_ID = 772179262.0
ORDER BY ore.LINE;
</example-query>

Each component represents a distinct measurement, stored with its own reference range and units. This granular approach enables precise clinical decision support and trending.

## Understanding Reference Ranges and Flags

Epic automatically evaluates results against reference ranges:

<example-query description="Find abnormal results with clinical context">
SELECT 
    cc.NAME as TEST,
    ore.ORD_VALUE || ' ' || ore.REFERENCE_UNIT as RESULT,
    ore.REFERENCE_LOW || '-' || ore.REFERENCE_HIGH as NORMAL_RANGE,
    ore.RESULT_FLAG_C_NAME as FLAG
FROM ORDER_RESULTS ore
JOIN CLARITY_COMPONENT cc ON ore.COMPONENT_ID = cc.COMPONENT_ID
WHERE ore.ORDER_PROC_ID = 772179262.0
  AND ore.RESULT_FLAG_C_NAME IS NOT NULL
ORDER BY ore.LINE;
</example-query>

The RESULT_FLAG_C_NAME field provides immediate visual cues to clinicians - "High", "Low", or more urgent "Critical High" values that require immediate attention.

## The Power of LOINC Standardization

LOINC (Logical Observation Identifiers Names and Codes) provides universal identification for laboratory tests. Let's explore how Epic implements this standard:

<example-query description="View LOINC codes for lipid panel components">
SELECT 
    cc.NAME as COMPONENT,
    ore.ORD_VALUE || ' ' || ore.REFERENCE_UNIT as RESULT,
    lnc.LNC_CODE,
    lnc.LNC_LONG_NAME
FROM ORDER_RESULTS ore
JOIN CLARITY_COMPONENT cc ON ore.COMPONENT_ID = cc.COMPONENT_ID
LEFT JOIN LNC_DB_MAIN lnc ON ore.COMPON_LNC_ID = lnc.RECORD_ID
WHERE ore.ORDER_PROC_ID = 945468371.0
  AND ore.COMPON_LNC_ID IS NOT NULL
ORDER BY ore.LINE;
</example-query>

LOINC codes like "2093-3" for cholesterol enable seamless data exchange between healthcare systems and support population health analytics across institutions.

## Tracking Trends: Diabetes Monitoring

One of the most powerful features of structured lab data is the ability to track values over time. Let's examine our patient's diabetes monitoring:

<example-query description="Track Hemoglobin A1C values over time">
SELECT 
    op.ORDERING_DATE,
    ore.ORD_VALUE as A1C_PERCENT,
    ore.REFERENCE_HIGH as GOAL,
    CASE 
        WHEN ore.ORD_NUM_VALUE < 5.7 THEN 'Normal'
        WHEN ore.ORD_NUM_VALUE < 6.5 THEN 'Prediabetes'
        ELSE 'Diabetes'
    END as INTERPRETATION
FROM ORDER_PROC op
JOIN ORDER_RESULTS ore ON op.ORDER_PROC_ID = ore.ORDER_PROC_ID
JOIN CLARITY_COMPONENT cc ON ore.COMPONENT_ID = cc.COMPONENT_ID
WHERE op.PAT_ID = 'Z7004242'
  AND cc.NAME = 'HEMOGLOBIN A1C'
  AND op.ORDER_STATUS_C_NAME = 'Completed'
ORDER BY op.ORDERING_DATE;
</example-query>

This trending capability transforms isolated lab values into a clinical narrative, showing disease progression or treatment effectiveness.

## Complex Results: Lipid Panels

Lipid panels demonstrate Epic's handling of related results that require collective interpretation:

<example-query description="Analyze complete lipid profile with risk calculations">
SELECT 
    cc.NAME as LIPID_COMPONENT,
    ore.ORD_VALUE as VALUE,
    ore.REFERENCE_UNIT as UNIT,
    CASE 
        WHEN cc.NAME = 'CHOLESTEROL' AND ore.ORD_NUM_VALUE > 200 THEN 'Elevated - Consider treatment'
        WHEN cc.NAME = 'LDL, CALCULATED' AND ore.ORD_NUM_VALUE > 130 THEN 'Above optimal'
        WHEN cc.NAME = 'HDL' AND ore.ORD_NUM_VALUE < 40 THEN 'Low - Cardiovascular risk'
        WHEN cc.NAME = 'TRIGLYCERIDES' AND ore.ORD_NUM_VALUE > 150 THEN 'Elevated'
        ELSE 'Within normal limits'
    END as CLINICAL_SIGNIFICANCE
FROM ORDER_RESULTS ore
JOIN CLARITY_COMPONENT cc ON ore.COMPONENT_ID = cc.COMPONENT_ID
WHERE ore.ORDER_PROC_ID = 945468371.0
ORDER BY 
    CASE cc.NAME
        WHEN 'CHOLESTEROL' THEN 1
        WHEN 'TRIGLYCERIDES' THEN 2
        WHEN 'HDL' THEN 3
        WHEN 'LDL, CALCULATED' THEN 4
        ELSE 5
    END;
</example-query>

The calculated values (like LDL) show how Epic can derive results from other components, maintaining the relationships needed for clinical interpretation.

## Discovering All Test Components

Epic's component system allows incredible flexibility. Let's explore what types of tests are available:

<example-query description="Find common test components in the system">
SELECT 
    NAME,
    COUNT(*) as TIMES_ORDERED
FROM CLARITY_COMPONENT cc
WHERE EXISTS (
    SELECT 1 FROM ORDER_RESULTS ore 
    WHERE ore.COMPONENT_ID = cc.COMPONENT_ID
)
GROUP BY NAME
ORDER BY TIMES_ORDERED DESC
LIMIT 15;
</example-query>

This reveals the most frequently ordered tests - typically basic metabolic components, complete blood count elements, and common chemistry tests.

## Critical Values: When Results Demand Action

Healthcare organizations define critical values that require immediate clinical attention:

<example-query description="Identify abnormal lab results requiring attention">
SELECT 
    SUBSTR(op.ORDERING_DATE, 1, 10) as ORDER_DATE,
    op.DESCRIPTION as TEST,
    cc.NAME as COMPONENT,
    ore.ORD_VALUE || ' ' || ore.REFERENCE_UNIT as RESULT,
    ore.RESULT_FLAG_C_NAME as FLAG,
    CASE ore.RESULT_FLAG_C_NAME
        WHEN 'High' THEN 'Above normal range'
        WHEN 'Low' THEN 'Below normal range'
        WHEN 'Abnormal' THEN 'Outside reference range'
        ELSE 'Clinical review needed'
    END as INTERPRETATION
FROM ORDER_PROC op
JOIN ORDER_RESULTS ore ON op.ORDER_PROC_ID = ore.ORDER_PROC_ID
JOIN CLARITY_COMPONENT cc ON ore.COMPONENT_ID = cc.COMPONENT_ID
WHERE op.PAT_ID = 'Z7004242'
  AND ore.RESULT_FLAG_C_NAME IS NOT NULL
  AND ore.RESULT_FLAG_C_NAME NOT IN ('Normal', 'No Range')
ORDER BY op.ORDERING_DATE DESC
LIMIT 10;
</example-query>

This query helps identify results that require clinical review, even if they're not at critical levels.

## Laboratory Quality: The Finalization Process

Epic tracks who reviews and finalizes results, supporting laboratory accreditation requirements:

<example-query description="Check result finalization status">
SELECT 
    op.ORDER_PROC_ID,
    op.DESCRIPTION,
    ore.RESULT_STATUS_C_NAME,
    COUNT(DISTINCT ore.COMPONENT_ID) as COMPONENT_COUNT,
    COUNT(DISTINCT fp.FINALIZE_PROV_ID) as FINALIZING_PROVIDERS
FROM ORDER_PROC op
JOIN ORDER_RESULTS ore ON op.ORDER_PROC_ID = ore.ORDER_PROC_ID
LEFT JOIN FINALIZE_PHYSICIAN fp ON op.ORDER_PROC_ID = fp.ORDER_ID
WHERE op.PAT_ID = 'Z7004242'
  AND op.ORDER_TYPE_C_NAME = 'Lab'
GROUP BY op.ORDER_PROC_ID, op.DESCRIPTION, ore.RESULT_STATUS_C_NAME
ORDER BY op.ORDERING_DATE DESC
LIMIT 5;
</example-query>

The RESULT_STATUS_C_NAME field tracks whether results are preliminary or final - crucial for clinical decision-making.

## Building a Complete Laboratory View

Let's combine everything we've learned into a comprehensive laboratory summary:

<example-query description="Create a complete lab summary for clinical review">
WITH recent_labs AS (
    SELECT 
        op.ORDER_PROC_ID,
        op.DESCRIPTION as TEST_NAME,
        op.ORDERING_DATE,
        cc.NAME as COMPONENT,
        ore.ORD_VALUE || ' ' || ore.REFERENCE_UNIT as RESULT,
        CASE 
            WHEN ore.RESULT_FLAG_C_NAME IS NULL THEN 'Normal'
            ELSE ore.RESULT_FLAG_C_NAME
        END as FLAG,
        lnc.LNC_CODE
    FROM ORDER_PROC op
    JOIN ORDER_RESULTS ore ON op.ORDER_PROC_ID = ore.ORDER_PROC_ID
    JOIN CLARITY_COMPONENT cc ON ore.COMPONENT_ID = cc.COMPONENT_ID
    LEFT JOIN LNC_DB_MAIN lnc ON ore.COMPON_LNC_ID = lnc.RECORD_ID
    WHERE op.PAT_ID = 'Z7004242'
      AND op.ORDER_TYPE_C_NAME = 'Lab'
      AND op.ORDER_STATUS_C_NAME = 'Completed'
      AND op.ORDERING_DATE >= date('now', '-1 year')
)
SELECT 
    TEST_NAME,
    ORDERING_DATE,
    COUNT(DISTINCT COMPONENT) as COMPONENTS,
    SUM(CASE WHEN FLAG != 'Normal' THEN 1 ELSE 0 END) as ABNORMAL_COUNT
FROM recent_labs
GROUP BY TEST_NAME, ORDERING_DATE
ORDER BY ORDERING_DATE DESC;
</example-query>

This summary view helps clinicians quickly identify which test panels need detailed review.

## Best Practices for Lab Data Analysis

**1. Always Consider the Clinical Context**
Laboratory values must be interpreted within the patient's clinical situation:

<example-query description="Get lab results with encounter context">
SELECT 
    op.ORDERING_DATE,
    pe.FIN_CLASS_C_NAME as ENCOUNTER_TYPE,
    op.DESCRIPTION,
    COUNT(ore.COMPONENT_ID) as RESULT_COUNT
FROM ORDER_PROC op
JOIN PAT_ENC pe ON op.PAT_ENC_CSN_ID = pe.PAT_ENC_CSN_ID
JOIN ORDER_RESULTS ore ON op.ORDER_PROC_ID = ore.ORDER_PROC_ID
WHERE op.PAT_ID = 'Z7004242'
  AND op.ORDER_TYPE_C_NAME = 'Lab'
GROUP BY op.ORDER_PROC_ID, op.ORDERING_DATE, pe.FIN_CLASS_C_NAME, op.DESCRIPTION
ORDER BY op.ORDERING_DATE DESC
LIMIT 10;
</example-query>

**2. Leverage LOINC for Interoperability**
When sharing data or building analytics across systems, use LOINC codes:

<example-query description="Find all glucose-related tests using LOINC">
SELECT DISTINCT
    lnc.LNC_CODE,
    lnc.LNC_LONG_NAME,
    cc.NAME as COMPONENT_NAME
FROM LNC_DB_MAIN lnc
JOIN ORDER_RESULTS ore ON lnc.RECORD_ID = ore.COMPON_LNC_ID
JOIN CLARITY_COMPONENT cc ON ore.COMPONENT_ID = cc.COMPONENT_ID
WHERE lnc.LNC_LONG_NAME LIKE '%Glucose%'
LIMIT 10;
</example-query>

**3. Understand Result Patterns**
Different test types have characteristic patterns:

<example-query description="Analyze result patterns by test type">
SELECT 
    SUBSTR(op.DESCRIPTION, 1, 20) as TEST_TYPE,
    COUNT(DISTINCT op.ORDER_PROC_ID) as ORDER_COUNT,
    AVG(component_count) as AVG_COMPONENTS_PER_ORDER,
    AVG(JULIANDAY(op.RESULT_TIME) - JULIANDAY(op.ORDERING_DATE)) as AVG_TAT_DAYS
FROM ORDER_PROC op
JOIN (
    SELECT ORDER_PROC_ID, COUNT(*) as component_count
    FROM ORDER_RESULTS
    GROUP BY ORDER_PROC_ID
) ore_counts ON op.ORDER_PROC_ID = ore_counts.ORDER_PROC_ID
WHERE op.ORDER_TYPE_C_NAME = 'Lab'
  AND op.ORDER_STATUS_C_NAME = 'Completed'
GROUP BY SUBSTR(op.DESCRIPTION, 1, 20)
ORDER BY ORDER_COUNT DESC
LIMIT 10;
</example-query>

## Key Takeaways

1. **ORDER_PROC is Universal** - All diagnostic orders (lab, imaging, etc.) flow through this single table, simplifying order management

2. **Component-Based Design** - ORDER_RESULTS stores individual test components, enabling granular analysis and flexible panel composition

3. **LOINC Integration** - International standardization through LOINC codes enables interoperability and population health analytics

4. **Reference Range Intelligence** - Each result carries its own reference range and abnormal flags, supporting immediate clinical interpretation

5. **Complete Lifecycle Tracking** - From order to finalization, Epic maintains full audit trails for quality and compliance

Understanding Epic's laboratory architecture empowers you to build sophisticated clinical analytics, quality monitoring systems, and research databases. The careful balance between flexibility and standardization reflects decades of refinement in laboratory informatics, supporting both routine clinical care and advanced population health initiatives.