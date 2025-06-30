# Capturing Clinical Measurements Through Flowsheets

*Purpose: Learn how Epic's flowsheet system captures vital signs, assessments, and clinical measurements using a flexible template-based architecture.*

### Understanding Flowsheets

Flowsheets capture discrete clinical data like vital signs, pain scores, and nursing assessments. Epic uses templates to define what can be measured and stores the actual values separately.

### Basic Vital Signs

Start with common vital signs:

<example-query description="View recent vital signs">
SELECT 
    fm.TEMPLATE_ID_FLO_MEAS_NAME as Measurement,
    ip.MEAS_VALUE as Value,
    SUBSTR(ip.RECORDED_TIME, 1, 16) as Recorded_Time
FROM IP_FLWSHT_MEAS ip
JOIN FLOWSHEET_MEAS fm ON ip.TEMPLATE_ID = fm.TEMPLATE_ID
WHERE ip.PAT_ID = 'Z7004242'
  AND fm.TEMPLATE_ID_FLO_MEAS_NAME IN ('Blood Pressure', 'Pulse', 'Temperature', 'Weight', 'Height')
ORDER BY ip.RECORDED_TIME DESC
LIMIT 20;
</example-query>

### Blood Pressure Details

See systolic and diastolic values:

<example-query description="Track blood pressure readings">
SELECT 
    SUBSTR(ip.RECORDED_TIME, 1, 10) as Date,
    fm.TEMPLATE_ID_FLO_MEAS_NAME as Vital,
    ip.MEAS_VALUE as Value,
    fm.UNITS as Unit
FROM IP_FLWSHT_MEAS ip
JOIN FLOWSHEET_MEAS fm ON ip.TEMPLATE_ID = fm.TEMPLATE_ID
WHERE ip.PAT_ID = 'Z7004242'
  AND fm.TEMPLATE_ID_FLO_MEAS_NAME LIKE '%Blood Pressure%'
ORDER BY ip.RECORDED_TIME DESC
LIMIT 10;
</example-query>

### Pain Assessment

Track pain scores over time:

<example-query description="View pain assessments">
SELECT 
    fm.TEMPLATE_ID_FLO_MEAS_NAME as Assessment,
    ip.MEAS_VALUE as Score,
    SUBSTR(ip.RECORDED_TIME, 1, 16) as Time,
    ip.ENTRY_USER_ID_NAME as Recorded_By
FROM IP_FLWSHT_MEAS ip
JOIN FLOWSHEET_MEAS fm ON ip.TEMPLATE_ID = fm.TEMPLATE_ID
WHERE ip.PAT_ID = 'Z7004242'
  AND UPPER(fm.TEMPLATE_ID_FLO_MEAS_NAME) LIKE '%PAIN%'
ORDER BY ip.RECORDED_TIME DESC;
</example-query>

### All Available Measurements

See what measurements exist for a patient:

<example-query description="List all flowsheet measurements">
SELECT DISTINCT
    fm.TEMPLATE_ID_FLO_MEAS_NAME as Measurement,
    fm.DISP_NAME as Display_Name,
    COUNT(*) as Times_Recorded
FROM IP_FLWSHT_MEAS ip
JOIN FLOWSHEET_MEAS fm ON ip.TEMPLATE_ID = fm.TEMPLATE_ID
WHERE ip.PAT_ID = 'Z7004242'
GROUP BY fm.TEMPLATE_ID_FLO_MEAS_NAME, fm.DISP_NAME
ORDER BY Times_Recorded DESC;
</example-query>

### Measurement Context

See who recorded measurements and where:

<example-query description="View measurement context">
SELECT 
    fm.TEMPLATE_ID_FLO_MEAS_NAME as Measurement,
    ip.MEAS_VALUE as Value,
    SUBSTR(ip.RECORDED_TIME, 1, 16) as When_Recorded,
    ip.ENTRY_USER_ID_NAME as Who_Recorded,
    pe.DEPARTMENT_ID_DEPARTMENT_NAME as Where_Recorded
FROM IP_FLWSHT_MEAS ip
JOIN FLOWSHEET_MEAS fm ON ip.TEMPLATE_ID = fm.TEMPLATE_ID
LEFT JOIN PAT_ENC pe ON ip.PAT_ENC_CSN_ID = pe.PAT_ENC_CSN_ID
WHERE ip.PAT_ID = 'Z7004242'
ORDER BY ip.RECORDED_TIME DESC
LIMIT 10;
</example-query>

### Key Tables Summary

**Core Tables:**
- `IP_FLWSHT_MEAS` - Actual measurements
- `FLOWSHEET_MEAS` - Template definitions
- `IP_FLWSHT_REC` - Flowsheet records (groups measurements)

**Key Fields:**
- `TEMPLATE_ID` - What type of measurement
- `MEAS_VALUE` - The actual value
- `RECORDED_TIME` - When it was captured
- `PAT_ENC_CSN_ID` - Links to encounter

### Common Measurements

- Vital signs (BP, pulse, temp, respirations)
- Pain scores and assessments
- Intake/output volumes
- Blood glucose readings
- Weight and height
- Oxygen saturation

### Common Pitfalls

1. **String Values**: MEAS_VALUE is text, may need conversion
2. **Multiple Templates**: Same concept might have multiple template IDs
3. **Unit Variations**: Check UNITS field for proper interpretation
4. **Time Precision**: RECORDED_TIME includes seconds

### Summary

Epic's flowsheet system provides:
- Flexible clinical data capture
- Template-based standardization
- Complete audit trail
- Integration with clinical workflows

Understanding flowsheets enables:
- Clinical trending analysis
- Quality measure calculation
- Nursing documentation review
- Research data extraction