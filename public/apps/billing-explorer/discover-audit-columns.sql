-- SQL Script to Discover Audit Columns in Epic Tables
-- This script helps identify user ID, timestamp, and action columns

-- 1. Find all columns in key tables that might contain audit information
-- Note: Replace with actual database connection when available

-- Example: Discover columns in PAT_ENC table
/*
PRAGMA table_info(PAT_ENC);

-- Look for columns matching audit patterns:
SELECT 
    name as column_name,
    type as data_type,
    CASE 
        WHEN UPPER(name) LIKE '%USER%ID%' THEN 'User ID'
        WHEN UPPER(name) LIKE '%CREATE%' THEN 'Create Audit'
        WHEN UPPER(name) LIKE '%UPDATE%' THEN 'Update Audit'
        WHEN UPPER(name) LIKE '%TIME%' OR UPPER(name) LIKE '%DATE%' OR UPPER(name) LIKE '%INSTANT%' THEN 'Timestamp'
        WHEN UPPER(name) LIKE '%STATUS%' OR UPPER(name) LIKE '%TYPE%' THEN 'Action/Status'
        ELSE 'Other'
    END as audit_category
FROM pragma_table_info('PAT_ENC')
WHERE audit_category != 'Other'
ORDER BY audit_category, column_name;
*/

-- 2. Common Epic audit column patterns to search for

-- User ID columns (who performed the action)
-- Pattern: *USER*ID*, *_BY, *_USER
-- Examples: CREATE_USER_ID, UPDATED_BY, POST_USER_ID, VERIF_USER, CHECK_IN_USER_ID

-- Timestamp columns (when the action occurred)  
-- Pattern: *DATE*, *TIME*, *INSTANT*, *_DT, *_TM
-- Examples: CREATE_INSTANT, POST_DATE, SERVICE_DATE, CHECK_IN_TIME, LAST_UPDATE_DATE

-- Action/Status columns (what was done)
-- Pattern: *TYPE*, *STATUS*, *ACTION*, *_C_NAME
-- Examples: TX_TYPE_C_NAME, INV_STATUS_C, ACTION_C_NAME, PAYMENT_TYPE

-- 3. Query to find audit information across multiple tables
-- This would be run against each table of interest

-- Template query for finding audit columns:
/*
SELECT 
    'TABLE_NAME' as table_name,
    column_name,
    data_type,
    CASE
        WHEN column_name REGEXP '(CREATE|CREAT|CRT).*USER' THEN 'Create User'
        WHEN column_name REGEXP '(UPDATE|UPDT|UPD).*USER' THEN 'Update User'
        WHEN column_name REGEXP '(POST|PST).*USER' THEN 'Post User'
        WHEN column_name REGEXP '(VOID|VD).*USER' THEN 'Void User'
        WHEN column_name REGEXP 'VERIF.*USER' THEN 'Verification User'
        WHEN column_name REGEXP 'CHECK.*IN.*USER' THEN 'Check-in User'
        WHEN column_name REGEXP 'CHECK.*OUT.*USER' THEN 'Check-out User'
        WHEN column_name REGEXP '.*USER.*ID' THEN 'Other User ID'
        
        WHEN column_name REGEXP '(CREATE|CREAT|CRT).*(DATE|TIME|INSTANT|DT|TM)' THEN 'Create Timestamp'
        WHEN column_name REGEXP '(UPDATE|UPDT|UPD).*(DATE|TIME|INSTANT|DT|TM)' THEN 'Update Timestamp'
        WHEN column_name REGEXP '(POST|PST).*(DATE|TIME|DT|TM)' THEN 'Post Timestamp'
        WHEN column_name REGEXP 'SERVICE.*(DATE|DT)' THEN 'Service Date'
        WHEN column_name REGEXP 'CONTACT.*(DATE|DT)' THEN 'Contact Date'
        WHEN column_name REGEXP '.*(DATE|TIME|INSTANT|DT|TM)$' THEN 'Other Timestamp'
        
        WHEN column_name REGEXP '.*TYPE.*C(_NAME)?' THEN 'Type/Action'
        WHEN column_name REGEXP '.*STATUS.*C(_NAME)?' THEN 'Status'
        WHEN column_name REGEXP '.*ACTION.*C(_NAME)?' THEN 'Action'
        
        ELSE NULL
    END as audit_type
FROM information_schema.columns
WHERE table_name = 'TABLE_NAME'
  AND audit_type IS NOT NULL
ORDER BY audit_type, column_name;
*/

