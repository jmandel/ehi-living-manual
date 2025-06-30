# Epic Financial Data Model - Visual Guide

## Overview Diagram

```mermaid
graph TB
    subgraph Patient_Identity
        P[PATIENT<br/>PAT_ID, PAT_NAME]
        A[ACCOUNT<br/>Guarantor]
        AGPI[ACCT_GUAR_PAT_INFO<br/>Links Patient→Guarantor]
    end

    subgraph Clinical_Events
        PE[PAT_ENC<br/>Encounters/Visits]
        HA[HSP_ACCOUNT<br/>Hospital Episodes]
        DEP[CLARITY_DEP<br/>Departments]
    end

    subgraph Professional_Billing
        ARPB[ARPB_TRANSACTIONS<br/>PB Charges/Payments]
        VISITS[ARPB_VISITS<br/>Visit Records]
        DX[ARPB_CHG_ENTRY_DX<br/>Diagnoses]
    end

    subgraph Hospital_Billing
        HSP[HSP_TRANSACTIONS<br/>HB Charges/Payments]
    end

    subgraph Insurance
        COV[COVERAGE<br/>Insurance Policies]
        MEM[COVERAGE_MEMBER_LIST<br/>Covered Members]
    end

    subgraph Claims_Invoices
        INV[INVOICE<br/>Master Record]
        IBI[INV_BASIC_INFO<br/>Claim Details]
        ITP[INV_TX_PIECES<br/>Charge Lines]
    end

    subgraph Payments
        EOB[PMT_EOB_INFO_I<br/>EOB Details]
        MATCH[ARPB_TX_MATCH_HX<br/>Payment Matching]
    end

    %% Relationships
    P -.->|has guarantor| AGPI
    AGPI -->|ACCOUNT_ID| A
    
    P -->|has encounters| PE
    PE -->|DEPARTMENT_ID| DEP
    PE -->|groups into| HA
    
    ARPB -->|VISIT_NUMBER| VISITS
    VISITS -->|PRIM_ENC_CSN_ID| PE
    ARPB -->|TX_ID| DX
    
    HA -->|HSP_ACCOUNT_ID| HSP
    
    P -.->|covered by| MEM
    MEM -->|COVERAGE_ID| COV
    
    A -->|ACCOUNT_ID| INV
    INV -->|INVOICE_ID| IBI
    IBI -->|INV_ID, LINE| ITP
    ITP -->|TX_ID| ARPB
    
    ARPB -->|Payment TX_ID| EOB
    EOB -->|PEOB_TX_ID| ARPB
    ARPB -->|TX_ID| MATCH

    style P fill:#f9f,stroke:#333,stroke-width:4px
    style PE fill:#bbf,stroke:#333,stroke-width:2px
    style ARPB fill:#bfb,stroke:#333,stroke-width:2px
    style HA fill:#fbf,stroke:#333,stroke-width:2px
```

## Professional Billing Flow

```mermaid
sequenceDiagram
    participant Patient
    participant Encounter
    participant Visit
    participant Charge
    participant Invoice
    participant Payment
    participant EOB

    Patient->>Encounter: Has encounter
    Encounter->>Visit: Creates PB Visit
    Visit->>Charge: Generates charges<br/>(VISIT_NUMBER link)
    Charge->>Invoice: Bundled into claim
    Invoice->>Payment: Insurance processes
    Payment->>EOB: Creates EOB details
    EOB->>Charge: Matched to original charge
```

## Hospital Billing Flow

```mermaid
sequenceDiagram
    participant Patient
    participant Admission
    participant HAR
    participant Encounters
    participant HBCharges
    participant Claim

    Patient->>Admission: Admitted
    Admission->>HAR: Creates Hospital Account
    HAR->>Encounters: Multiple encounters<br/>(e.g., daily therapy)
    Encounters->>HBCharges: Generate facility charges
    HBCharges->>Claim: Bundled for billing
```

