# Examples - Encounter Billing Explorer v2

## Example 1: Basic Financial Summary

```typescript
import { FinancialDataExtractor } from "./financial-extractor";

const extractor = new FinancialDataExtractor("path/to/ehi.sqlite");

// Get all patients' financial data
const allRecords = await extractor.extractAllPatientsFinancialRecords();

// Or get a specific patient
const patientRecord = await extractor.extractPatientFinancialRecord("Z7004242");

if (patientRecord) {
  console.log(`Patient: ${patientRecord.patientName}`);
  console.log(`Total Charges: $${patientRecord.financialSummary.totalCharges}`);
  console.log(`Outstanding Balance: $${patientRecord.financialSummary.outstandingBalance}`);
}

extractor.close();
```

## Example 2: Encounter-Based Financial Report

```typescript
// Group charges by encounter for a patient
const record = await extractor.extractPatientFinancialRecord("Z7004242");

const encounterSummary = new Map();

// Process professional charges
for (const charge of record.professionalTransactions.filter(t => t.txType === 'Charge')) {
  if (charge.encounterId) {
    const enc = record.encounters.find(e => e.encounterId === charge.encounterId);
    if (enc) {
      if (!encounterSummary.has(charge.encounterId)) {
        encounterSummary.set(charge.encounterId, {
          date: enc.encounterDate,
          department: enc.departmentName,
          charges: [],
          total: 0
        });
      }
      const summary = encounterSummary.get(charge.encounterId);
      summary.charges.push(charge);
      summary.total += charge.amount;
    }
  }
}

// Display encounter summary
for (const [encId, summary] of encounterSummary) {
  console.log(`\nEncounter ${encId} - ${summary.date}`);
  console.log(`Department: ${summary.department}`);
  console.log(`Total Charges: $${summary.total.toFixed(2)}`);
  console.log(`Services: ${summary.charges.length}`);
}
```

## Example 3: Insurance Coverage Analysis

```typescript
const record = await extractor.extractPatientFinancialRecord("Z7004242");

console.log("Insurance Coverage Analysis:");
for (const coverage of record.coverages) {
  console.log(`\nPayer: ${coverage.payorName}`);
  console.log(`Plan: ${coverage.planName}`);
  
  const member = coverage.members.find(m => m.patientId === record.patientId);
  if (member) {
    console.log(`Member #: ${member.memberNumber}`);
    console.log(`Relationship: ${member.relationshipToSubscriber}`);
    console.log(`Effective: ${member.effectiveFromDate}`);
  }
  
  // Find claims for this coverage
  const coverageClaims = record.invoices.filter(inv => inv.coverageId === coverage.coverageId);
  console.log(`Claims Submitted: ${coverageClaims.length}`);
  
  const totalBilled = coverageClaims.reduce((sum, claim) => sum + claim.totalBilled, 0);
  console.log(`Total Billed: $${totalBilled.toFixed(2)}`);
}
```

## Example 4: Payment Tracking

```typescript
// Track payments and their application to charges
const record = await extractor.extractPatientFinancialRecord("Z7004242");

console.log("Payment Activity:");

// Get all payment transactions
const payments = record.professionalTransactions.filter(t => t.txType === 'Payment');

for (const payment of payments) {
  console.log(`\nPayment ${payment.txId}: $${Math.abs(payment.amount).toFixed(2)}`);
  console.log(`Posted: ${payment.postDate}`);
  
  // Find EOB details
  const eob = record.payments.find(e => e.paymentTxId === payment.txId);
  if (eob) {
    console.log(`Charge Paid: TX ${eob.chargeTxId}`);
    console.log(`Allowed Amount: $${eob.allowedAmount || 0}`);
    console.log(`Patient Responsibility:`);
    console.log(`  - Deductible: $${eob.deductibleAmount || 0}`);
    console.log(`  - Copay: $${eob.copayAmount || 0}`);
    console.log(`  - Coinsurance: $${eob.coinsuranceAmount || 0}`);
    
    if (eob.denialCodes) {
      console.log(`Denial Codes: ${eob.denialCodes}`);
    }
  }
  
  // Find matching history
  const matches = record.matches.filter(m => m.paymentTxId === payment.txId);
  console.log(`Applied to ${matches.length} charges`);
}
```

## Example 5: Hospital Episode Analysis

```typescript
const record = await extractor.extractPatientFinancialRecord("Z7004242");

console.log("Hospital Episodes:");