-- 4. Specific queries for each table used in financial-extractor.ts

-- PAT_ENC (Patient Encounters)
-- Expected audit columns:
-- ENC_CREATE_USER_ID, ENC_CREATE_INSTANT, ENC_CREATE_USER_ID_NAME
-- CHECK_IN_USER_ID, CHECK_IN_TIME
-- CHECK_OUT_USER_ID, CHECK_OUT_TIME
-- CLOSE_USER_ID, CLOSE_DATE
-- UPDATE_USER_ID, UPDATE_INSTANT

-- ARPB_TRANSACTIONS (Professional Billing)
-- Expected audit columns:
-- CREATE_USER_ID, CREATE_INSTANT
-- POST_USER_ID, POST_DATE
-- VOID_USER_ID, VOID_DATE
-- TX_TYPE_C, TX_TYPE_C_NAME (action type)

-- HSP_TRANSACTIONS (Hospital Billing)
-- Expected audit columns:
-- CREATE_USER_ID, CREATE_INSTANT
-- POST_USER_ID, TX_POST_DATE
-- VOID_USER_ID, VOID_DATE
-- TX_TYPE_HA_C, TX_TYPE_HA_C_NAME (action type)

-- COVERAGE_MEMBER_LIST (Insurance Verification)
-- Expected audit columns:
-- VERIF_USER_ID, LAST_VERIF_DATE
-- CREATE_USER_ID, CREATE_INSTANT
-- MEM_VERIF_STAT_C_NAME (verification status)

-- INVOICE (Claims)
-- Expected audit columns:
-- CREATE_USER_ID, CREATE_INSTANT
-- SUBMIT_USER_ID, SUBMIT_DATE
-- UPDATE_USER_ID, UPDATE_DATE

-- PMT_EOB_INFO_I (Payments)
-- Expected audit columns:
-- MATCH_USER_ID, TX_MATCH_DATE
-- CREATE_USER_ID, CREATE_INSTANT
-- POST_USER_ID, POST_DATE
-- PEOB_ACTION_C_NAME (action taken)

-- ARPB_TX_MATCH_HX (Payment Matching History)
-- Expected audit columns:
-- MATCH_USER_ID, MTCH_TX_HX_DT (match date)
-- UNMATCH_USER_ID, MTCH_TX_HX_UN_DT (unmatch date)

-- 5. Sample workflow audit query combining multiple tables
-- This shows how to create a unified audit trail

