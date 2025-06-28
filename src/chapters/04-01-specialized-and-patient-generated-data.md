---
# Specialized and Patient-Generated Data

*Purpose: To explore the rich datasets beyond standard encounters—where patients become active participants in their health record.*

### The Digital Front Door: MyChart

Healthcare's digital transformation is most visible in patient portals. Epic's MyChart system generates vast amounts of patient-initiated data—from secure messages to pre-visit questionnaires. This data reveals patient concerns, communication patterns, and engagement levels that traditional encounter data misses.

<example-query description="Explore the MyChart ecosystem">
SELECT 
    'MyChart Tables' as category,
    COUNT(*) as table_count,
    GROUP_CONCAT(name, ', ') as tables
FROM sqlite_master 
WHERE type = 'table' 
  AND name LIKE 'MYC_%'
  OR name LIKE '%MYC%';
</example-query>

With 20 MyChart-related tables, this represents a significant portion of the EHI export—evidence of how central patient engagement has become.

### Understanding MyChart Conversations

MyChart organizes communications into **conversations** (threads) containing multiple **messages**. This threading model mirrors modern messaging apps:

<example-query description="Trace the conversation-to-message relationship">
SELECT 
    c.THREAD_ID,
    c.SUBJECT,
    c.MYC_MSG_TYP_C_NAME as conversation_type,
    COUNT(DISTINCT cm.MESSAGE_ID) as message_count,
    -- Sample message details
    GROUP_CONCAT(
        CASE 
            WHEN m.TOFROM_PAT_C_NAME = 'From Patient' THEN 'Patient→Provider'
            ELSE 'Provider→Patient'
        END, ' | '
    ) as message_flow
FROM MYC_CONVO c
LEFT JOIN MYC_CONVO_MSGS cm ON c.THREAD_ID = cm.THREAD_ID
LEFT JOIN MYC_MESG m ON cm.MESSAGE_ID = m.MESSAGE_ID
GROUP BY c.THREAD_ID
ORDER BY message_count DESC
LIMIT 5;
</example-query>

The structure reveals:
- **MYC_CONVO**: Thread metadata (subject, type)
- **MYC_CONVO_MSGS**: Junction table linking threads to messages
- **MYC_MESG**: Individual message details

### Message Content and Privacy

Message text is stored separately, often in RTF format:

<example-query description="Examine message content storage">
SELECT 
    m.MESSAGE_ID,
    m.CREATED_TIME,
    m.TOFROM_PAT_C_NAME as direction,
    -- Check if message has RTF content
    CASE 
        WHEN rt.MESSAGE_ID IS NOT NULL THEN 'Has RTF content'
        ELSE 'No RTF content'
    END as content_status,
    -- Sample first few characters (being mindful of privacy)
    SUBSTR(rt.RTF_TXT, 1, 50) || '...' as content_preview
FROM MYC_MESG m
LEFT JOIN MYC_MESG_RTF_TEXT rt ON m.MESSAGE_ID = rt.MESSAGE_ID AND rt.LINE = 1
WHERE m.TOFROM_PAT_C_NAME = 'From Patient'
LIMIT 5;
</example-query>

The RTF (Rich Text Format) storage allows formatted text while maintaining compatibility across systems.

### Patient-Reported Outcomes (PROs)

Modern healthcare increasingly relies on patient-reported data. Epic captures this through pre-visit questionnaires:

<example-query description="Track questionnaire assignments to appointments">
SELECT 
    q.PAT_ENC_CSN_ID,
    q.CONTACT_DATE,
    q.MYC_APPT_QUESR_ID_FORM_NAME as questionnaire_name,
    q.PAT_APPT_QNR_STAT_C_NAME as completion_status,
    -- Link to actual appointment
    e.DEPARTMENT_ID,
    e.VISIT_PROV_ID
FROM MYC_APPT_QNR_DATA q
JOIN PAT_ENC e ON q.PAT_ENC_CSN_ID = e.PAT_ENC_CSN_ID
WHERE q.MYC_APPT_QUESR_ID_FORM_NAME IS NOT NULL
ORDER BY q.CONTACT_DATE DESC
LIMIT 5;
</example-query>

While our sample doesn't show completed questionnaires, the structure supports:
- Pre-visit symptom assessments
- Standardized outcome measures (PHQ-9, GAD-7)
- Post-procedure satisfaction surveys

### Referral Management

Referrals represent care coordination across providers and organizations. Epic tracks the complete referral lifecycle:

<example-query description="Analyze referral statuses and workflow">
SELECT 
    RFL_STATUS_C_NAME as referral_status,
    COUNT(*) as count,
    -- Show example specialties
    GROUP_CONCAT(DISTINCT REFD_TO_SPEC_C_NAME) as specialties
FROM REFERRAL
WHERE RFL_STATUS_C_NAME IS NOT NULL
GROUP BY RFL_STATUS_C_NAME
ORDER BY count DESC;
</example-query>

Common referral statuses include:
- **Pending**: Created but not yet processed
- **Authorized**: Insurance approved
- **Scheduled**: Appointment booked
- **Completed**: Patient seen by specialist
- **Denied**: Insurance or clinical rejection

<example-query description="Trace a complete referral">
SELECT 
    r.REFERRAL_ID,
    r.RFL_TYPE_C_NAME as type,
    r.RFL_STATUS_C_NAME as status,
    -- RFL_PRIORITY_C_NAME not in this table as priority,
    r.REFERRING_PROV_ID_REFERRING_PROV_NAM as referring_provider,
    r.REFD_TO_SPEC_C_NAME as specialty,
    -- Associated diagnoses
    d.LINE
