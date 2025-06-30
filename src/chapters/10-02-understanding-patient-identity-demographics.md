# Understanding Patient Identity & Demographics

*Purpose: Learn how Epic manages patient identity, demographics, and relationships to ensure accurate patient matching and comprehensive demographic tracking.*

### The Foundation of Healthcare Data

Every piece of clinical data connects back to a patient. Epic's patient identity system ensures we're always dealing with the right person's data.

### Basic Patient Information

Start by looking at core patient data:

<example-query description="View basic patient demographics">
SELECT 
    PAT_ID,
    PAT_NAME,
    BIRTH_DATE,
    SEX_C_NAME as Sex,
    PAT_STATUS_C_NAME as Status
FROM PATIENT
WHERE PAT_ID = 'Z7004242';
</example-query>

### Patient Identifiers

Healthcare uses multiple ID systems. Let's see how they work:

<example-query description="View patient identifiers and MRN">
SELECT 
    p.PAT_ID as Epic_ID,
    p.PAT_MRN as Medical_Record_Number,
    pi.IDENTITY_TYPE_ID_TYPE_NAME as ID_Type,
    pi.IDENTITY_ID as ID_Value
FROM PATIENT p
LEFT JOIN PAT_IDENTITY pi ON p.PAT_ID = pi.PAT_ID
WHERE p.PAT_ID = 'Z7004242'
ORDER BY pi.LINE;
</example-query>

### Contact Information

Now let's get the patient's address and phone:

<example-query description="Get patient contact information">
SELECT 
    p.ADD_LINE_1 as Address_Line_1,
    p.ADD_LINE_2 as Address_Line_2, 
    p.CITY,
    p.STATE_C_NAME as State,
    p.ZIP,
    p.HOME_PHONE,
    p.WORK_PHONE
FROM PATIENT p
WHERE p.PAT_ID = 'Z7004242';
</example-query>

### Race and Ethnicity

Epic tracks race and ethnicity following federal standards:

<example-query description="View patient race and ethnicity">
SELECT 
    pr.RACE_C_NAME as Race,
    pr.LINE as Priority
FROM PAT_RACE pr
WHERE pr.PAT_ID = 'Z7004242'
UNION ALL
SELECT 
    'Ethnicity: ' || p.ETHNIC_GROUP_C_NAME,
    0
FROM PATIENT p
WHERE p.PAT_ID = 'Z7004242'
ORDER BY Priority;
</example-query>

### Emergency Contacts

Finally, see who to contact in emergencies:

<example-query description="View emergency contacts">
SELECT 
    prl.NAME as Contact_Name,
    pr.PAT_REL_RELATION_C_NAME as Relationship,
    pr.PAT_REL_HOME_PHONE as Home_Phone,
    pr.PAT_REL_MOBILE_PHNE as Mobile_Phone
FROM PAT_RELATIONSHIPS pr
JOIN PAT_RELATIONSHIP_LIST prl ON pr.PAT_REL_RLA_ID = prl.PAT_RELATIONSHIP_ID
WHERE pr.PAT_ID = 'Z7004242'
  AND pr.PAT_REL_NOTIFY_YN = 'Y'
ORDER BY pr.LINE;
</example-query>

### Key Tables Summary

**Core Tables:**
- `PATIENT` - Main patient demographics table
- `PAT_IDENTITY` - Additional identifiers (SSN, driver's license, etc.)
- `PAT_RACE` - Race information (supports multiple races)
- `PAT_RELATIONSHIPS` - Emergency contacts and relationships
- `PAT_RELATIONSHIP_LIST` - Master list of relationship records

**Key Design Patterns:**
- Multiple races supported via PAT_RACE table
- ID-LINE pattern for multiple records per patient
- Separate tables for privacy (SSN in PAT_IDENTITY, not PATIENT)
- Category fields (_C_NAME) for human-readable values

### Common Pitfalls

1. **Multiple Races**: Remember to check PAT_RACE for all races
2. **Phone Formats**: Phone numbers are free text, not standardized
3. **Address Changes**: Current address is in PATIENT table; historical addresses need PAT_ADDR_HX
4. **Name Variations**: Legal name in PATIENT; nicknames/aliases in PATIENT_ALIAS

### Summary

Epic's patient identity system provides:
- Robust patient matching through multiple identifiers
- Comprehensive demographic tracking
- Support for diverse populations (multiple races, languages)
- Emergency contact management
- Privacy protection through table separation

Understanding these tables is essential for:
- Patient matching and deduplication
- Demographic reporting
- Health equity analysis
- Emergency contact protocols