/*
-- Comprehensive workflow audit for a patient
WITH patient_events AS (
    -- Encounter creation
    SELECT 
        pe.PAT_ID,
        'Encounter Created' as event_type,
        pe.ENC_CREATE_INSTANT as event_timestamp,
        pe.ENC_CREATE_USER_ID as user_id,
        pe.ENC_CREATE_USER_ID_NAME as user_name,
        pe.PAT_ENC_CSN_ID as encounter_id,
        pe.DEPARTMENT_ID,
        NULL as transaction_id,
        NULL as amount,
        'Encounter #' || pe.PAT_ENC_CSN_ID || ' created' as description
    FROM PAT_ENC pe
    
    UNION ALL
    
    -- Check-in events
    SELECT 
        pe.PAT_ID,
        'Patient Check-in' as event_type,
        pe.CHECK_IN_TIME as event_timestamp,
        pe.CHECK_IN_USER_ID as user_id,
        NULL as user_name,
        pe.PAT_ENC_CSN_ID as encounter_id,
        pe.DEPARTMENT_ID,
        NULL as transaction_id,
        NULL as amount,
        'Checked in for encounter #' || pe.PAT_ENC_CSN_ID as description
    FROM PAT_ENC pe
    WHERE pe.CHECK_IN_TIME IS NOT NULL
    
    UNION ALL
    
    -- Charge creation
    SELECT 
        agpi.PAT_ID,
        'Charge Created' as event_type,
        at.CREATE_INSTANT as event_timestamp,
        at.CREATE_USER_ID as user_id,
        NULL as user_name,
        at.VISIT_NUMBER as encounter_id,
        at.DEPARTMENT_ID,
        at.TX_ID as transaction_id,
        at.AMOUNT as amount,
        'Charge: $' || at.AMOUNT || ' - ' || at.TX_TYPE_C_NAME as description
    FROM ARPB_TRANSACTIONS at
    JOIN ACCT_GUAR_PAT_INFO agpi ON at.ACCOUNT_ID = agpi.ACCOUNT_ID
    WHERE at.TX_TYPE_C_NAME = 'Charge'
    
    UNION ALL
    
    -- Payment posting
    SELECT 
        agpi.PAT_ID,
        'Payment Posted' as event_type,
        at.POST_DATE as event_timestamp,
        at.POST_USER_ID as user_id,
        NULL as user_name,
        at.VISIT_NUMBER as encounter_id,
        at.DEPARTMENT_ID,
        at.TX_ID as transaction_id,
        at.AMOUNT as amount,
        'Payment: $' || ABS(at.AMOUNT) || ' - ' || COALESCE(at.PAYMENT_SOURCE_C_NAME, 'Unknown Source') as description
    FROM ARPB_TRANSACTIONS at
    JOIN ACCT_GUAR_PAT_INFO agpi ON at.ACCOUNT_ID = agpi.ACCOUNT_ID
    WHERE at.TX_TYPE_C_NAME = 'Payment'
    
    UNION ALL
    
    -- Insurance verification
    SELECT 
        cm.PAT_ID,
        'Insurance Verified' as event_type,
        cm.LAST_VERIF_DATE as event_timestamp,
        cm.VERIF_USER_ID as user_id,
        NULL as user_name,
        NULL as encounter_id,
        NULL as department_id,
        NULL as transaction_id,
        NULL as amount,
        'Coverage verified: ' || c.PAYOR_ID_PAYOR_NAME || ' - Status: ' || cm.MEM_VERIF_STAT_C_NAME as description
    FROM COVERAGE_MEMBER_LIST cm
    JOIN COVERAGE c ON cm.COVERAGE_ID = c.COVERAGE_ID
    WHERE cm.LAST_VERIF_DATE IS NOT NULL
)
SELECT 
    event_type,
    event_timestamp,
    COALESCE(user_name, user_id, 'Unknown User') as performed_by,
    encounter_id,
    transaction_id,
    amount,
    description
FROM patient_events
WHERE PAT_ID = ? -- Replace with patient ID
ORDER BY event_timestamp;
*/

-- 6. Query to identify all potential audit columns in a set of tables
/*
SELECT 
    table_name,
    column_name,
    data_type,
    CASE
        WHEN column_name LIKE '%USER%ID%' THEN 'User ID'
        WHEN column_name LIKE '%_BY' THEN 'User ID'
        WHEN column_name LIKE '%CREATE%' AND (column_name LIKE '%DATE%' OR column_name LIKE '%TIME%' OR column_name LIKE '%INSTANT%') THEN 'Create Timestamp'
        WHEN column_name LIKE '%UPDATE%' AND (column_name LIKE '%DATE%' OR column_name LIKE '%TIME%' OR column_name LIKE '%INSTANT%') THEN 'Update Timestamp'
        WHEN column_name LIKE '%POST%DATE%' THEN 'Post Date'
        WHEN column_name LIKE '%SERVICE%DATE%' THEN 'Service Date'
        WHEN column_name LIKE '%VERIF%DATE%' THEN 'Verification Date'
        WHEN column_name LIKE '%CHECK%TIME%' THEN 'Check-in/out Time'
        WHEN column_name LIKE '%TYPE%C%NAME%' THEN 'Action Type'
        WHEN column_name LIKE '%STATUS%C%NAME%' THEN 'Status'
        ELSE 'Other Audit'
    END as audit_category
FROM information_schema.columns
WHERE table_name IN (
    'PAT_ENC', 'ARPB_TRANSACTIONS', 'HSP_TRANSACTIONS', 
    'COVERAGE_MEMBER_LIST', 'INVOICE', 'PMT_EOB_INFO_I',
    'ARPB_TX_MATCH_HX', 'ACCOUNT', 'PATIENT'
)
AND (
    column_name LIKE '%USER%' OR
    column_name LIKE '%DATE%' OR
    column_name LIKE '%TIME%' OR
    column_name LIKE '%INSTANT%' OR
    column_name LIKE '%CREATE%' OR
    column_name LIKE '%UPDATE%' OR
    column_name LIKE '%POST%' OR
    column_name LIKE '%TYPE%' OR
    column_name LIKE '%STATUS%' OR
    column_name LIKE '%ACTION%'
)
ORDER BY table_name, audit_category, column_name;
*/