FROM REFERRAL r
LEFT JOIN REFERRAL_DX d ON r.REFERRAL_ID = d.REFERRAL_ID
WHERE r.REFERRAL_ID = (SELECT MIN(REFERRAL_ID) FROM REFERRAL WHERE RFL_STATUS_C_NAME IS NOT NULL)
ORDER BY d.LINE;
</example-query>

### Social History: Beyond Clinical Data

Social determinants significantly impact health outcomes. Epic's **SOCIAL_HX** table captures lifestyle factors with surprising granularity:

<example-query description="Explore social history documentation">
SELECT 
    -- Substance use patterns
    TOBACCO_USER_C_NAME,
    ALCOHOL_USE_C_NAME,
    ALCOHOL_OZ_PER_WK,
    ILL_DRUG_USER_C_NAME,
    ILLICIT_DRUG_CMT,
    -- Additional details
    ILLICIT_DRUG_FREQ
FROM SOCIAL_HX
WHERE PAT_ENC_CSN_ID = (
    SELECT MIN(PAT_ENC_CSN_ID) 
    FROM SOCIAL_HX 
    WHERE TOBACCO_USER_C_NAME IS NOT NULL
);
</example-query>

Notice the combination of:
- **Categorical data**: Tobacco use status (Never/Former/Current)
- **Quantitative data**: Alcohol ounces per week
- **Free text**: Illicit drug comments

This granularity enables both structured reporting and nuanced documentation.

### Sexual History Documentation

Epic includes dedicated tables for sensitive sexual history:

<example-query description="Check sexual history data structure">
SELECT 
    table_name,
    column_name
FROM _metadata
WHERE table_name LIKE '%SEX%'
   OR column_name LIKE '%SEXUAL%'
LIMIT 10
</example-query>

### What's Missing: Notable Absences

Understanding what's NOT in the EHI export is crucial. Several specialized Epic modules are typically excluded:

<example-query description="Search for specialized modules not in EHI">
-- OpTime (Surgical)
SELECT 'OpTime/Surgical Cases' as module, 
       COUNT(*) as tables_found
FROM sqlite_master 
WHERE name LIKE '%SURGICAL_CASE%' 
   OR name LIKE '%OPTIME%'

UNION ALL

-- Clinical Trials
SELECT 'Clinical Trials/Research',
       COUNT(*)
FROM sqlite_master
WHERE name LIKE '%TRIAL%' 
   OR name LIKE '%PROTOCOL%'
   OR name LIKE '%STUDY%'

UNION ALL

-- Implant Tracking
SELECT 'Implant/Device Tracking',
       COUNT(*)
FROM sqlite_master
WHERE name LIKE '%IMPLANT%' 
   OR name LIKE '%DEVICE%'
   OR name LIKE '%UDI%';
</example-query>

These absences aren't oversights—they reflect deliberate decisions about the EHI's scope:

**OpTime (Surgical Module)**:
- Contains detailed OR workflows
- Tracks surgical teams, times, and equipment
- Often considered operational rather than part of the designated record set

**Clinical Trials Module**:
- Manages research protocols and consent
- Tracks study visits and adverse events
- May contain proprietary research data

**Device Tracking**:
- UDI (Unique Device Identifier) scanning
- Implant lot numbers and expiration dates
- May be stored in separate systems for recall management

### Working with Patient-Generated Data

When querying patient-generated data, consider:

**1. Message Threading**
```sql
-- Get full conversation context
SELECT * FROM MYC_MESG
WHERE MESSAGE_ID IN (
    SELECT MESSAGE_ID FROM MYC_CONVO_MSGS
    WHERE THREAD_ID = ?
)
ORDER BY CREATED_TIME;
```

**2. Privacy Considerations**
```sql
-- Aggregate without exposing content
SELECT 
    DATE(CREATED_TIME) as message_date,
    COUNT(*) as message_volume
FROM MYC_MESG
GROUP BY DATE(CREATED_TIME);
```

**3. Engagement Metrics**
<example-query description="Measure patient portal engagement">
WITH patient_engagement AS (
    SELECT 
        m.PAT_ID,
        COUNT(DISTINCT m.MESSAGE_ID) as messages_sent,
        COUNT(DISTINCT DATE(m.CREATED_TIME)) as active_days,
        MIN(m.CREATED_TIME) as first_message,
        MAX(m.CREATED_TIME) as last_message
    FROM MYC_MESG m
    WHERE m.TOFROM_PAT_C_NAME = 'From Patient'
    GROUP BY m.PAT_ID
)
SELECT 
    PAT_ID,
    messages_sent,
    active_days,
    ROUND(julianday(last_message) - julianday(first_message), 0) as engagement_span_days,
    ROUND(messages_sent * 1.0 / active_days, 1) as messages_per_active_day
FROM patient_engagement;
</example-query>

### The Value of Specialized Data

These specialized domains provide insights unavailable in traditional clinical data:

1. **Communication Patterns**: Message frequency and topics reveal patient concerns
2. **Social Context**: Housing status and substance use inform care planning
3. **Care Coordination**: Referral tracking improves continuity
4. **Patient Voice**: PROs capture symptoms and quality of life directly

Together, they paint a more complete picture of the patient's health journey.

---

### Key Takeaways

- MyChart data uses a threaded conversation model: MYC_CONVO → MYC_CONVO_MSGS → MYC_MESG
- Message content is stored in RTF format in MYC_MESG_RTF_TEXT with (MESSAGE_ID, LINE) keys
- Referrals track the complete lifecycle from request to completion via RFL_STATUS_C_NAME
- Social history combines categorical (TOBACCO_USER_C_NAME) and quantitative (ALCOHOL_OZ_PER_WK) data
- Specialized modules (OpTime, Trials, Devices) are typically excluded from EHI exports
- Patient-generated data requires special attention to privacy and engagement metrics
- The THREAD_ID links conversations to multiple messages, enabling full context retrieval

---