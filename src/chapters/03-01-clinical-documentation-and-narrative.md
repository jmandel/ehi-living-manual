# Capturing the Clinical Story: Notes and Flowsheets

*Purpose: To learn how Epic captures the complete patient story by combining unstructured clinical narratives (notes) with structured, discrete data (flowsheets).*

### Two Forms of Documentation

Clinical documentation is a tale of two data types. On one side, you have **unstructured notes**, which capture the nuanced story, context, and thinking of a clinician. On the other, you have **structured flowsheets**, which record discrete, consistent measurements like vital signs and assessments. Both are essential for a complete picture of patient care.

### The Clinical Narrative: Notes and Documents

Clinical notes are the heart of the patient's story. Epic's system stores a wide variety of note types from different authors.

<example-query description="View the different types of clinical notes available">
SELECT DISTINCT
    ni.IP_NOTE_TYPE_C_NAME as Note_Type,
    COUNT(*) as Note_Count
FROM HNO_PLAIN_TEXT nt
JOIN HNO_INFO ni ON nt.NOTE_ID = ni.NOTE_ID
GROUP BY ni.IP_NOTE_TYPE_C_NAME
ORDER BY Note_Count DESC;
</example-query>

Each note has metadata (author, time, status) and the narrative content itself, which are stored in separate tables.

<example-query description="Read the content of a recent clinical note">
SELECT 
    ni.IP_NOTE_TYPE_C_NAME as Note_Type,
    pe.CONTACT_DATE as Date,
    ni.CURRENT_AUTHOR_ID_NAME as Author,
    nt.NOTE_TEXT as Note_Text
FROM HNO_INFO ni
JOIN HNO_PLAIN_TEXT nt ON ni.NOTE_ID = nt.NOTE_ID
JOIN PAT_ENC pe ON ni.PAT_ENC_CSN_ID = pe.PAT_ENC_CSN_ID
WHERE pe.PAT_ID = 'Z7004242'
  AND LENGTH(nt.NOTE_TEXT) > 100
ORDER BY pe.PAT_ENC_DATE_REAL DESC
LIMIT 1;
</example-query>

Epic also stores external documents, such as scanned records from other facilities.

<example-query description="Find external (scanned) documents">
SELECT 
    d.DOC_INFO_ID,
    d.DOC_INFO_TYPE_C_NAME as Document_Type,
    SUBSTR(d.DOC_RECV_TIME, 1, 10) as Received_Date,
    d.DOC_STAT_C_NAME as Status
FROM DOC_INFORMATION d
JOIN DOC_LINKED_PATS dp ON d.DOC_INFO_ID = dp.DOCUMENT_ID
WHERE dp.LINKED_PAT_ID = 'Z7004242'
ORDER BY d.DOC_RECV_TIME DESC
LIMIT 10;
</example-query>

### Structured Data Capture: Flowsheets

Flowsheets are used to capture discrete clinical data in a structured, template-based format. This is where you'll find vital signs, pain scores, and other recurring assessments.

> **Note:** This EHI export appears to be missing vital signs data. The flowsheet structure is present, but the actual measurement values are not populated. This is a limitation of this particular data extract.

TODO: This query returns no results due to missing vital signs data in this EHI export
<example-query description="View a patient's recent vital signs from flowsheets">
SELECT 
    fr.FLO_MEAS_ID_DISP_NAME as Measurement,
    ip.FLO_CATEGORY_VALUE as Value,
    SUBSTR(ip.RECORDED_TIME, 1, 16) as Recorded_Time,
    ip.ENTRY_USER_ID_NAME as Entered_By
FROM IP_FLWSHT_MEAS ip
JOIN IP_FLOWSHEET_ROWS fr ON ip.FSD_ID = fr.INPATIENT_DATA_ID AND ip.LINE = fr.LINE
WHERE ip.FLO_CATEGORY_VALUE IS NOT NULL
ORDER BY ip.RECORDED_TIME DESC
LIMIT 20;
</example-query>

Flowsheets use a template system (`FLOWSHEET_MEAS`) to define what can be measured, while the actual values are stored in `IP_FLWSHT_MEAS`.

TODO: This query returns no results due to missing flowsheet data in this EHI export
<example-query description="List all flowsheet measurements recorded for a patient">
SELECT DISTINCT
    fr.FLO_MEAS_ID_DISP_NAME as Measurement,
    COUNT(DISTINCT ip.LINE) as Times_Recorded
FROM IP_FLWSHT_MEAS ip
JOIN IP_FLOWSHEET_ROWS fr ON ip.FSD_ID = fr.INPATIENT_DATA_ID
GROUP BY fr.FLO_MEAS_ID_DISP_NAME
HAVING Times_Recorded > 0
ORDER BY Times_Recorded DESC;
</example-query>

### Connecting Documentation to Encounters

Both notes and flowsheet data are linked to the encounter where they were recorded, providing essential context.

TODO: This query returns no results due to missing flowsheet data in this EHI export
<example-query description="View measurement context, including who recorded it and where">
SELECT 
    fr.FLO_MEAS_ID_DISP_NAME as Measurement,
    ip.FLO_CATEGORY_VALUE as Value,
    SUBSTR(ip.RECORDED_TIME, 1, 16) as When_Recorded,
    ip.ENTRY_USER_ID_NAME as Who_Recorded,
    fr.FLOWSHT_ROW_NAME as Row_Name
FROM IP_FLWSHT_MEAS ip
JOIN IP_FLOWSHEET_ROWS fr ON ip.FSD_ID = fr.INPATIENT_DATA_ID AND ip.LINE = fr.LINE
WHERE ip.FLO_CATEGORY_VALUE IS NOT NULL
ORDER BY ip.RECORDED_TIME DESC
LIMIT 10;
</example-query>

---

### Key Takeaways

- **Two Documentation Types**: Epic uses unstructured **notes** (`HNO_INFO`, `HNO_NOTE_TEXT`) for narrative and structured **flowsheets** (`IP_FLWSHT_MEAS`) for discrete data.
- **Note Structure**: Note metadata (author, type, status) is stored in `HNO_INFO`, while the actual text is in `HNO_PLAIN_TEXT`.
- **Flowsheet Structure**: Flowsheet rows (`IP_FLOWSHEET_ROWS`) define the measurements, and the patient-specific values are stored in `IP_FLWSHT_MEAS`.
- **External Documents**: Scanned and external files are managed in `DOC_INFORMATION`.
- **Context is Critical**: Both notes and flowsheet entries are linked to a specific encounter (`PAT_ENC_CSN_ID`), providing vital context for the documentation.
- **Data Quality**: Flowsheet values (`FLO_CATEGORY_VALUE`) are stored as text and may require conversion for analysis.

---
