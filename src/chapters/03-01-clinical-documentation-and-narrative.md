---
# Capturing the Clinical Story: External Documents

*Purpose: To learn how Epic stores external documents and narrative text that tells the patient's story beyond structured data.*

### The Clinical Narrative: External Documents

While this EHI export does not contain clinical notes or flowsheets, it does include a table for external documents. This table, `DOC_INFORMATION`, stores metadata about documents that have been scanned or received from other healthcare organizations.

<example-query description="Find external documents">
SELECT 
    d.DOCUMENT_ID,
    d.DOC_TYPE_C_NAME as Document_Type,
    SUBSTR(d.DOC_RECV_TIME, 1, 10) as Received_Date,
    d.DOC_SOURCE_C_NAME as Source,
    d.DOC_STAT_C_NAME as Status
FROM DOC_INFORMATION d
ORDER BY d.DOC_RECV_TIME DESC
LIMIT 10;
</example-query>

### Key Takeaways

- **External Documents**: Scanned and external files are managed in `DOC_INFORMATION`.
- **Missing Data**: This EHI export does not contain clinical notes (`HNO_INFO`, `HNO_NOTE_TEXT`) or flowsheet data (`IP_FLWSHT_MEAS`, `FLOWSHEET_MEAS`).

---