for (const har of record.hospitalAccounts) {
  console.log(`\nHospital Account ${har.hospitalAccountId}`);
  console.log(`Admission: ${har.admissionDate}`);
  console.log(`Discharge: ${har.dischargeDate}`);
  console.log(`Class: ${har.accountClass}`);
  
  // Calculate length of stay
  if (har.admissionDate && har.dischargeDate) {
    const admit = new Date(har.admissionDate);
    const discharge = new Date(har.dischargeDate);
    const los = Math.ceil((discharge.getTime() - admit.getTime()) / (1000 * 60 * 60 * 24));
    console.log(`Length of Stay: ${los} days`);
  }
  
  console.log(`\nEncounters in this episode:`);
  for (const enc of har.encounters) {
    console.log(`  - ${enc.encounterDate} at ${enc.departmentName}`);
  }
  
  console.log(`\nCharges by Type:`);
  const chargesByType = new Map();
  
  for (const tx of har.transactions.filter(t => t.txType === 'Charge')) {
    const type = tx.revenueCodeName || 'Unknown';
    if (!chargesByType.has(type)) {
      chargesByType.set(type, { count: 0, total: 0 });
    }
    const summary = chargesByType.get(type);
    summary.count++;
    summary.total += tx.amount;
  }
  
  for (const [type, summary] of chargesByType) {
    console.log(`  ${type}: ${summary.count} charges, $${summary.total.toFixed(2)}`);
  }
  
  console.log(`\nTotal Episode Charges: $${har.totalCharges.toFixed(2)}`);
}
```

## Example 6: Outstanding Balance by Payer

```typescript
// Analyze outstanding balances by responsible party
const record = await extractor.extractPatientFinancialRecord("Z7004242");

// Group unpaid charges by coverage
const balanceByPayer = new Map();

// Initialize with self-pay
balanceByPayer.set('self-pay', { 
  charges: 0, 
  payments: 0, 
  adjustments: 0,
  balance: 0 
});

// Process all transactions
for (const tx of record.professionalTransactions) {
  // Determine responsible party (simplified - real logic would be more complex)
  const payerKey = tx.txType === 'Charge' ? 'insurance' : 'self-pay';
  
  if (!balanceByPayer.has(payerKey)) {
    balanceByPayer.set(payerKey, { 
      charges: 0, 
      payments: 0, 
      adjustments: 0,
      balance: 0 
    });
  }
  
  const summary = balanceByPayer.get(payerKey);
  
  switch (tx.txType) {
    case 'Charge':
      summary.charges += tx.amount;
      break;
    case 'Payment':
      summary.payments += Math.abs(tx.amount);
      break;
    case 'Adjustment':
      summary.adjustments += tx.amount;
      break;
  }
}

// Calculate balances
console.log("Outstanding Balances by Payer:");
for (const [payer, summary] of balanceByPayer) {
  summary.balance = summary.charges - summary.payments + summary.adjustments;
  console.log(`\n${payer}:`);
  console.log(`  Charges: $${summary.charges.toFixed(2)}`);
  console.log(`  Payments: $${summary.payments.toFixed(2)}`);
  console.log(`  Adjustments: $${summary.adjustments.toFixed(2)}`);
  console.log(`  Balance: $${summary.balance.toFixed(2)}`);
}
```

## Example 7: Custom Query Integration

```typescript
import { Database } from "bun:sqlite";

// Sometimes you need custom queries beyond the extractor
const db = new Database("path/to/ehi.sqlite", { readonly: true });

// Find all encounters with charges but no payments
const unpaidEncounters = db.query(`
  WITH encounter_charges AS (
    SELECT 
      v.PRIM_ENC_CSN_ID as encounter_id,
      SUM(t.AMOUNT) as total_charges
    FROM ARPB_TRANSACTIONS t
    JOIN ARPB_VISITS v ON t.VISIT_NUMBER = v.PB_VISIT_NUM
    WHERE t.TX_TYPE_C_NAME = 'Charge'
      AND t.ACCOUNT_ID = ?
    GROUP BY v.PRIM_ENC_CSN_ID
  ),
  encounter_payments AS (
    SELECT 
      v.PRIM_ENC_CSN_ID as encounter_id,
      SUM(ABS(t.AMOUNT)) as total_payments
    FROM ARPB_TRANSACTIONS t
    JOIN ARPB_VISITS v ON t.VISIT_NUMBER = v.PB_VISIT_NUM
    WHERE t.TX_TYPE_C_NAME = 'Payment'
      AND t.ACCOUNT_ID = ?
    GROUP BY v.PRIM_ENC_CSN_ID
  )
  SELECT 
    e.PAT_ENC_CSN_ID,
    e.CONTACT_DATE,
    d.DEPARTMENT_NAME,
    ec.total_charges,
    COALESCE(ep.total_payments, 0) as total_payments,
    ec.total_charges - COALESCE(ep.total_payments, 0) as balance
  FROM encounter_charges ec
  JOIN PAT_ENC e ON ec.encounter_id = e.PAT_ENC_CSN_ID
  LEFT JOIN CLARITY_DEP d ON e.DEPARTMENT_ID = d.DEPARTMENT_ID
  LEFT JOIN encounter_payments ep ON ec.encounter_id = ep.encounter_id
  WHERE ec.total_charges > COALESCE(ep.total_payments, 0)
  ORDER BY balance DESC
`).all(accountId, accountId);

console.log("Encounters with Outstanding Balances:");
for (const enc of unpaidEncounters) {
  console.log(`${enc.CONTACT_DATE} - ${enc.DEPARTMENT_NAME}: $${enc.balance.toFixed(2)}`);
}

db.close();
```