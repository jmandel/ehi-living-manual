import { PatientFinancialRecord } from "./financial-extractor";

// Load the extracted financial data
const data = await Bun.file("patient_financial_data.json").json() as PatientFinancialRecord[];

// Generate a summary dashboard
console.log("=== PATIENT FINANCIAL DASHBOARD ===\n");

for (const patient of data) {
  console.log(`Patient: ${patient.patientName} (${patient.patientId})`);
  console.log(`Guarantor: ${patient.guarantor.accountName} (Account: ${patient.guarantor.accountId})`);
  console.log(`\nInsurance Coverage:`);
  
  for (const coverage of patient.coverages) {
    console.log(`  - ${coverage.payorName} / ${coverage.planName}`);
    console.log(`    Member #: ${coverage.members[0]?.memberNumber || 'N/A'}`);
    console.log(`    Effective: ${coverage.members[0]?.effectiveFromDate || 'N/A'}`);
  }

  console.log(`\nEncounter Summary:`);
  console.log(`  Total Encounters: ${patient.encounters.length}`);
  console.log(`  Hospital Accounts: ${patient.hospitalAccounts.length}`);
  
  if (patient.hospitalAccounts.length > 0) {
    for (const har of patient.hospitalAccounts) {
      console.log(`    - HAR ${har.hospitalAccountId}: ${har.admissionDate || 'N/A'} - ${har.dischargeDate || 'N/A'}`);
      console.log(`      Total Charges: $${har.totalCharges.toFixed(2)}`);
    }
  }

  console.log(`\nTransaction Summary:`);
  const profCharges = patient.professionalTransactions.filter(t => t.txType === 'Charge');
  const hospCharges = patient.hospitalTransactions.filter(t => t.txType === 'Charge');
  const profChargeTotal = profCharges.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const hospChargeTotal = hospCharges.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  
  console.log(`  Professional Billing:`);
  console.log(`    - Charges: ${profCharges.length} transactions, Total: $${profChargeTotal.toFixed(2)}`);
  console.log(`  Hospital Billing:`);
  console.log(`    - Charges: ${hospCharges.length} transactions, Total: $${hospChargeTotal.toFixed(2)}`);
  console.log(`  Total Payments: ${[...patient.professionalTransactions, ...patient.hospitalTransactions].filter(t => t.txType === 'Payment').length} transactions`);

  console.log(`\nFinancial Summary:`);
  const summary = patient.financialSummary;
  console.log(`  Total Charges:         $${summary.totalCharges.toFixed(2)}`);
  console.log(`  Total Payments:        $${summary.totalPayments.toFixed(2)}`);
  console.log(`  - Insurance Payments:  $${summary.totalInsurancePayments.toFixed(2)}`);
  console.log(`  - Patient Payments:    $${summary.totalPatientPayments.toFixed(2)}`);
  console.log(`  Total Adjustments:     $${summary.totalAdjustments.toFixed(2)}`);
  console.log(`  Deductibles:          $${summary.totalDeductibles.toFixed(2)}`);
  console.log(`  Coinsurance:          $${summary.totalCoinsurance.toFixed(2)}`);
  console.log(`  Copays:               $${summary.totalCopays.toFixed(2)}`);
  console.log(`  Write-offs:           $${summary.writeOffs.toFixed(2)}`);
  console.log(`  Outstanding Balance:   $${summary.outstandingBalance.toFixed(2)}`);

  console.log(`\nClaims/Invoices:`);
  console.log(`  Total Invoices: ${patient.invoices.length}`);
  
  // Show recent invoices
  const recentInvoices = patient.invoices.slice(0, 5);
  for (const invoice of recentInvoices) {
    console.log(`  - Invoice ${invoice.invoiceNumber}: $${invoice.totalBilled.toFixed(2)} (${invoice.status})`);
    console.log(`    Service Dates: ${invoice.fromServiceDate} - ${invoice.toServiceDate}`);
  }

  console.log(`\nPayment Activity:`);
  const recentPayments = patient.payments.slice(0, 5);
  for (const payment of recentPayments) {
    console.log(`  - Payment TX ${payment.paymentTxId}: $${payment.paidAmount.toFixed(2)}`);
    if (payment.denialCodes) {
      console.log(`    Denial Codes: ${payment.denialCodes}`);
    }
    if (payment.allowedAmount) {
      console.log(`    Allowed: $${payment.allowedAmount.toFixed(2)}`);
    }
  }

  console.log("\n" + "=".repeat(50) + "\n");
}

// Generate service-level detail for analysis
console.log("=== SERVICE DETAIL ANALYSIS ===\n");

for (const patient of data) {
  const charges = patient.professionalTransactions.filter(t => t.txType === 'Charge');
  
  console.log(`\nTop Services for ${patient.patientName}:`);
  
  // Group by procedure
  const procedureGroups = new Map<number, {count: number, total: number, description: string | null}>();
  
  for (const charge of charges) {
    if (charge.procedureId) {
      const existing = procedureGroups.get(charge.procedureId) || {count: 0, total: 0, description: charge.procedureDescription};
      existing.count++;
      existing.total += charge.amount;
      procedureGroups.set(charge.procedureId, existing);
    }
  }
  
  // Sort by total amount
  const sortedProcedures = Array.from(procedureGroups.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10);
  
  for (const [procId, info] of sortedProcedures) {
    console.log(`  Procedure ${procId}: ${info.count} times, Total: $${info.total.toFixed(2)}`);
  }
}