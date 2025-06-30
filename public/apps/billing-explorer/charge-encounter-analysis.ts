import { PatientFinancialRecord } from "./financial-extractor";

// Load the extracted financial data
const data = await Bun.file("patient_financial_data.json").json() as PatientFinancialRecord[];

console.log("=== CHARGE TO ENCOUNTER LINKAGE ANALYSIS ===\n");

for (const patient of data) {
  console.log(`Patient: ${patient.patientName} (${patient.patientId})\n`);
  
  // Analyze professional charges
  const profCharges = patient.professionalTransactions.filter(t => t.txType === 'Charge');
  const chargesWithEncounters = profCharges.filter(c => c.encounterId !== null);
  const chargesWithoutEncounters = profCharges.filter(c => c.encounterId === null);
  
  console.log(`Professional Billing Charges:`);
  console.log(`  Total Charges: ${profCharges.length}`);
  console.log(`  Linked to Encounters: ${chargesWithEncounters.length} (${((chargesWithEncounters.length / profCharges.length) * 100).toFixed(1)}%)`);
  console.log(`  Not Linked: ${chargesWithoutEncounters.length} (${((chargesWithoutEncounters.length / profCharges.length) * 100).toFixed(1)}%)`);
  
  // Show examples of linked charges
  console.log(`\nExamples of Linked Charges:`);
  const linkedExamples = chargesWithEncounters.slice(0, 5);
  for (const charge of linkedExamples) {
    const encounter = patient.encounters.find(e => e.encounterId === charge.encounterId);
    console.log(`  - Charge TX ${charge.txId}: $${charge.amount.toFixed(2)} on ${charge.serviceDate}`);
    console.log(`    → Visit #${charge.visitNumber} → Encounter ${charge.encounterId}`);
    if (encounter) {
      console.log(`    → ${encounter.departmentName} (${encounter.encounterType || 'No type'})`);
    }
  }
  
  // Show unlinked charges
  if (chargesWithoutEncounters.length > 0) {
    console.log(`\nUnlinked Charges (No Encounter):`);
    const unlinkedExamples = chargesWithoutEncounters.slice(0, 5);
    for (const charge of unlinkedExamples) {
      console.log(`  - Charge TX ${charge.txId}: $${charge.amount.toFixed(2)} on ${charge.serviceDate}`);
      console.log(`    Visit #${charge.visitNumber || 'None'} - Department ID: ${charge.departmentId}`);
      
      // Try to find encounter by date and department
      const sameDay = patient.encounters.filter(e => 
        e.encounterDate === charge.serviceDate && 
        e.departmentId === charge.departmentId
      );
      if (sameDay.length > 0) {
        console.log(`    Possible matches by date/dept: ${sameDay.map(e => e.encounterId).join(', ')}`);
      }
    }
  }
  
  // Group charges by encounter
  console.log(`\n=== CHARGES GROUPED BY ENCOUNTER ===`);
  
  const encounterChargeMap = new Map<number, {encounter: any, charges: any[], total: number}>();
  
  // Initialize with encounters that have charges
  for (const charge of chargesWithEncounters) {
    if (charge.encounterId) {
      const encounter = patient.encounters.find(e => e.encounterId === charge.encounterId);
      if (encounter) {
        if (!encounterChargeMap.has(charge.encounterId)) {
          encounterChargeMap.set(charge.encounterId, {
            encounter,
            charges: [],
            total: 0
          });
        }
        const entry = encounterChargeMap.get(charge.encounterId)!;
        entry.charges.push(charge);
        entry.total += charge.amount;
      }
    }
  }
  
  // Sort by date and show top encounters by charge amount
  const sortedEncounters = Array.from(encounterChargeMap.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10);
  
  console.log(`\nTop 10 Encounters by Charge Amount:`);
  for (const [encId, data] of sortedEncounters) {
    console.log(`\nEncounter ${encId} - ${data.encounter.encounterDate}`);
    console.log(`  Department: ${data.encounter.departmentName}`);
    console.log(`  Total Charges: $${data.total.toFixed(2)} (${data.charges.length} charges)`);
    console.log(`  Services:`);
    for (const charge of data.charges.slice(0, 3)) {
      console.log(`    - Procedure ${charge.procedureId}: $${charge.amount.toFixed(2)}`);
    }
    if (data.charges.length > 3) {
      console.log(`    ... and ${data.charges.length - 3} more charges`);
    }
  }
  
  // Hospital billing analysis
  console.log(`\n\n=== HOSPITAL BILLING LINKAGE ===`);
  
  const hospCharges = patient.hospitalTransactions.filter(t => t.txType === 'Charge');
  console.log(`\nHospital Charges: ${hospCharges.length} total`);
  
  for (const har of patient.hospitalAccounts) {
    const harCharges = hospCharges.filter(c => c.hospitalAccountId === har.hospitalAccountId);
    console.log(`\nHospital Account ${har.hospitalAccountId}:`);
    console.log(`  Admission: ${har.admissionDate} - Discharge: ${har.dischargeDate}`);
    console.log(`  Linked Encounters: ${har.encounters.length}`);
    console.log(`  Charges: ${harCharges.length} totaling $${har.totalCharges.toFixed(2)}`);
    
    for (const enc of har.encounters) {
      console.log(`    - Encounter ${enc.encounterId}: ${enc.encounterDate} at ${enc.departmentName}`);
    }
  }
}