import { Database } from "bun:sqlite";

const db = new Database("c2/ehi.sqlite", { readonly: true });

console.log("=== HOSPITAL ACCOUNT ANALYSIS ===\n");

// Get all hospital accounts with patient info
const harQuery = `
  SELECT DISTINCT
    h.HSP_ACCOUNT_ID,
    h.ADM_DATE_TIME,
    h.DISCH_DATE_TIME,
    h.ACCT_FIN_CLASS_C_NAME,
    h.ACCT_CLASS_HA_C_NAME,
    e.PAT_ID,
    p.PAT_NAME
  FROM HSP_ACCOUNT h
  LEFT JOIN PAT_ENC e ON h.HSP_ACCOUNT_ID = e.HSP_ACCOUNT_ID
  LEFT JOIN PATIENT p ON e.PAT_ID = p.PAT_ID
  ORDER BY h.HSP_ACCOUNT_ID
`;

const accounts = db.query(harQuery).all() as any[];

console.log(`Total Hospital Accounts in Database: ${accounts.filter(a => a.HSP_ACCOUNT_ID).length}`);
console.log(`Hospital Accounts with Patient Links: ${accounts.filter(a => a.PAT_ID).length}\n`);

for (const account of accounts) {
  console.log(`\nHospital Account: ${account.HSP_ACCOUNT_ID}`);
  console.log(`  Patient: ${account.PAT_NAME || 'Not linked'} (${account.PAT_ID || 'N/A'})`);
  console.log(`  Admission: ${account.ADM_DATE_TIME || 'N/A'}`);
  console.log(`  Discharge: ${account.DISCH_DATE_TIME || 'N/A'}`);
  console.log(`  Financial Class: ${account.ACCT_FIN_CLASS_C_NAME || 'N/A'}`);
  console.log(`  Account Class: ${account.ACCT_CLASS_HA_C_NAME || 'N/A'}`);
  
  // Get encounters for this HAR
  const encQuery = `
    SELECT 
      e.PAT_ENC_CSN_ID,
      e.CONTACT_DATE,
      e.HOSP_ADMSN_TYPE_C_NAME,
      d.DEPARTMENT_NAME
    FROM PAT_ENC e
    LEFT JOIN CLARITY_DEP d ON e.DEPARTMENT_ID = d.DEPARTMENT_ID
    WHERE e.HSP_ACCOUNT_ID = ?
    ORDER BY e.CONTACT_DATE
  `;
  
  const encounters = db.query(encQuery).all(account.HSP_ACCOUNT_ID) as any[];
  
  if (encounters.length > 0) {
    console.log(`  Encounters (${encounters.length}):`);
    for (const enc of encounters) {
      console.log(`    - CSN ${enc.PAT_ENC_CSN_ID}: ${enc.CONTACT_DATE} at ${enc.DEPARTMENT_NAME || 'Unknown Dept'}`);
    }
  }
  
  // Get transaction summary
  const txQuery = `
    SELECT 
      TX_TYPE_HA_C_NAME,
      COUNT(*) as count,
      SUM(CASE WHEN TX_TYPE_HA_C_NAME = 'Charge' THEN TX_AMOUNT ELSE 0 END) as charge_total,
      SUM(CASE WHEN TX_TYPE_HA_C_NAME = 'Payment' THEN TX_AMOUNT ELSE 0 END) as payment_total,
      SUM(CASE WHEN TX_TYPE_HA_C_NAME IN ('Credit Adjustment', 'Debit Adjustment') THEN TX_AMOUNT ELSE 0 END) as adj_total
    FROM HSP_TRANSACTIONS
    WHERE HSP_ACCOUNT_ID = ?
    GROUP BY TX_TYPE_HA_C_NAME
  `;
  
  const txSummary = db.query(txQuery).all(account.HSP_ACCOUNT_ID) as any[];
  
  console.log(`  Transactions:`);
  let totalCharges = 0;
  let totalPayments = 0;
  let totalAdjustments = 0;
  
  for (const tx of txSummary) {
    console.log(`    - ${tx.TX_TYPE_HA_C_NAME}: ${tx.count} transactions`);
    totalCharges += tx.charge_total || 0;
    totalPayments += Math.abs(tx.payment_total || 0);
    totalAdjustments += tx.adj_total || 0;
  }
  
  console.log(`  Financial Summary:`);
  console.log(`    - Total Charges: $${totalCharges.toFixed(2)}`);
  console.log(`    - Total Payments: $${totalPayments.toFixed(2)}`);
  console.log(`    - Total Adjustments: $${totalAdjustments.toFixed(2)}`);
  console.log(`    - Net Balance: $${(totalCharges - totalPayments + totalAdjustments).toFixed(2)}`);
}

// Professional billing analysis for comparison
console.log("\n\n=== PROFESSIONAL BILLING ANALYSIS ===\n");

const pbQuery = `
  SELECT 
    agp.PAT_ID,
    p.PAT_NAME,
    agp.ACCOUNT_ID,
    a.ACCOUNT_NAME,
    COUNT(DISTINCT t.TX_ID) as tx_count,
    SUM(CASE WHEN t.TX_TYPE_C_NAME = 'Charge' THEN t.AMOUNT ELSE 0 END) as charge_total,
    SUM(CASE WHEN t.TX_TYPE_C_NAME = 'Payment' THEN ABS(t.AMOUNT) ELSE 0 END) as payment_total,
    SUM(CASE WHEN t.TX_TYPE_C_NAME = 'Adjustment' THEN t.AMOUNT ELSE 0 END) as adj_total
  FROM ACCT_GUAR_PAT_INFO agp
  INNER JOIN PATIENT p ON agp.PAT_ID = p.PAT_ID
  INNER JOIN ACCOUNT a ON agp.ACCOUNT_ID = a.ACCOUNT_ID
  LEFT JOIN ARPB_TRANSACTIONS t ON a.ACCOUNT_ID = t.ACCOUNT_ID
  GROUP BY agp.PAT_ID, agp.ACCOUNT_ID
`;

const pbAccounts = db.query(pbQuery).all() as any[];

for (const account of pbAccounts) {
  console.log(`Patient: ${account.PAT_NAME} (${account.PAT_ID})`);
  console.log(`  Guarantor Account: ${account.ACCOUNT_NAME} (${account.ACCOUNT_ID})`);
  console.log(`  Total Transactions: ${account.tx_count}`);
  console.log(`  Total Charges: $${(account.charge_total || 0).toFixed(2)}`);
  console.log(`  Total Payments: $${(account.payment_total || 0).toFixed(2)}`);
  console.log(`  Total Adjustments: $${(account.adj_total || 0).toFixed(2)}`);
  console.log(`  Net Balance: $${((account.charge_total || 0) - (account.payment_total || 0) + (account.adj_total || 0)).toFixed(2)}`);
}

db.close();