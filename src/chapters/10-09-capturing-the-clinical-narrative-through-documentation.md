# Capturing the Clinical Narrative Through Documentation

*Purpose: Learn how Epic stores clinical notes, external documents, and narrative text that tells the patient's story beyond structured data.*

### The Power of Clinical Narrative

While structured data captures facts, clinical notes tell the story. Epic's documentation system preserves the nuanced clinical thinking that guides patient care.

### Finding Clinical Notes

Start by exploring what notes exist:

<example-query description="View available note types">
SELECT DISTINCT
    ni.NOTE_TYPE_C_NAME as Note_Type,
    COUNT(*) as Note_Count
FROM HNO_NOTE_TEXT nt
JOIN HNO_INFO ni ON nt.NOTE_ID = ni.NOTE_ID
GROUP BY ni.NOTE_TYPE_C_NAME
ORDER BY Note_Count DESC;
</example-query>

### Viewing Note Metadata

See basic information about notes:

<example-query description="View recent notes metadata">
SELECT 
    ni.NOTE_ID,
    ni.NOTE_TYPE_C_NAME as Type,
    SUBSTR(ni.SPEC_NOTE_TIME_DTTM, 1, 10) as Note_Date,
    ni.AUTHOR_PROV_ID_PROV_NAME as Author,
    ni.NOTE_STATUS_C_NAME as Status
FROM HNO_INFO ni
WHERE ni.PAT_ID = 'Z7004242'
ORDER BY ni.SPEC_NOTE_TIME_DTTM DESC
LIMIT 10;
</example-query>

### Reading Note Text

Access the actual narrative content:

<example-query description="Read note content">
SELECT 
    ni.NOTE_TYPE_C_NAME as Note_Type,
    SUBSTR(ni.SPEC_NOTE_TIME_DTTM, 1, 10) as Date,
    nt.PLAIN_TEXT as Note_Text
FROM HNO_INFO ni
JOIN HNO_NOTE_TEXT nt ON ni.NOTE_ID = nt.NOTE_ID
WHERE ni.PAT_ID = 'Z7004242'
  AND ni.DELETE_INSTANT_DTTM IS NULL
  AND LENGTH(nt.PLAIN_TEXT) > 100
ORDER BY ni.SPEC_NOTE_TIME_DTTM DESC
LIMIT 1;
</example-query>

### External Documents

Epic also stores scanned documents and files:

<example-query description="Find external documents">
SELECT 
    d.DOCUMENT_ID,
    d.DOC_TYPE_C_NAME as Document_Type,
    SUBSTR(d.DOC_RECV_TIME, 1, 10) as Received_Date,
    d.DOC_SOURCE_C_NAME as Source,
    d.DOC_STAT_C_NAME as Status
FROM DOC_INFORMATION d
JOIN PAT_DOC pd ON d.DOCUMENT_ID = pd.DOCUMENT_ID
WHERE pd.PAT_ID = 'Z7004242'
ORDER BY d.DOC_RECV_TIME DESC
LIMIT 10;
</example-query>

### Documentation Workflow

Track note creation and signing:

<example-query description="View note workflow status">
SELECT 
    NOTE_TYPE_C_NAME as Note_Type,
    NOTE_STATUS_C_NAME as Status,
    COUNT(*) as Count
FROM HNO_INFO
WHERE PAT_ID = 'Z7004242'
GROUP BY NOTE_TYPE_C_NAME, NOTE_STATUS_C_NAME
ORDER BY Note_Type, Status;
</example-query>

### Key Tables Summary

**Core Tables:**
- `HNO_INFO` - Note metadata (type, author, status)
- `HNO_NOTE_TEXT` - Actual note content
- `DOC_INFORMATION` - External document metadata
- `PAT_DOC` - Links documents to patients

**Key Fields:**
- `NOTE_ID` - Unique note identifier
- `DELETE_INSTANT_DTTM` - Soft delete timestamp
- `PLAIN_TEXT` - Human-readable note content
- `NOTE_STATUS_C_NAME` - Workflow status

### Privacy Note

In many EHI exports, note content may be:
- Deleted for privacy (DELETE_INSTANT_DTTM populated)
- Redacted or limited
- Subject to special access controls

### Common Pitfalls

1. **Deleted Notes**: Check DELETE_INSTANT_DTTM for soft deletes
2. **Large Text**: PLAIN_TEXT can be very long, use LENGTH() checks
3. **Multiple Tables**: Notes split across HNO_INFO and HNO_NOTE_TEXT
4. **Status Values**: Various statuses indicate workflow state

### Summary

Epic's documentation system provides:
- Comprehensive clinical narrative storage
- Support for multiple note types
- External document management
- Workflow tracking from draft to signed

Understanding documentation tables enables:
- Clinical research and NLP
- Quality review processes
- Compliance auditing
- Care coordination