## Key Relationships Summary

### 1. Patient → Financial Responsibility
- **Direct**: `PATIENT` → `ACCT_GUAR_PAT_INFO` → `ACCOUNT`
- **Purpose**: Links patient to guarantor (responsible party)

### 2. Charge → Encounter (Professional)
- **Path**: `ARPB_TRANSACTIONS` → `ARPB_VISITS` → `PAT_ENC`
- **Key**: VISIT_NUMBER
- **Discovery**: This linkage enables 100% encounter attribution

### 3. Charge → Episode (Hospital)
- **Direct**: `HSP_TRANSACTIONS.HSP_ACCOUNT_ID` → `HSP_ACCOUNT`
- **Nature**: Episode-based, not encounter-based

### 4. Charge → Invoice → Payment
- **Path**: `ARPB_TRANSACTIONS` → `INV_TX_PIECES` → `INVOICE` → `PMT_EOB_INFO_I`
- **Purpose**: Tracks claim submission and payment

### 5. Payment → Charge Matching
- **Table**: `ARPB_TX_MATCH_HX`
- **Purpose**: Records how payments are applied to charges

## Common Query Patterns

### Get All Charges for an Encounter
```sql
SELECT t.* 
FROM ARPB_TRANSACTIONS t
JOIN ARPB_VISITS v ON t.VISIT_NUMBER = v.PB_VISIT_NUM
WHERE v.PRIM_ENC_CSN_ID = :encounter_id
  AND t.TX_TYPE_C_NAME = 'Charge'
```

### Get All Encounters for a Hospital Stay
```sql
SELECT e.*, d.DEPARTMENT_NAME
FROM PAT_ENC e
LEFT JOIN CLARITY_DEP d ON e.DEPARTMENT_ID = d.DEPARTMENT_ID
WHERE e.HSP_ACCOUNT_ID = :har_id
ORDER BY e.CONTACT_DATE
```

### Get Insurance Coverage for a Patient
```sql
SELECT c.*, cm.*
FROM COVERAGE c
JOIN COVERAGE_MEMBER_LIST cm ON c.COVERAGE_ID = cm.COVERAGE_ID
WHERE cm.PAT_ID = :patient_id
  AND cm.MEM_EFF_FROM_DATE <= :service_date
  AND (cm.MEM_EFF_TO_DATE IS NULL OR cm.MEM_EFF_TO_DATE >= :service_date)
```

### Get Payment Details for a Charge
```sql
SELECT 
  m.MTCH_TX_HX_ID as payment_tx_id,
  m.MTCH_TX_HX_AMT as matched_amount,
  e.PAID_AMT,
  e.ALLOWED_AMT,
  e.DED_AMT,
  e.COPAY_AMT,
  e.DENIAL_CODES
FROM ARPB_TX_MATCH_HX m
LEFT JOIN PMT_EOB_INFO_I e ON m.MTCH_TX_HX_ID = e.TX_ID
WHERE m.TX_ID = :charge_tx_id
  AND m.MTCH_TX_HX_UN_DT IS NULL  -- Not unmatched
```

## Data Integrity Rules

1. **One Patient per HAR**: Each hospital account should have only one patient
2. **One Primary Encounter per Visit**: ARPB_VISITS.PRIM_ENC_CSN_ID
3. **Charges Balance**: Sum of charges should equal invoice total billed
4. **Payment Balance**: Matched amounts should not exceed payment amount
5. **Coverage Dates**: Member effective dates should encompass service dates

## Performance Considerations

### Large Table Warnings
- `ARPB_TRANSACTIONS`: Can have millions of rows
- `PAT_ENC`: High volume in large health systems
- `PMT_EOB_INFO_I`: Multiple rows per payment

### Optimization Strategies
1. Always filter by date range when possible
2. Use covering indexes for common joins
3. Consider partitioning by service date
4. Archive historical data appropriately