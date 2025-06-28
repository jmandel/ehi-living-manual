---
# Chapter 3.3: Payments and Adjudication - Closing the Loop

*Purpose: To follow the money—understanding how payments flow through the system, match to charges, and ultimately zero out balances.*

### The Payment Ecosystem

When an insurance company or patient sends payment, Epic must answer several questions: Which charges does this payment cover? How much goes to each charge? What remains unpaid? The answers lie in Epic's sophisticated payment processing and matching system.

<example-query description="See the flow of payments">
SELECT 
    TX_TYPE_C_NAME,
    COUNT(*) as transaction_count,
    SUM(AMOUNT) as total_amount,
    AVG(AMOUNT) as avg_amount
FROM ARPB_TRANSACTIONS
WHERE TX_TYPE_C_NAME IN ('Payment', 'Adjustment')
GROUP BY TX_TYPE_C_NAME;
</example-query>

Payments and adjustments work together—rarely does insurance pay the full billed amount.

### Transaction Matching: The Heart of Payment Processing

The **ARPB_TX_MATCH_HX** table records how payments link to charges:

<example-query description="Explore payment-to-charge matching">
SELECT 
    m.TX_ID as payment_tx_id,
    m.MTCH_TX_HX_ID as charge_tx_id,
    m.MTCH_TX_HX_AMT as amount_applied,
    p.TX_TYPE_C_NAME as payment_type,
    p.AMOUNT as payment_amount,
    c.AMOUNT as charge_amount
FROM ARPB_TX_MATCH_HX m
JOIN ARPB_TRANSACTIONS p ON m.TX_ID = p.TX_ID
JOIN ARPB_TRANSACTIONS c ON m.MTCH_TX_HX_ID = c.TX_ID
LIMIT 5;
</example-query>

Key insights:
- One payment can split across multiple charges
- **MTCH_TX_HX_UN_DT** NULL means the match is active
- The applied amount may differ from both payment and charge amounts

### Anatomy of an EOB

Explanation of Benefits (EOB) data reveals insurance adjudication logic:

<example-query description="Examine EOB details">
SELECT 
    TX_ID,
    LINE,
    CVD_AMT as covered_amount,
    NONCVD_AMT as non_covered_amount,
    DED_AMT as deductible_amount,
    COINS_AMT as coinsurance_amount,
    PAID_AMT as paid_amount,
    CVD_AMT - PAID_AMT as patient_responsibility
FROM PMT_EOB_INFO_I
WHERE PAID_AMT IS NOT NULL
LIMIT 5;
</example-query>

The EOB breaks down exactly why insurance paid what they did:
- **Covered Amount**: What insurance recognizes
- **Deductible**: Patient hasn't met annual threshold
- **Coinsurance**: Patient's percentage share
- **Paid Amount**: What insurance actually pays

### Contractual Adjustments: The Hidden Discounts

Most healthcare charges are adjusted down to contracted rates:

<example-query description="Analyze adjustment patterns">
SELECT 
    t1.TX_ID,
    t1.AMOUNT as adjustment_amount,
    t2.ADJUSTMENT_CAT_C_NAME,
    t1.POST_DATE,
    t1.USER_ID_NAME
FROM ARPB_TRANSACTIONS t1
JOIN ARPB_TRANSACTIONS2 t2 ON t1.TX_ID = t2.TX_ID
WHERE t1.TX_TYPE_C_NAME = 'Adjustment'
  AND t2.ADJUSTMENT_CAT_C_NAME IS NOT NULL
ORDER BY t1.POST_DATE DESC
LIMIT 10;
</example-query>

"Contractual" adjustments represent the difference between:
- Billed amount (what providers charge)
- Allowed amount (what insurance contracts permit)

### Tracing a Payment Through the System

Let's follow a single payment from arrival to application:

<example-query description="Trace a complete payment application">
-- Find a payment that's been fully distributed
WITH payment_distribution AS (
    SELECT 
        m.TX_ID as payment_id,
        p.AMOUNT as payment_amount,
        COUNT(m.MTCH_TX_HX_ID) as charges_paid,
        SUM(m.MTCH_TX_HX_AMT) as total_distributed
    FROM ARPB_TX_MATCH_HX m
    JOIN ARPB_TRANSACTIONS p ON m.TX_ID = p.TX_ID
    WHERE p.TX_TYPE_C_NAME = 'Payment'
    GROUP BY m.TX_ID, p.AMOUNT
)
SELECT 
    payment_id,
    payment_amount,
    charges_paid,
    total_distributed,
    payment_amount + total_distributed as variance
FROM payment_distribution
WHERE ABS(payment_amount + total_distributed) < 0.01  -- Fully distributed
LIMIT 5;
</example-query>

The variance should be zero—every penny accounted for.

### The Remittance: Bulk Payment Processing

Insurance companies often send one check covering multiple patients:

<example-query description="Explore remittance information">
SELECT 
    IMAGE_ID,
    CREATION_DATE,
    PAYMENT_METHOD_C_NAME,
    PAYMENT_TYPE_C_NAME,
    COUNT(*) as line_items,
    COUNT(DISTINCT PAT_ID) as patients_covered
FROM CL_REMIT
GROUP BY IMAGE_ID, CREATION_DATE, PAYMENT_METHOD_C_NAME, PAYMENT_TYPE_C_NAME
ORDER BY line_items DESC
LIMIT 5;
</example-query>

Epic's remittance processing:
1. Receives electronic (835) or paper remittance
2. Creates CL_REMIT records
3. Distributes to individual patient payments
4. Applies payments to specific charges

### Hospital Payment Processing

Hospital payments follow similar patterns with additional complexity:

<example-query description="Examine hospital payment patterns">
SELECT 
    ht.TX_TYPE_HA_C_NAME,
    ht.TX_AMOUNT,
    ht2.ADJUSTMENT_CAT_C_NAME,
    ht3.REVERSAL_RSN_C_NAME
FROM HSP_TRANSACTIONS ht
LEFT JOIN HSP_TRANSACTIONS_2 ht2 ON ht.TX_ID = ht2.TX_ID
LEFT JOIN HSP_TRANSACTIONS_3 ht3 ON ht.TX_ID = ht3.TX_ID
WHERE ht.TX_TYPE_HA_C_NAME IN ('Payment', 'Credit Adjustment', 'Debit Adjustment')
LIMIT 10;
</example-query>

Hospital billing distinguishes:
- **Credit Adjustments**: Reduce patient balance
- **Debit Adjustments**: Increase patient balance
- **Reversals**: Undo previous transactions

### Payment Reversals and Corrections

When payments are applied incorrectly, Epic maintains the audit trail:

<example-query description="Find reversed payment matches">
SELECT 
    m.TX_ID,
    m.MTCH_TX_HX_ID,
    m.MTCH_TX_HX_AMT,
    m.MTCH_TX_HX_DT as match_date,
    m.MTCH_TX_HX_UN_DT as unmatch_date,
    m.MTCH_TX_HX_UN_COM as unmatch_reason
FROM ARPB_TX_MATCH_HX m
WHERE m.MTCH_TX_HX_UN_DT IS NOT NULL
LIMIT 5;
</example-query>

Reversal scenarios:
- Payment posted to wrong patient
- Incorrect charge matched
- Insurance recoupment
- Retroactive eligibility changes

### Zero Balance: The Journey's End

The ultimate goal—bringing an account to zero balance:

<example-query description="Trace a charge to zero balance">
-- Find a fully paid charge
WITH charge_payments AS (
    SELECT 
        c.TX_ID as charge_id,
        c.AMOUNT as charge_amount,
        -- All payments and adjustments
        COALESCE(SUM(m.MTCH_TX_HX_AMT), 0) as total_payments
    FROM ARPB_TRANSACTIONS c
    LEFT JOIN ARPB_TX_MATCH_HX m ON c.TX_ID = m.MTCH_TX_HX_ID
    WHERE c.TX_TYPE_C_NAME = 'Charge'
    GROUP BY c.TX_ID, c.AMOUNT
),
zero_balance_charges AS (
    SELECT *,
           charge_amount - total_payments as balance
    FROM charge_payments
    WHERE ABS(charge_amount - total_payments) < 0.01
)
-- Show the payment breakdown
SELECT 
    z.charge_id,
    z.charge_amount,
    m.TX_ID as payment_id,
    p.TX_TYPE_C_NAME as payment_type,
    m.MTCH_TX_HX_AMT as amount_applied,
    m.MTCH_TX_HX_DT as applied_date
