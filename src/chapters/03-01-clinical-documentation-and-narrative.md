---
# Capturing the Clinical Story: Notes and Flowsheets

*Purpose: To learn how Epic captures the complete patient story by combining unstructured clinical narratives (notes) with structured, discrete data (flowsheets).*

### Two Forms of Documentation

Clinical documentation is a tale of two data types. On one side, you have **unstructured notes**, which capture the nuanced story, context, and thinking of a clinician. On the other, you have **structured flowsheets**, which record discrete, consistent measurements like vital signs and assessments. Both are essential for a complete picture of patient care.

### The Clinical Narrative: Notes and Documents

Clinical notes are the heart of the patient's story. Epic's system stores a wide variety of note types from different authors.

<example-query description="View the different types of clinical notes available">
SELECT DISTINCT
    ni.NOTE_TYPE_C_NAME as Note_Type,
    COUNT(*) as Note_Count
FROM HNO_NOTE_TEXT nt
JOIN HNO_INFO ni ON nt.NOTE_ID = ni.NOTE_ID
GROUP BY ni.NOTE_TYPE_C_NAME
ORDER BY Note_Count DESC;
</example-query>

Each note has metadata (author, time, status) and the narrative content itself, which are stored in separate tables.

<example-query description="Read the content of a recent clinical note">
SELECT 
    ni.NOTE_TYPE_C_NAME as Note_Type,
    SUBSTR(ni.SPEC_NOTE_TIME_DTTM, 1, 10) as Date,
    ni.AUTHOR_PROV_ID_PROV_NAME as Author,
    nt.PLAIN_TEXT as Note_Text
FROM HNO_INFO ni
JOIN HNO_NOTE_TEXT nt ON ni.NOTE_ID = nt.NOTE_ID
WHERE ni.PAT_ID = 'Z7004242'
  AND ni.DELETE_INSTANT_DTTM IS NULL
  AND LENGTH(nt.PLAIN_TEXT) > 100
ORDER BY ni.SPEC_NOTE_TIME_DTTM DESC
LIMIT 1;
</example-query>

Epic also stores external documents, such as scanned records from other facilities.

<example-query description="Find external (scanned) documents">
SELECT 
    d.DOCUMENT_ID,
    d.DOC_TYPE_C_NAME as Document_Type,
    SUBSTR(d.DOC_RECV_TIME, 1, 10) as Received_Date,
    d.DOC_SOURCE_C_NAME as Source
FROM DOC_INFORMATION d
JOIN PAT_DOC pd ON d.DOCUMENT_ID = pd.DOCUMENT_ID
WHERE pd.PAT_ID = 'Z7004242'
ORDER BY d.DOC_RECV_TIME DESC
LIMIT 10;
</example-query>

### Structured Data Capture: Flowsheets

Flowsheets are used to capture discrete clinical data in a structured, template-based format. This is where you'll find vital signs, pain scores, and other recurring assessments.

<example-query description="View a patient's recent vital signs from flowsheets">
SELECT 
    fm.TEMPLATE_ID_FLO_MEAS_NAME as Measurement,
    ip.MEAS_VALUE as Value,
    fm.UNITS,
    SUBSTR(ip.RECORDED_TIME, 1, 16) as Recorded_Time
FROM IP_FLWSHT_MEAS ip
JOIN FLOWSHEET_MEAS fm ON ip.TEMPLATE_ID = fm.TEMPLATE_ID
WHERE ip.PAT_ID = 'Z7004242'
  AND fm.TEMPLATE_ID_FLO_MEAS_NAME IN ('Blood Pressure', 'Pulse', 'Temperature', 'Weight', 'Height', 'Pain Screen')
ORDER BY ip.RECORDED_TIME DESC
LIMIT 20;
</example-query>

Flowsheets use a template system (`FLOWSHEET_MEAS`) to define what can be measured, while the actual values are stored in `IP_FLWSHT_MEAS`.

<example-query description="List all flowsheet measurements recorded for a patient">
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

### Connecting Documentation to Encounters

Both notes and flowsheet data are linked to the encounter where they were recorded, providing essential context.

<example-query description="View measurement context, including who recorded it and where">
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

---

### Key Takeaways

- **Two Documentation Types**: Epic uses unstructured **notes** (`HNO_INFO`, `HNO_NOTE_TEXT`) for narrative and structured **flowsheets** (`IP_FLWSHT_MEAS`) for discrete data.
- **Note Structure**: Note metadata (author, type, status) is stored in `HNO_INFO`, while the actual text is in `HNO_NOTE_TEXT`.
- **Flowsheet Structure**: Flowsheet templates (`FLOWSHEET_MEAS`) define the measurements, and the patient-specific values are stored in `IP_FLWSHT_MEAS`.
- **External Documents**: Scanned and external files are managed in `DOC_INFORMATION`.
- **Context is Critical**: Both notes and flowsheet entries are linked to a specific encounter (`PAT_ENC_CSN_ID`), providing vital context for the documentation.
- **Data Quality**: Flowsheet values (`MEAS_VALUE`) are stored as text and may require conversion for analysis. Always check the `UNITS` field.

---
