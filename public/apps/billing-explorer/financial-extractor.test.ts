import { Database } from "bun:sqlite";
import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { FinancialDataExtractor } from "./financial-extractor";

describe("FinancialDataExtractor", () => {
  let extractor: FinancialDataExtractor;
  let db: Database;

  beforeAll(() => {
    const dbPath = "c2/ehi.sqlite";
    extractor = new FinancialDataExtractor(dbPath);
    db = new Database(dbPath, { readonly: true });
  });

  afterAll(() => {
    extractor.close();
    db.close();
  });

  test("should extract guarantor information", async () => {
    // Get a sample guarantor ID
    const result = db.query("SELECT ACCOUNT_ID FROM ACCOUNT LIMIT 1").get() as any;
    const guarantor = await extractor.extractGuarantor(result.ACCOUNT_ID);

    expect(guarantor).toBeTruthy();
    expect(guarantor?.accountId).toBe(result.ACCOUNT_ID);
    expect(guarantor?.patients).toBeArray();
    expect(guarantor?.patients.length).toBeGreaterThan(0);
  });

  test("should extract patient coverages", async () => {
    // Get a sample patient ID
    const result = db.query("SELECT DISTINCT PAT_ID FROM ACCT_GUAR_PAT_INFO LIMIT 1").get() as any;
    const coverages = await extractor.extractPatientCoverages(result.PAT_ID);

    expect(coverages).toBeArray();
    if (coverages.length > 0) {
      expect(coverages[0]).toHaveProperty("coverageId");
      expect(coverages[0]).toHaveProperty("members");
      expect(coverages[0].members).toBeArray();
    }
  });

  test("should extract professional transactions", async () => {
    // Get a patient with transactions
    const result = db.query("SELECT DISTINCT PAT_ID FROM ACCT_GUAR_PAT_INFO LIMIT 1").get() as any;
    
    if (result) {
      const transactions = await extractor.extractProfessionalTransactions(result.PAT_ID);
      
      expect(transactions).toBeArray();
      if (transactions.length > 0) {
        expect(transactions[0]).toHaveProperty("txId");
        expect(transactions[0]).toHaveProperty("txType");
        expect(transactions[0]).toHaveProperty("amount");
        
        // Check if charge transactions have diagnoses
        const chargeTransaction = transactions.find(t => t.txType === "Charge");
        if (chargeTransaction) {
          expect(chargeTransaction.diagnoses).toBeArray();
        }
      }
    }
  });

  test("should extract invoices", async () => {
    // Get an account with invoices
    const result = db.query("SELECT DISTINCT ACCOUNT_ID FROM INVOICE LIMIT 1").get() as any;
    
    if (result) {
      const invoices = await extractor.extractInvoices(result.ACCOUNT_ID);
      
      expect(invoices).toBeArray();
      if (invoices.length > 0) {
        expect(invoices[0]).toHaveProperty("invoiceId");
        expect(invoices[0]).toHaveProperty("invoiceNumber");
        expect(invoices[0]).toHaveProperty("transactions");
        expect(invoices[0]).toHaveProperty("totalBilled");
        expect(invoices[0].transactions).toBeArray();
      }
    }
  });

  test("should extract encounters", async () => {
    // Get a patient with encounters
    const result = db.query("SELECT DISTINCT PAT_ID FROM PAT_ENC LIMIT 1").get() as any;
    
    if (result) {
      const encounters = await extractor.extractEncounters(result.PAT_ID);
      
      expect(encounters).toBeArray();
      if (encounters.length > 0) {
        expect(encounters[0]).toHaveProperty("encounterId");
        expect(encounters[0]).toHaveProperty("encounterDate");
        expect(encounters[0]).toHaveProperty("encounterType");
      }
    }
  });

  test("should extract hospital accounts", async () => {
    // Get a patient with hospital accounts
    const result = db.query("SELECT DISTINCT e.PAT_ID FROM PAT_ENC e WHERE e.HSP_ACCOUNT_ID IS NOT NULL LIMIT 1").get() as any;
    
    if (result) {
      const hospitalAccounts = await extractor.extractHospitalAccounts(result.PAT_ID);
      
      expect(hospitalAccounts).toBeArray();
      if (hospitalAccounts.length > 0) {
        expect(hospitalAccounts[0]).toHaveProperty("hospitalAccountId");
        expect(hospitalAccounts[0]).toHaveProperty("encounters");
        expect(hospitalAccounts[0]).toHaveProperty("transactions");
        expect(hospitalAccounts[0]).toHaveProperty("totalCharges");
      }
    }
  });

  test("should extract complete patient financial record", async () => {
    // Get a patient ID
    const result = db.query("SELECT DISTINCT PAT_ID FROM ACCT_GUAR_PAT_INFO LIMIT 1").get() as any;
    const record = await extractor.extractPatientFinancialRecord(result.PAT_ID);

    expect(record).toBeTruthy();
    expect(record?.patientId).toBe(result.PAT_ID);
    expect(record?.guarantor).toBeTruthy();
    expect(record?.coverages).toBeArray();
    expect(record?.encounters).toBeArray();
    expect(record?.hospitalAccounts).toBeArray();
    expect(record?.professionalTransactions).toBeArray();
    expect(record?.invoices).toBeArray();
    expect(record?.financialSummary).toBeTruthy();
    
    // Check financial summary structure
    const summary = record?.financialSummary;
    expect(summary).toHaveProperty("totalCharges");
    expect(summary).toHaveProperty("totalPayments");
    expect(summary).toHaveProperty("outstandingBalance");
    expect(summary?.totalCharges).toBeNumber();
    expect(summary?.totalCharges).toBeGreaterThanOrEqual(0);
  });

  test("should calculate financial summary correctly", async () => {
    // Get a patient with transactions
    const result = db.query(`
      SELECT DISTINCT PAT_ID 
      FROM ACCT_GUAR_PAT_INFO 
      LIMIT 1
    `).get() as any;
    
    if (result) {
      const record = await extractor.extractPatientFinancialRecord(result.PAT_ID);
      
      if (record) {
        const summary = record.financialSummary;
        
        // Verify that charges minus payments minus adjustments equals outstanding balance
        const calculatedBalance = summary.totalCharges - summary.totalPayments - summary.totalAdjustments;
        expect(Math.abs(calculatedBalance - summary.outstandingBalance)).toBeLessThan(0.01);
        
        // Verify that all amounts are non-negative
        expect(summary.totalCharges).toBeGreaterThanOrEqual(0);
        expect(summary.totalPayments).toBeGreaterThanOrEqual(0);
        expect(summary.totalAdjustments).toBeGreaterThanOrEqual(0);
        expect(summary.totalDeductibles).toBeGreaterThanOrEqual(0);
        expect(summary.totalCoinsurance).toBeGreaterThanOrEqual(0);
        expect(summary.totalCopays).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

// Run individual component tests
if (import.meta.main) {
  console.log("Running financial extractor tests...");
}