FROM zero_balance_charges z
JOIN ARPB_TX_MATCH_HX m ON z.charge_id = m.MTCH_TX_HX_ID
JOIN ARPB_TRANSACTIONS p ON m.TX_ID = p.TX_ID
WHERE z.charge_id = (SELECT charge_id FROM zero_balance_charges LIMIT 1)
ORDER BY m.MTCH_TX_HX_DT;
</example-query>

The typical journey:
1. Charge posted
2. Claim submitted
3. Insurance adjudicates
4. Payment received
5. Contractual adjustment applied
6. Patient portion identified
7. Patient payment received
8. Balance reaches zero

### Denial Management

Not all claims are paid. Denials require investigation:

<example-query description="Analyze denial patterns">
SELECT 
    e.WIN_DENIAL_ID,
    e.WIN_DENIAL_ID_REMIT_CODE_NAME,
    COUNT(*) as denial_count,
    SUM(e.CVD_AMT - e.PAID_AMT) as total_denied
FROM PMT_EOB_INFO_I e
WHERE e.WIN_DENIAL_ID IS NOT NULL
GROUP BY e.WIN_DENIAL_ID, e.WIN_DENIAL_ID_REMIT_CODE_NAME
ORDER BY denial_count DESC;
</example-query>

Common denial reasons:
- Prior authorization missing
- Medical necessity not established
- Timely filing exceeded
- Coverage terminated

### The Complete Payment Picture

To see how money flows through the entire system:

<example-query description="Create comprehensive payment flow analysis">
WITH payment_summary AS (
    SELECT 
        'Professional' as system,
        TX_TYPE_C_NAME as transaction_type,
        COUNT(*) as count,
        SUM(AMOUNT) as total_amount
    FROM ARPB_TRANSACTIONS
    GROUP BY TX_TYPE_C_NAME
    
    UNION ALL
    
    SELECT 
        'Hospital',
        TX_TYPE_HA_C_NAME,
        COUNT(*),
        SUM(TX_AMOUNT)
    FROM HSP_TRANSACTIONS
    GROUP BY TX_TYPE_HA_C_NAME
)
SELECT 
    system,
    transaction_type,
    count,
    total_amount,
    CASE 
        WHEN total_amount > 0 THEN 'Increases Balance'
        WHEN total_amount < 0 THEN 'Decreases Balance'
        ELSE 'No Impact'
    END as balance_impact
FROM payment_summary
ORDER BY system, ABS(total_amount) DESC;
</example-query>

### Best Practices for Payment Queries

When analyzing payments:

1. **Always check match status**: Use `MTCH_TX_HX_UN_DT IS NULL` for active matches
2. **Sum applied amounts**: Payment amounts rarely equal charge amounts
3. **Include adjustments**: Contractual adjustments are part of payment processing
4. **Track timing**: Payment posting date vs. service date affects reports
5. **Consider reversals**: Include logic for reversed/reposted payments

---

### Key Takeaways

- **ARPB_TX_MATCH_HX** links payments to charges with many-to-many relationships
- One payment can cover multiple charges; one charge can receive multiple payments
- **PMT_EOB_INFO_I** contains insurance adjudication details from EOBs
- Contractual adjustments (in ADJUSTMENT_CAT_C_NAME) represent negotiated discounts
- **CL_REMIT** tracks bulk insurance payments covering multiple patients
- Payment reversals maintain audit trails through unmatch dates and reasons
- Hospital billing uses credit/debit adjustments vs. simple positive/negative amounts
- Denials are tracked with specific codes for follow-up and appeals
- Zero balance requires coordinating insurance payments, adjustments, and patient payments
- Complete payment analysis requires joining transactions, matches, and EOB data

---