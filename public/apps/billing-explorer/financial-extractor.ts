import { Database } from "bun:sqlite";

// Core Entity Interfaces
export interface Guarantor {
  accountId: number;
  accountName: string;
  contactPerson: string | null;
  birthdate: string | null;
  sex: string | null;
  isActive: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  patients: PatientAccountLink[];
}

export interface PatientAccountLink {
  patientId: string;
  relationshipToGuarantor: string | null;
  addressLinked: string | null;
}

export interface Coverage {
  coverageId: number;
  coverageName: string | null;
  payorId: number | null;
  payorName: string | null;
  planId: number | null;
  planName: string | null;
  effectiveDate: string | null;
  terminationDate: string | null;
  members: CoverageMember[];
}

export interface CoverageMember {
  patientId: string;
  memberNumber: string | null;
  relationshipToSubscriber: string | null;
  effectiveFromDate: string | null;
  effectiveToDate: string | null;
  verificationStatus: string | null;
  lastVerifiedDate: string | null;
}

// Transaction Interfaces
export interface Transaction {
  txId: number;
  txType: string;
  postDate: string;
  serviceDate: string;
  amount: number;
  accountId: number;
  patientId: string;
  departmentId: number | null;
  departmentName?: string | null;
  providerId: string | null;
  procedureId: number | null;
  procedureCode: string | null;
  procedureDescription: string | null;
  modifiers: string[] | null;
}

export interface ProfessionalTransaction extends Transaction {
  encounterId: number | null;
  placeOfServiceId: number | null;
  billingProviderId: string | null;
  serviceProviderId: string | null;
  visitNumber: string | null;
  diagnoses: TransactionDiagnosis[];
  payorId?: number | null;
  paymentSource?: string | null;
}

export interface HospitalTransaction extends Transaction {
  hospitalAccountId: number;
  accountClass: string | null;
  facilityId: number | null;
  revenueCodeId: number | null;
  revenueCodeName: string | null;
  quantity: number | null;
  hcpcsCode: string | null;
  ndcCode: string | null;
}

export interface TransactionDiagnosis {
  diagnosisId: string;
  diagnosisCode: string;
  description: string | null;
  rank: number;
}

// Enhanced interfaces for dashboard display
export interface TimelineEvent {
  date: string;
  type: 'encounter' | 'charge' | 'claim' | 'payment' | 'adjustment';
  description: string;
  amount?: number;
  department?: string;
  encounterId?: number;
  transactionId?: number;
  invoiceNumber?: string;
}

// Invoice/Claim Interfaces
export interface Invoice {
  invoiceId: number;
  invoiceNumber: string;
  status: string | null;
  fromServiceDate: string | null;
  toServiceDate: string | null;
  claimType: string | null;
  coverageId: number | null;
  payorId: number | null;
  filingOrder: string | null;
  totalBilled: number;
  transactions: InvoiceTransaction[];
}

export interface InvoiceTransaction {
  txId: number;
  lineNumber: number;
  amount: number;
}

// Payment/EOB Interfaces
export interface PaymentEOB {
  paymentTxId: number;
  chargeTxId: number;
  paidAmount: number;
  allowedAmount: number | null;
  deductibleAmount: number | null;
  coinsuranceAmount: number | null;
  copayAmount: number | null;
  denialCodes: string | null;
  internalControlNumber: string | null;
  matchDate: string | null;
  action: string | null;
  actionAmount: number | null;
}

// Matching History Interfaces
export interface TransactionMatch {
  chargeTxId: number;
  paymentTxId: number;
  matchedAmount: number;
  insuranceAmount: number | null;
  patientAmount: number | null;
  matchDate: string;
  unmatchDate: string | null;
  coverageId: number | null;
  invoiceNumber: string | null;
}

// Encounter/Hospital Account Interfaces
export interface Encounter {
  encounterId: number;
  patientId: string;
  encounterDate: string;
  encounterType: string | null;
  departmentId: number | null;
  departmentName: string | null;
  hospitalAccountId: number | null;
}

export interface HospitalAccount {
  hospitalAccountId: number;
  patientId: string;
  admissionDate: string | null;
  dischargeDate: string | null;
  accountClass: string | null;
  financialClass: string | null;
  totalCharges: number;
  encounters: Encounter[];
  transactions: HospitalTransaction[];
}

// Flow data for Sankey diagram
export interface FinancialFlow {
  source: string;
  target: string;
  value: number;
  type: 'charge' | 'payment' | 'adjustment' | 'responsibility';
}

// Department summary
export interface DepartmentSummary {
  departmentId: number;
  departmentName: string;
  visitCount: number;
  totalCharges: number;
  totalPayments: number;
  balance: number;
}

// Monthly summary
export interface MonthlySummary {
  month: string; // YYYY-MM format
  charges: number;
  payments: number;
  adjustments: number;
  balance: number;
  visitCount: number;
}

// Enhanced encounter with financial summary
export interface EnhancedEncounter extends Encounter {
  charges: number;
  payments: number;
  balance: number;
  daysSinceEncounter?: number;
  encounterDetails?: string;
  procedures?: string[];
  diagnoses?: string[];
  providers?: string[];
  labs?: string[];
  medications?: string[];
}

// Workflow audit trail interfaces
export interface WorkflowEvent {
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  category: 'encounter' | 'charge' | 'payment' | 'insurance' | 'claim' | 'adjustment' | 'verification';
  department?: string;
  details?: string;
  relatedId?: string | number;
  duration?: number; // Time to next step in minutes
}

export interface WorkflowSummary {
  totalSteps: number;
  uniqueUsers: number;
  averageStepDuration: number;
  departmentsInvolved: string[];
  firstAction: string;
  lastAction: string;
  totalDuration: number; // In days
}

// Comprehensive Patient Financial Record
export interface PatientFinancialRecord {
  patientId: string;
  patientName: string | null;
  guarantor: Guarantor;
  coverages: Coverage[];
  encounters: Encounter[];
  hospitalAccounts: HospitalAccount[];
  professionalTransactions: ProfessionalTransaction[];
  hospitalTransactions: HospitalTransaction[];
  invoices: Invoice[];
  payments: PaymentEOB[];
  matches: TransactionMatch[];
  financialSummary: FinancialSummary;
  // Enhanced fields for dashboard
  timeline?: TimelineEvent[];
  financialFlows?: FinancialFlow[];
  departmentSummaries?: DepartmentSummary[];
  monthlySummaries?: MonthlySummary[];
  enhancedEncounters?: EnhancedEncounter[];
  workflowAuditTrail?: WorkflowEvent[];
  workflowSummary?: WorkflowSummary;
}

export interface FinancialSummary {
  totalCharges: number;
  totalPayments: number;
  totalAdjustments: number;
  totalInsurancePayments: number;
  totalPatientPayments: number;
  totalDeductibles: number;
  totalCoinsurance: number;
  totalCopays: number;
  outstandingBalance: number;
  writeOffs: number;
}

// Database connection and extraction logic
export class FinancialDataExtractor {
  private db: Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath, { readonly: true });
  }
  
  // Get provider name by ID
  private getProviderName(providerId: string): string {
    if (!providerId) return '';
    try {
      const result = this.db.query(`SELECT PROV_NAME FROM CLARITY_SER WHERE PROV_ID = ?`).get(providerId) as any;
      return result?.PROV_NAME || providerId;
    } catch {
      return providerId;
    }
  }

  // Extract guarantor information with linked patients
  async extractGuarantor(accountId: number): Promise<Guarantor | null> {
    const guarantorQuery = `
      SELECT 
        ACCOUNT_ID as accountId,
        ACCOUNT_NAME as accountName,
        CONTACT_PERSON as contactPerson,
        BIRTHDATE as birthdate,
        SEX as sex,
        IS_ACTIVE as isActive,
        CITY as city,
        STATE_C_NAME as state,
        ZIP as zip
      FROM ACCOUNT
      WHERE ACCOUNT_ID = ?
    `;

    const guarantor = this.db.query(guarantorQuery).get(accountId) as any;
    if (!guarantor) return null;

    // Get linked patients
    const patientsQuery = `
      SELECT 
        PAT_ID as patientId,
        GUAR_REL_TO_PAT_C_NAME as relationshipToGuarantor,
        PATIENT_ADDR_LINKED_YN as addressLinked
      FROM ACCT_GUAR_PAT_INFO
      WHERE ACCOUNT_ID = ?
      ORDER BY LINE
    `;

    const patients = this.db.query(patientsQuery).all(accountId) as PatientAccountLink[];
    
    return {
      ...guarantor,
      patients
    };
  }

  // Extract coverage information for a patient
  async extractPatientCoverages(patientId: string): Promise<Coverage[]> {
    const coverageQuery = `
      SELECT DISTINCT
        c.COVERAGE_ID as coverageId,
        NULL as coverageName,
        c.PAYOR_ID as payorId,
        c.PAYOR_ID_PAYOR_NAME as payorName,
        c.PLAN_ID as planId,
        c.PLAN_ID_BENEFIT_PLAN_NAME as planName,
        NULL as effectiveDate,
        NULL as terminationDate
      FROM COVERAGE c
      INNER JOIN COVERAGE_MEMBER_LIST cm ON c.COVERAGE_ID = cm.COVERAGE_ID
      WHERE cm.PAT_ID = ?
    `;

    const coverages = this.db.query(coverageQuery).all(patientId) as any[];

    // Get member details for each coverage
    for (const coverage of coverages) {
      const memberQuery = `
        SELECT 
          PAT_ID as patientId,
          MEM_NUMBER as memberNumber,
          MEM_REL_TO_SUB_C_NAME as relationshipToSubscriber,
          MEM_EFF_FROM_DATE as effectiveFromDate,
          MEM_EFF_TO_DATE as effectiveToDate,
          MEM_VERIF_STAT_C_NAME as verificationStatus,
          LAST_VERIF_DATE as lastVerifiedDate
        FROM COVERAGE_MEMBER_LIST
        WHERE COVERAGE_ID = ? AND PAT_ID = ?
      `;

      const members = this.db.query(memberQuery).all(coverage.coverageId, patientId) as CoverageMember[];
      coverage.members = members;
    }

    return coverages;
  }

  // Extract professional billing transactions
  async extractProfessionalTransactions(patientId: string): Promise<ProfessionalTransaction[]> {
    // First get the account ID for this patient
    const accountQuery = `SELECT ACCOUNT_ID FROM ACCT_GUAR_PAT_INFO WHERE PAT_ID = ? LIMIT 1`;
    const accountResult = this.db.query(accountQuery).get(patientId) as any;
    
    if (!accountResult) return [];
    
    const txQuery = `
      SELECT 
        t.TX_ID as txId,
        t.TX_TYPE_C_NAME as txType,
        t.POST_DATE as postDate,
        t.SERVICE_DATE as serviceDate,
        t.AMOUNT as amount,
        t.ACCOUNT_ID as accountId,
        ? as patientId,
        t.DEPARTMENT_ID as departmentId,
        d.DEPARTMENT_NAME as departmentName,
        t.SERV_PROVIDER_ID as serviceProviderId,
        t.BILLING_PROV_ID as billingProviderId,
        t.PROC_ID as procedureId,
        NULL as procedureCode,
        CASE 
          WHEN d.DEPARTMENT_NAME LIKE '%LAB%' THEN 'Laboratory Services'
          WHEN d.DEPARTMENT_NAME LIKE '%INTERNAL%' THEN 'Office Visit'
          WHEN d.DEPARTMENT_NAME LIKE '%OT%' THEN 'Occupational Therapy'
          ELSE 'Medical Service'
        END as procedureDescription,
        t.MODIFIER_ONE as modifier1,
        t.MODIFIER_TWO as modifier2,
        v.PRIM_ENC_CSN_ID as encounterId,
        t.POS_ID as placeOfServiceId,
        t.VISIT_NUMBER as visitNumber,
        t.PAYOR_ID as payorId,
        t.PAYMENT_SOURCE_C_NAME as paymentSource
      FROM ARPB_TRANSACTIONS t
      LEFT JOIN CLARITY_DEP d ON t.DEPARTMENT_ID = d.DEPARTMENT_ID
      LEFT JOIN (
        SELECT DISTINCT PB_VISIT_NUM, PRIM_ENC_CSN_ID 
        FROM ARPB_VISITS 
        WHERE PRIM_ENC_CSN_ID IS NOT NULL
      ) v ON t.VISIT_NUMBER = v.PB_VISIT_NUM
      WHERE t.ACCOUNT_ID = ?
      ORDER BY t.SERVICE_DATE DESC, t.TX_ID
    `;

    const transactions = this.db.query(txQuery).all(patientId, accountResult.ACCOUNT_ID) as any[];

    // Get diagnoses for charge transactions
    for (const tx of transactions) {
      if (tx.txType === 'Charge') {
        tx.diagnoses = await this.extractTransactionDiagnoses(tx.txId);
      }
      
      // Parse modifiers
      tx.modifiers = [tx.modifier1, tx.modifier2].filter(m => m);
      delete tx.modifier1;
      delete tx.modifier2;
    }

    return transactions as ProfessionalTransaction[];
  }

  // Extract transaction diagnoses
  private async extractTransactionDiagnoses(txId: number): Promise<TransactionDiagnosis[]> {
    const dxQuery = `
      SELECT 
        DX_ID as diagnosisId,
        DX_ID as diagnosisCode,
        DX_QUALIFIER_C_NAME as description,
        LINE as rank
      FROM ARPB_CHG_ENTRY_DX
      WHERE TX_ID = ?
      ORDER BY LINE
    `;

    return this.db.query(dxQuery).all(txId) as TransactionDiagnosis[];
  }

  // Extract invoices and their transactions
  async extractInvoices(accountId: number): Promise<Invoice[]> {
    const invoiceQuery = `
      SELECT DISTINCT
        i.INVOICE_ID as invoiceId,
        ib.INV_NUM as invoiceNumber,
        ib.INV_STATUS_C_NAME as status,
        ib.FROM_SVC_DATE as fromServiceDate,
        ib.TO_SVC_DATE as toServiceDate,
        ib.INV_TYPE_C_NAME as claimType,
        ib.CVG_ID as coverageId,
        ib.EPM_ID as payorId,
        ib.FILING_ORDER_C_NAME as filingOrder
      FROM INVOICE i
      INNER JOIN INV_BASIC_INFO ib ON i.INVOICE_ID = ib.INV_ID
      WHERE i.ACCOUNT_ID = ?
      ORDER BY ib.INV_NUM
    `;

    const invoices = this.db.query(invoiceQuery).all(accountId) as any[];

    // Get transactions for each invoice
    for (const invoice of invoices) {
      const txQuery = `
        SELECT 
          itp.TX_ID as txId,
          itp.LINE as lineNumber,
          t.AMOUNT as amount
        FROM INV_TX_PIECES itp
        INNER JOIN ARPB_TRANSACTIONS t ON itp.TX_ID = t.TX_ID
        WHERE itp.INV_ID = ?
        ORDER BY itp.LINE, itp.TX_PIECE
      `;

      invoice.transactions = this.db.query(txQuery).all(invoice.invoiceId) as InvoiceTransaction[];
      
      // Calculate total billed
      invoice.totalBilled = invoice.transactions.reduce((sum: number, t: InvoiceTransaction) => sum + (t.amount || 0), 0);
    }

    return invoices;
  }

  // Extract payment EOB information
  async extractPaymentEOBs(patientId: string): Promise<PaymentEOB[]> {
    // Get account ID for this patient
    const accountQuery = `SELECT ACCOUNT_ID FROM ACCT_GUAR_PAT_INFO WHERE PAT_ID = ? LIMIT 1`;
    const accountResult = this.db.query(accountQuery).get(patientId) as any;
    
    if (!accountResult) return [];
    
    const eobQuery = `
      SELECT 
        e.TX_ID as paymentTxId,
        e.PEOB_TX_ID as chargeTxId,
        e.PAID_AMT as paidAmount,
        e.CVD_AMT as allowedAmount,
        e.DED_AMT as deductibleAmount,
        e.COINS_AMT as coinsuranceAmount,
        e.COPAY_AMT as copayAmount,
        e.DENIAL_CODES as denialCodes,
        e.ICN as internalControlNumber,
        e.TX_MATCH_DATE as matchDate,
        e.PEOB_ACTION_C_NAME as action,
        e.ACTION_AMT as actionAmount
      FROM PMT_EOB_INFO_I e
      INNER JOIN ARPB_TRANSACTIONS t ON e.PEOB_TX_ID = t.TX_ID
      WHERE t.ACCOUNT_ID = ?
    `;

    return this.db.query(eobQuery).all(accountResult.ACCOUNT_ID) as PaymentEOB[];
  }

  // Extract transaction matching history
  async extractTransactionMatches(accountId: number): Promise<TransactionMatch[]> {
    const matchQuery = `
      SELECT 
        m.TX_ID as chargeTxId,
        m.MTCH_TX_HX_ID as paymentTxId,
        m.MTCH_TX_HX_AMT as matchedAmount,
        m.MTCH_TX_HX_INS_AMT as insuranceAmount,
        m.MTCH_TX_HX_PAT_AMT as patientAmount,
        m.MTCH_TX_HX_DT as matchDate,
        m.MTCH_TX_HX_UN_DT as unmatchDate,
        m.MTCH_TX_HX_D_CVG_ID as coverageId,
        m.MTCH_TX_HX_INV_NUM as invoiceNumber
      FROM ARPB_TX_MATCH_HX m
      INNER JOIN ARPB_TRANSACTIONS t ON m.TX_ID = t.TX_ID
      WHERE t.ACCOUNT_ID = ?
      ORDER BY m.MTCH_TX_HX_DT DESC
    `;

    return this.db.query(matchQuery).all(accountId) as TransactionMatch[];
  }

  // Extract encounters for a patient
  async extractEncounters(patientId: string): Promise<Encounter[]> {
    const encounterQuery = `
      SELECT 
        e.PAT_ENC_CSN_ID as encounterId,
        e.PAT_ID as patientId,
        e.CONTACT_DATE as encounterDate,
        e.HOSP_ADMSN_TYPE_C_NAME as encounterType,
        e.DEPARTMENT_ID as departmentId,
        d.DEPARTMENT_NAME as departmentName,
        e.HSP_ACCOUNT_ID as hospitalAccountId
      FROM PAT_ENC e
      LEFT JOIN CLARITY_DEP d ON e.DEPARTMENT_ID = d.DEPARTMENT_ID
      WHERE e.PAT_ID = ?
        -- Filter out CLARITY ETL system-generated encounters
        AND NOT (e.DEPARTMENT_ID IS NULL AND e.ENC_CREATE_USER_ID_NAME = 'CLARITY ETL')
      ORDER BY e.CONTACT_DATE DESC
    `;

    return this.db.query(encounterQuery).all(patientId) as Encounter[];
  }

  // Extract hospital accounts and transactions
  async extractHospitalAccounts(patientId: string): Promise<HospitalAccount[]> {
    // Get hospital accounts through encounters
    const harQuery = `
      SELECT DISTINCT
        h.HSP_ACCOUNT_ID as hospitalAccountId,
        ? as patientId,
        h.ADM_DATE_TIME as admissionDate,
        h.DISCH_DATE_TIME as dischargeDate,
        h.ACCT_CLASS_HA_C_NAME as accountClass,
        h.ACCT_FIN_CLASS_C_NAME as financialClass
      FROM HSP_ACCOUNT h
      INNER JOIN PAT_ENC e ON h.HSP_ACCOUNT_ID = e.HSP_ACCOUNT_ID
      WHERE e.PAT_ID = ?
    `;

    const accounts = this.db.query(harQuery).all(patientId, patientId) as any[];

    for (const account of accounts) {
      // Get encounters for this HAR
      account.encounters = await this.extractEncountersForHAR(account.hospitalAccountId);
      
      // Get hospital transactions
      account.transactions = await this.extractHospitalTransactions(account.hospitalAccountId);
      
      // Calculate total charges
      account.totalCharges = account.transactions
        .filter((t: HospitalTransaction) => t.txType === 'Charge')
        .reduce((sum: number, t: HospitalTransaction) => sum + (t.amount || 0), 0);
    }

    return accounts;
  }

  private async extractEncountersForHAR(hospitalAccountId: number): Promise<Encounter[]> {
    const query = `
      SELECT 
        e.PAT_ENC_CSN_ID as encounterId,
        e.PAT_ID as patientId,
        e.CONTACT_DATE as encounterDate,
        e.HOSP_ADMSN_TYPE_C_NAME as encounterType,
        e.DEPARTMENT_ID as departmentId,
        d.DEPARTMENT_NAME as departmentName,
        e.HSP_ACCOUNT_ID as hospitalAccountId
      FROM PAT_ENC e
      LEFT JOIN CLARITY_DEP d ON e.DEPARTMENT_ID = d.DEPARTMENT_ID
      WHERE e.HSP_ACCOUNT_ID = ?
      ORDER BY e.CONTACT_DATE
    `;

    return this.db.query(query).all(hospitalAccountId) as Encounter[];
  }

  private async extractHospitalTransactions(hospitalAccountId: number): Promise<HospitalTransaction[]> {
    const query = `
      SELECT 
        t.TX_ID as txId,
        t.TX_TYPE_HA_C_NAME as txType,
        t.TX_POST_DATE as postDate,
        t.SERVICE_DATE as serviceDate,
        t.TX_AMOUNT as amount,
        t.HSP_ACCOUNT_ID as hospitalAccountId,
        t.ACCT_CLASS_HA_C_NAME as accountClass,
        t.DEPARTMENT as departmentId,
        d.DEPARTMENT_NAME as departmentName,
        t.BILLING_PROV_ID as providerId,
        t.PROC_ID as procedureId,
        t.PROCEDURE_DESC as procedureDescription,
        t.FACILITY_ID as facilityId,
        t.UB_REV_CODE_ID as revenueCodeId,
        t.UB_REV_CODE_ID_REVENUE_CODE_NAME as revenueCodeName,
        t.QUANTITY as quantity,
        t.HCPCS_CODE as hcpcsCode,
        t.NDC_ID_NDC_CODE as ndcCode,
        t.MODIFIERS as modifiers
      FROM HSP_TRANSACTIONS t
      LEFT JOIN CLARITY_DEP d ON t.DEPARTMENT = d.DEPARTMENT_ID
      WHERE t.HSP_ACCOUNT_ID = ?
      ORDER BY t.SERVICE_DATE DESC, t.TX_ID
    `;

    const transactions = this.db.query(query).all(hospitalAccountId) as any[];
    
    // Parse modifiers
    for (const tx of transactions) {
      tx.modifiers = tx.modifiers ? tx.modifiers.split(',').filter((m: string) => m) : null;
      // Note: We need to extract patientId separately through encounters
      const patResult = this.db.query(`SELECT DISTINCT PAT_ID FROM PAT_ENC WHERE HSP_ACCOUNT_ID = ? LIMIT 1`).get(hospitalAccountId) as any;
      tx.patientId = patResult?.PAT_ID || '';
      tx.accountId = 0; // Not applicable for hospital transactions
    }

    return transactions as HospitalTransaction[];
  }

  // Calculate financial summary
  private calculateFinancialSummary(
    profTx: ProfessionalTransaction[],
    hospTx: HospitalTransaction[],
    payments: PaymentEOB[]
  ): FinancialSummary {
    const charges = [...profTx, ...hospTx].filter(t => t.txType === 'Charge');
    const paymentTx = [...profTx, ...hospTx].filter(t => t.txType === 'Payment');
    const adjustments = [...profTx, ...hospTx].filter(t => 
      t.txType === 'Adjustment' || 
      t.txType === 'Credit Adjustment' || 
      t.txType === 'Debit Adjustment' ||
      t.txType === 'Write-Off'
    );

    const totalCharges = charges.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
    const totalPayments = paymentTx.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
    
    // For adjustments, we need to calculate the net effect
    // Credit adjustments reduce the balance, debit adjustments increase it
    const totalAdjustments = adjustments.reduce((sum, t) => {
      if (t.txType === 'Adjustment' || t.txType === 'Credit Adjustment' || t.txType === 'Write-Off') {
        return sum + Math.abs(t.amount || 0);
      } else if (t.txType === 'Debit Adjustment') {
        return sum - Math.abs(t.amount || 0);
      }
      return sum;
    }, 0);

    // Calculate from EOB data
    const totalDeductibles = payments.reduce((sum, p) => sum + (p.deductibleAmount || 0), 0);
    const totalCoinsurance = payments.reduce((sum, p) => sum + (p.coinsuranceAmount || 0), 0);
    const totalCopays = payments.reduce((sum, p) => sum + (p.copayAmount || 0), 0);

    // Calculate insurance vs patient payments from transaction data
    // Since EOB data may be incomplete, we'll use the PAYOR_ID and PAYMENT_SOURCE to determine source
    let totalInsurancePayments = 0;
    let totalPatientPayments = 0;
    
    paymentTx.forEach(tx => {
      const amount = Math.abs(tx.amount);
      // Check if this is a professional transaction with payor info
      if ('payorId' in tx && tx.payorId && tx.payorId > 0) {
        totalInsurancePayments += amount;
      } else if ('paymentSource' in tx && 
                 ['Online Payment', 'Credit Card', 'Cash', 'Check'].includes(tx.paymentSource) && 
                 !('payorId' in tx && tx.payorId)) {
        totalPatientPayments += amount;
      } else {
        // Default: small payments likely patient, large likely insurance
        if (amount < 50) {
          totalPatientPayments += amount;
        } else {
          totalInsurancePayments += amount;
        }
      }
    });
    
    // If we have EOB data, use it to refine the split
    if (payments.length > 0) {
      const eobInsurance = payments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
      if (eobInsurance > 0) {
        // EOB data is more accurate, adjust if needed
        totalInsurancePayments = Math.max(totalInsurancePayments, eobInsurance);
        totalPatientPayments = totalPayments - totalInsurancePayments;
      }
    }

    // Calculate actual outstanding balance
    // This should match the sum of all transactions
    const allTransactions = [...profTx, ...hospTx];
    const actualBalance = allTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const outstandingBalance = Math.max(0, actualBalance);
    const writeOffs = adjustments.filter(a => a.amount < 0).reduce((sum, a) => sum + Math.abs(a.amount), 0);

    return {
      totalCharges,
      totalPayments,
      totalAdjustments,
      totalInsurancePayments,
      totalPatientPayments,
      totalDeductibles,
      totalCoinsurance,
      totalCopays,
      outstandingBalance,
      writeOffs
    };
  }

  // Generate timeline events
  private generateTimeline(
    encounters: Encounter[],
    profTx: ProfessionalTransaction[],
    hospTx: HospitalTransaction[],
    invoices: Invoice[],
    hospitalAccounts: HospitalAccount[] = []
  ): TimelineEvent[] {
    const events: TimelineEvent[] = [];

    // Add encounters
    for (const enc of encounters) {
      events.push({
        date: enc.encounterDate,
        type: 'encounter',
        description: `Visit to ${enc.departmentName || 'Unknown Department'}`,
        department: enc.departmentName || undefined,
        encounterId: enc.encounterId
      });
    }
    
    // Add hospital admissions and discharges
    for (const har of hospitalAccounts) {
      if (har.admissionDate) {
        events.push({
          date: har.admissionDate,
          type: 'encounter',
          description: 'Hospital admission',
          department: 'Hospital',
          encounterId: har.hospitalAccountId
        });
      }
      if (har.dischargeDate) {
        events.push({
          date: har.dischargeDate,
          type: 'encounter',
          description: 'Hospital discharge',
          department: 'Hospital',
          encounterId: har.hospitalAccountId + 1000000 // Ensure unique ID
        });
      }
    }

    // Add charges
    const charges = [...profTx, ...hospTx].filter(t => t.txType === 'Charge');
    for (const charge of charges) {
      const isHospital = 'hospitalAccountId' in charge;
      events.push({
        date: charge.serviceDate,
        type: 'charge',
        description: `${isHospital ? 'Hospital' : 'Professional'} charge`,
        amount: charge.amount,
        transactionId: charge.txId
      });
    }

    // Add claims
    for (const invoice of invoices) {
      if (invoice.fromServiceDate) {
        events.push({
          date: invoice.fromServiceDate,
          type: 'claim',
          description: `Claim ${invoice.invoiceNumber} (${invoice.status})`,
          amount: invoice.totalBilled,
          invoiceNumber: invoice.invoiceNumber
        });
      }
    }

    // Add payments
    const payments = [...profTx, ...hospTx].filter(t => t.txType === 'Payment');
    for (const payment of payments) {
      events.push({
        date: payment.postDate,
        type: 'payment',
        description: 'Payment received',
        amount: Math.abs(payment.amount),
        transactionId: payment.txId
      });
    }

    // Sort by date
    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  // Generate financial flows for Sankey diagram
  private generateFinancialFlows(
    profTx: ProfessionalTransaction[],
    hospTx: HospitalTransaction[],
    payments: PaymentEOB[],
    financialSummary: FinancialSummary,
    departmentSummaries: DepartmentSummary[]
  ): FinancialFlow[] {
    const flows: FinancialFlow[] = [];

    // Create a true flow diagram where 100% of charges flow to outcomes
    // Column 1: Initial charges by department/service
    // Column 2: Where those charges went (paid by insurance, paid by patient, adjusted, outstanding)
    
    // Get departments with charges and create flows
    const deptsWithCharges = departmentSummaries.filter(d => d.totalCharges > 0);
    const topDepts = deptsWithCharges.slice(0, 5).sort((a, b) => b.totalCharges - a.totalCharges);
    
    // Calculate the proportion of each outcome relative to total charges
    const insuranceRatio = financialSummary.totalInsurancePayments / financialSummary.totalCharges;
    const patientRatio = financialSummary.totalPatientPayments / financialSummary.totalCharges;
    const adjustmentRatio = financialSummary.totalAdjustments / financialSummary.totalCharges;
    const outstandingRatio = financialSummary.outstandingBalance / financialSummary.totalCharges;
    
    // For each department, split its charges proportionally
    topDepts.forEach(dept => {
      if (dept.totalCharges > 0) {
        // Insurance portion
        if (insuranceRatio > 0) {
          flows.push({
            source: dept.departmentName,
            target: 'Insurance Paid',
            value: dept.totalCharges * insuranceRatio,
            type: 'payment'
          });
        }
        
        // Patient portion
        if (patientRatio > 0) {
          flows.push({
            source: dept.departmentName,
            target: 'Patient Paid',
            value: dept.totalCharges * patientRatio,
            type: 'payment'
          });
        }
        
        // Adjustments portion
        if (adjustmentRatio > 0) {
          flows.push({
            source: dept.departmentName,
            target: 'Adjusted/Written Off',
            value: dept.totalCharges * adjustmentRatio,
            type: 'adjustment'
          });
        }
        
        // Outstanding portion
        if (outstandingRatio > 0) {
          flows.push({
            source: dept.departmentName,
            target: 'Outstanding Balance',
            value: dept.totalCharges * outstandingRatio,
            type: 'outstanding'
          });
        }
      }
    });
    
    // Handle remaining departments as "Other"
    const topDeptCharges = topDepts.reduce((sum, d) => sum + d.totalCharges, 0);
    const totalDeptCharges = deptsWithCharges.reduce((sum, d) => sum + d.totalCharges, 0);
    const otherCharges = totalDeptCharges - topDeptCharges;
    
    if (otherCharges > 0) {
      if (insuranceRatio > 0) {
        flows.push({
          source: 'Other Services',
          target: 'Insurance Paid',
          value: otherCharges * insuranceRatio,
          type: 'payment'
        });
      }
      
      if (patientRatio > 0) {
        flows.push({
          source: 'Other Services',
          target: 'Patient Paid',
          value: otherCharges * patientRatio,
          type: 'payment'
        });
      }
      
      if (adjustmentRatio > 0) {
        flows.push({
          source: 'Other Services',
          target: 'Adjusted/Written Off',
          value: otherCharges * adjustmentRatio,
          type: 'adjustment'
        });
      }
      
      if (outstandingRatio > 0) {
        flows.push({
          source: 'Other Services',
          target: 'Outstanding Balance',
          value: otherCharges * outstandingRatio,
          type: 'outstanding'
        });
      }
    }
    
    // Handle any unaccounted charges (due to departments without charges having payments)
    const flowedCharges = flows.filter(f => f.type === 'payment' || f.type === 'adjustment' || f.type === 'outstanding')
      .reduce((sum, f) => sum + f.value, 0);
    const unaccountedCharges = financialSummary.totalCharges - flowedCharges;
    
    if (unaccountedCharges > 0.01) { // Small tolerance for rounding
      // These are charges from departments we didn't include
      flows.push({
        source: 'Unallocated Services',
        target: 'Insurance Paid',
        value: unaccountedCharges * insuranceRatio,
        type: 'payment'
      });
      
      if (patientRatio > 0) {
        flows.push({
          source: 'Unallocated Services',
          target: 'Patient Paid',
          value: unaccountedCharges * patientRatio,
          type: 'payment'
        });
      }
      
      if (adjustmentRatio > 0) {
        flows.push({
          source: 'Unallocated Services',
          target: 'Adjusted/Written Off',
          value: unaccountedCharges * adjustmentRatio,
          type: 'adjustment'
        });
      }
      
      if (outstandingRatio > 0) {
        flows.push({
          source: 'Unallocated Services',
          target: 'Outstanding Balance',
          value: unaccountedCharges * outstandingRatio,
          type: 'outstanding'
        });
      }
    }
    
    return flows;
  }

  // Helper to get department name from transaction
  private getDepartmentName(tx: any): string {
    return tx.departmentName || 'Unknown Department';
  }

  // Generate department summaries
  private generateDepartmentSummaries(
    encounters: Encounter[],
    profTx: ProfessionalTransaction[],
    hospTx: HospitalTransaction[] = []
  ): DepartmentSummary[] {
    const deptMap = new Map<number, DepartmentSummary>();

    // Initialize from encounters
    for (const enc of encounters) {
      if (enc.departmentId) {
        if (!deptMap.has(enc.departmentId)) {
          deptMap.set(enc.departmentId, {
            departmentId: enc.departmentId,
            departmentName: enc.departmentName || 'Unknown',
            visitCount: 0,
            totalCharges: 0,
            totalPayments: 0,
            balance: 0
          });
        }
        deptMap.get(enc.departmentId)!.visitCount++;
      }
    }

    // Add financial data from professional transactions
    for (const tx of profTx) {
      if (tx.departmentId && deptMap.has(tx.departmentId)) {
        const dept = deptMap.get(tx.departmentId)!;
        if (tx.txType === 'Charge') {
          dept.totalCharges += tx.amount;
        } else if (tx.txType === 'Payment') {
          dept.totalPayments += Math.abs(tx.amount);
        }
      }
    }
    
    // Add financial data from hospital transactions
    for (const tx of hospTx) {
      if (tx.departmentId) {
        // Initialize department if not already present
        if (!deptMap.has(tx.departmentId)) {
          deptMap.set(tx.departmentId, {
            departmentId: tx.departmentId,
            departmentName: tx.departmentName || 'Unknown',
            visitCount: 0,
            totalCharges: 0,
            totalPayments: 0,
            balance: 0
          });
        }
        
        const dept = deptMap.get(tx.departmentId)!;
        if (tx.txType === 'Charge') {
          dept.totalCharges += tx.amount;
        } else if (tx.txType === 'Payment') {
          dept.totalPayments += Math.abs(tx.amount);
        }
      }
    }

    // Calculate balances
    for (const dept of deptMap.values()) {
      dept.balance = dept.totalCharges - dept.totalPayments;
    }

    return Array.from(deptMap.values())
      .filter(d => d.visitCount > 0 || d.totalCharges > 0)
      .sort((a, b) => b.totalCharges - a.totalCharges);
  }

  // Generate monthly summaries
  private generateMonthlySummaries(
    encounters: Encounter[],
    profTx: ProfessionalTransaction[],
    hospTx: HospitalTransaction[]
  ): MonthlySummary[] {
    const monthMap = new Map<string, MonthlySummary>();

    // Helper to get YYYY-MM format
    const getMonth = (dateStr: string) => {
      const date = new Date(dateStr);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    };

    // Count visits by month
    for (const enc of encounters) {
      const month = getMonth(enc.encounterDate);
      if (!monthMap.has(month)) {
        monthMap.set(month, {
          month,
          charges: 0,
          payments: 0,
          adjustments: 0,
          balance: 0,
          visitCount: 0
        });
      }
      monthMap.get(month)!.visitCount++;
    }

    // Add transaction data
    const allTx = [...profTx, ...hospTx];
    for (const tx of allTx) {
      const month = getMonth(tx.serviceDate);
      if (!monthMap.has(month)) {
        monthMap.set(month, {
          month,
          charges: 0,
          payments: 0,
          adjustments: 0,
          balance: 0,
          visitCount: 0
        });
      }
      
      const summary = monthMap.get(month)!;
      if (tx.txType === 'Charge') {
        summary.charges += tx.amount;
      } else if (tx.txType === 'Payment') {
        summary.payments += Math.abs(tx.amount);
      } else if (tx.txType === 'Adjustment') {
        summary.adjustments += tx.amount;
      }
    }

    // Calculate balances
    for (const summary of monthMap.values()) {
      summary.balance = summary.charges - summary.payments - Math.abs(summary.adjustments);
    }

    return Array.from(monthMap.values())
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  // Enhance encounters with financial data
  private enhanceEncounters(
    encounters: Encounter[],
    profTx: ProfessionalTransaction[],
    hospTx: HospitalTransaction[] = [],
    hospitalAccounts: HospitalAccount[] = []
  ): EnhancedEncounter[] {
    const today = new Date();
    const enhanced: EnhancedEncounter[] = [];
    
    // First, let's allocate unlinked payments to encounters
    const unlinkedPayments = profTx.filter(t => t.txType === 'Payment' && !t.encounterId);
    const allocatedPayments = new Map<number, number>(); // encounterId -> allocated amount
    const allocatedAdjustments = new Map<number, number>(); // encounterId -> allocated adjustments
    
    // Get all charges grouped by encounter
    const chargesByEncounter = new Map<number, ProfessionalTransaction[]>();
    profTx.filter(t => t.txType === 'Charge' && t.encounterId).forEach(charge => {
      if (!chargesByEncounter.has(charge.encounterId!)) {
        chargesByEncounter.set(charge.encounterId!, []);
      }
      chargesByEncounter.get(charge.encounterId!)!.push(charge);
    });
    
    // Also allocate unlinked adjustments
    const unlinkedAdjustments = profTx.filter(t => 
      (t.txType === 'Adjustment' || t.txType === 'Credit Adjustment' || 
       t.txType === 'Debit Adjustment' || t.txType === 'Write-Off') && !t.encounterId
    );
    
    // Sort encounters by date (oldest first) for FIFO payment allocation
    const sortedEncounters = [...encounters].sort((a, b) => 
      new Date(a.encounterDate).getTime() - new Date(b.encounterDate).getTime()
    );
    
    // Calculate running balances and allocate payments/adjustments
    let remainingPayments = unlinkedPayments.reduce((sum, p) => sum + Math.abs(p.amount), 0);
    let remainingAdjustments = unlinkedAdjustments.reduce((sum, a) => {
      if (a.txType === 'Credit Adjustment' || a.txType === 'Write-Off' || a.txType === 'Adjustment') {
        return sum + Math.abs(a.amount);
      } else if (a.txType === 'Debit Adjustment') {
        return sum - Math.abs(a.amount);
      }
      return sum;
    }, 0);
    
    for (const enc of sortedEncounters) {
      if (remainingPayments <= 0 && remainingAdjustments <= 0) break;
      
      const encCharges = chargesByEncounter.get(enc.encounterId) || [];
      const chargeTotal = encCharges.reduce((sum, c) => sum + c.amount, 0);
      
      if (chargeTotal > 0) {
        // Allocate adjustments first (they reduce what needs to be paid)
        if (remainingAdjustments > 0) {
          const allocatedAdj = Math.min(chargeTotal, remainingAdjustments);
          allocatedAdjustments.set(enc.encounterId, allocatedAdj);
          remainingAdjustments -= allocatedAdj;
        }
        
        // Then allocate payments to remaining balance
        const adjustedCharges = chargeTotal - (allocatedAdjustments.get(enc.encounterId) || 0);
        if (adjustedCharges > 0 && remainingPayments > 0) {
          const allocatedPmt = Math.min(adjustedCharges, remainingPayments);
          allocatedPayments.set(enc.encounterId, allocatedPmt);
          remainingPayments -= allocatedPmt;
        }
      }
    }
    
    for (const enc of encounters) {
      // Get all transactions for this encounter
      const encProfTx = profTx.filter(t => t.encounterId === enc.encounterId);
      const encCharges = encProfTx.filter(t => t.txType === 'Charge');
      const encPayments = encProfTx.filter(t => t.txType === 'Payment');
      
      const charges = encCharges.reduce((sum, t) => sum + t.amount, 0);
      let payments = encPayments.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      // Add allocated unlinked payments
      const allocatedToThisEnc = allocatedPayments.get(enc.encounterId) || 0;
      payments += allocatedToThisEnc;
      
      // Also get adjustments and write-offs for this encounter
      const encAdjustments = encProfTx.filter(t => 
        t.txType === 'Adjustment' || t.txType === 'Credit Adjustment' || 
        t.txType === 'Debit Adjustment' || t.txType === 'Write-Off'
      );
      
      // Calculate total adjustments (credits reduce balance, debits increase)
      let adjustments = encAdjustments.reduce((sum, t) => {
        if (t.txType === 'Credit Adjustment' || t.txType === 'Write-Off' || t.txType === 'Adjustment') {
          return sum + Math.abs(t.amount); // Credits reduce balance
        } else if (t.txType === 'Debit Adjustment') {
          return sum - Math.abs(t.amount); // Debits increase balance
        }
        return sum;
      }, 0);
      
      // Add allocated unlinked adjustments
      const allocatedAdjToThisEnc = allocatedAdjustments.get(enc.encounterId) || 0;
      adjustments += allocatedAdjToThisEnc;
      
      // Skip encounters with no financial activity
      if (charges === 0 && payments === 0 && adjustments === 0) {
        continue;
      }
      
      const encounterDate = new Date(enc.encounterDate);
      const daysSinceEncounter = Math.floor(
        (today.getTime() - encounterDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      // Gather encounter details
      const procedures: string[] = [];
      const diagnoses: string[] = [];
      const providers = new Set<string>();
      const labs: string[] = [];
      const medications: string[] = [];
      
      // Extract procedures and providers from charges
      encCharges.forEach(charge => {
        // Add procedure description
        if (charge.procedureDescription && charge.procedureDescription.trim()) {
          procedures.push(charge.procedureDescription);
        } else if (charge.amount > 0) {
          // Generate description based on department and amount
          const dept = enc.departmentName || '';
          if (dept.includes('LAB')) {
            procedures.push('Laboratory Services');
          } else if (dept.includes('INTERNAL')) {
            procedures.push(charge.amount > 200 ? 'Comprehensive Office Visit' : 'Office Visit');
          } else if (dept.includes('OT')) {
            procedures.push('Therapy Session');
          }
        }
        
        // Add provider names
        if (charge.serviceProviderId) {
          const providerName = this.getProviderName(charge.serviceProviderId);
          if (providerName && !providerName.match(/^[A-Z0-9]+$/)) { // Skip if just an ID
            providers.add(providerName);
          }
        }
        if (charge.billingProviderId && charge.billingProviderId !== charge.serviceProviderId) {
          const providerName = this.getProviderName(charge.billingProviderId);
          if (providerName && !providerName.match(/^[A-Z0-9]+$/)) { // Skip if just an ID
            providers.add(providerName);
          }
        }
        
        // Check if this is a lab
        if (enc.departmentName?.toLowerCase().includes('lab') || 
            charge.procedureDescription?.toLowerCase().includes('lab')) {
          if (charge.procedureDescription) {
            labs.push(charge.procedureDescription);
          }
        }
        
        // Extract diagnoses
        if ('diagnoses' in charge && charge.diagnoses) {
          charge.diagnoses.forEach(dx => {
            if (dx.description && dx.description.trim()) {
              diagnoses.push(dx.description);
            }
          });
        }
      });
      
      // Also check hospital transactions for this encounter date
      if (hospTx && hospTx.length > 0) {
        const encDate = enc.encounterDate.split(' ')[0]; // Get date part only
        const hospCharges = hospTx.filter(tx => 
          tx.serviceDate && tx.serviceDate.includes(encDate) && 
          tx.txType === 'Charge' &&
          tx.departmentId === enc.departmentId
        );
        
        hospCharges.forEach(charge => {
          if (charge.procedureDescription && charge.procedureDescription.trim()) {
            procedures.push(charge.procedureDescription);
          }
        });
      }
      
      // Format encounter details as a readable summary
      let encounterDetails = '';
      
      if (procedures.length > 0) {
        const uniqueProcedures = [...new Set(procedures)];
        encounterDetails += `<strong>Services:</strong> ${uniqueProcedures.join(', ')}<br>`;
      }
      
      if (diagnoses.length > 0) {
        const uniqueDiagnoses = [...new Set(diagnoses)];
        encounterDetails += `<strong>Diagnoses:</strong> ${uniqueDiagnoses.join(', ')}<br>`;
      }
      
      if (labs.length > 0) {
        const uniqueLabs = [...new Set(labs)];
        encounterDetails += `<strong>Lab Tests:</strong> ${uniqueLabs.join(', ')}<br>`;
      }
      
      if (providers.size > 0) {
        encounterDetails += `<strong>Providers:</strong> ${Array.from(providers).join(', ')}<br>`;
      }
      
      // Clean up the details
      if (encounterDetails) {
        encounterDetails = encounterDetails.replace(/<br>$/, '');
      }
      
      enhanced.push({
        ...enc,
        charges,
        payments,
        balance: Math.max(0, charges - payments - adjustments),
        daysSinceEncounter,
        encounterDetails: encounterDetails || undefined,
        procedures: [...new Set(procedures)],
        diagnoses: [...new Set(diagnoses)],
        providers: Array.from(providers),
        labs: [...new Set(labs)],
        medications
      });
    }
    
    // Add hospital stays as special encounters
    for (const har of hospitalAccounts) {
      if (!har.admissionDate) continue;
      
      // Calculate charges, payments, and balance for this hospital stay
      const harCharges = har.transactions
        .filter(t => t.txType === 'Charge')
        .reduce((sum, t) => sum + t.amount, 0);
        
      const harPayments = har.transactions
        .filter(t => t.txType === 'Payment')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
        
      const harAdjustments = har.transactions
        .filter(t => t.txType === 'Adjustment' || t.txType === 'Credit Adjustment' || 
                     t.txType === 'Debit Adjustment' || t.txType === 'Write-Off')
        .reduce((sum, t) => {
          if (t.txType === 'Credit Adjustment' || t.txType === 'Write-Off' || t.txType === 'Adjustment') {
            return sum + Math.abs(t.amount);
          } else if (t.txType === 'Debit Adjustment') {
            return sum - Math.abs(t.amount);
          }
          return sum;
        }, 0);
      
      const harBalance = Math.max(0, harCharges - harPayments - harAdjustments);
      
      // Skip if no financial activity
      if (harCharges === 0 && harPayments === 0 && harAdjustments === 0) {
        continue;
      }
      
      const admissionDate = new Date(har.admissionDate);
      const daysSinceAdmission = Math.floor(
        (today.getTime() - admissionDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      // Build encounter details
      const procedures: string[] = [];
      const departments = new Set<string>();
      
      // Extract procedures from hospital transactions
      har.transactions
        .filter(t => t.txType === 'Charge')
        .forEach(tx => {
          if (tx.procedureDescription) {
            procedures.push(tx.procedureDescription);
          }
          if (tx.departmentName) {
            departments.add(tx.departmentName);
          }
        });
      
      // Format details
      let encounterDetails = '';
      if (har.dischargeDate) {
        const dischargeDate = new Date(har.dischargeDate);
        const lengthOfStay = Math.floor(
          (dischargeDate.getTime() - admissionDate.getTime()) / (1000 * 60 * 60 * 24)
        ) + 1;
        encounterDetails += `<strong>Length of Stay:</strong> ${lengthOfStay} days<br>`;
      }
      
      if (har.accountClass) {
        encounterDetails += `<strong>Account Class:</strong> ${har.accountClass}<br>`;
      }
      
      if (procedures.length > 0) {
        const uniqueProcedures = [...new Set(procedures)];
        encounterDetails += `<strong>Services:</strong> ${uniqueProcedures.slice(0, 5).join(', ')}${uniqueProcedures.length > 5 ? ', ...' : ''}<br>`;
      }
      
      if (departments.size > 0) {
        encounterDetails += `<strong>Departments:</strong> ${Array.from(departments).join(', ')}<br>`;
      }
      
      // Clean up the details
      if (encounterDetails) {
        encounterDetails = encounterDetails.replace(/<br>$/, '');
      }
      
      // Create enhanced encounter for hospital stay
      enhanced.push({
        encounterId: har.hospitalAccountId,
        patientId: har.patientId,
        encounterDate: har.admissionDate,
        encounterType: 'Inpatient',
        departmentId: null,
        departmentName: 'Hospital Inpatient',
        hospitalAccountId: har.hospitalAccountId,
        charges: harCharges,
        payments: harPayments,
        balance: harBalance,
        daysSinceEncounter: daysSinceAdmission,
        encounterDetails: encounterDetails || undefined,
        procedures: [...new Set(procedures)],
        diagnoses: [],
        providers: [],
        labs: [],
        medications: []
      });
    }
    
    // Sort all enhanced encounters by date (newest first)
    enhanced.sort((a, b) => 
      new Date(b.encounterDate).getTime() - new Date(a.encounterDate).getTime()
    );
    
    return enhanced;
  }
  
  // Extract workflow audit trail
  private async extractWorkflowAuditTrail(patientId: string, accountId: number): Promise<WorkflowEvent[]> {
    const events: WorkflowEvent[] = [];
    
    // 1. Encounter workflow events
    const encounterWorkflowQuery = `
      SELECT 
        e.PAT_ENC_CSN_ID as id,
        e.ENC_CREATE_USER_ID as create_user_id,
        e.ENC_CREATE_USER_ID_NAME as create_user_name,
        e.ENC_INSTANT as create_time,
        e.CHECKIN_USER_ID as checkin_user_id,
        e.CHECKIN_USER_ID_NAME as checkin_user_name,
        e.HOSP_ADMSN_TIME as admit_time,
        e.HOSP_DISCHRG_TIME as discharge_time,
        e.ENC_CLOSED_USER_ID as close_user_id,
        e.ENC_CLOSED_USER_ID_NAME as close_user_name,
        e.ENC_CLOSE_DATE as close_time,
        e.CONTACT_DATE as contact_date,
        d.DEPARTMENT_NAME as department
      FROM PAT_ENC e
      LEFT JOIN CLARITY_DEP d ON e.DEPARTMENT_ID = d.DEPARTMENT_ID
      WHERE e.PAT_ID = ?
        AND (e.ENC_CREATE_USER_ID_NAME IS NULL OR e.ENC_CREATE_USER_ID_NAME != 'CLARITY ETL')
      ORDER BY e.CONTACT_DATE
    `;
    
    const encounters = this.db.query(encounterWorkflowQuery).all(patientId) as any[];
    
    encounters.forEach(enc => {
      // Encounter creation
      const createTime = enc.create_time || enc.contact_date;
      if (createTime && enc.create_user_id) {
        events.push({
          timestamp: createTime,
          userId: enc.create_user_id,
          userName: enc.create_user_name || enc.create_user_id,
          action: 'Created encounter',
          category: 'encounter',
          department: enc.department,
          relatedId: enc.id
        });
      }
      
      // Check-in (using contact date if no specific check-in time)
      if (enc.checkin_user_id) {
        events.push({
          timestamp: enc.contact_date,
          userId: enc.checkin_user_id,
          userName: enc.checkin_user_name || enc.checkin_user_id,
          action: 'Checked in patient',
          category: 'encounter',
          department: enc.department,
          relatedId: enc.id
        });
      }
      
      // Hospital admission
      if (enc.admit_time) {
        events.push({
          timestamp: enc.admit_time,
          userId: enc.create_user_id || 'System',
          userName: enc.create_user_name || enc.create_user_id || 'System',
          action: 'Admitted to hospital',
          category: 'encounter',
          department: enc.department,
          relatedId: enc.id
        });
      }
      
      // Hospital discharge
      if (enc.discharge_time) {
        events.push({
          timestamp: enc.discharge_time,
          userId: enc.close_user_id || 'System',
          userName: enc.close_user_name || enc.close_user_id || 'System',
          action: 'Discharged from hospital',
          category: 'encounter',
          department: enc.department,
          relatedId: enc.id
        });
      }
      
      // Encounter closure
      if (enc.close_time && enc.close_user_id) {
        events.push({
          timestamp: enc.close_time,
          userId: enc.close_user_id,
          userName: enc.close_user_name || enc.close_user_id,
          action: 'Closed encounter',
          category: 'encounter',
          department: enc.department,
          relatedId: enc.id
        });
      }
    });
    
    // 2. Charge entry workflow
    const chargeWorkflowQuery = `
      SELECT 
        t.TX_ID as id,
        t.POST_DATE as post_date,
        t.SERVICE_DATE as service_date,
        t.TX_TYPE_C_NAME as tx_type,
        t.AMOUNT as amount,
        d.DEPARTMENT_NAME as department,
        t.VOID_DATE as void_date,
        t.USER_ID as user_id,
        t.USER_ID_NAME as user_name,
        t.UPDATE_DATE as update_date,
        t.LAST_ACTION_DATE as last_action_date
      FROM ARPB_TRANSACTIONS t
      LEFT JOIN CLARITY_DEP d ON t.DEPARTMENT_ID = d.DEPARTMENT_ID
      WHERE t.ACCOUNT_ID = ?
        AND t.TX_TYPE_C_NAME IN ('Charge', 'Payment', 'Adjustment', 'Credit Adjustment', 'Debit Adjustment')
      ORDER BY COALESCE(t.POST_DATE, t.SERVICE_DATE)
    `;
    
    const transactions = this.db.query(chargeWorkflowQuery).all(accountId) as any[];
    
    transactions.forEach(tx => {
      // Transaction posting
      const postTime = tx.post_date || tx.service_date;
      if (postTime && tx.user_id) {
        let action = '';
        let category: WorkflowEvent['category'] = 'charge';
        
        if (tx.tx_type === 'Charge') {
          action = `Posted charge: $${Math.abs(tx.amount).toFixed(2)}`;
          category = 'charge';
        } else if (tx.tx_type === 'Payment') {
          action = `Posted payment: $${Math.abs(tx.amount).toFixed(2)}`;
          category = 'payment';
        } else if (tx.tx_type && tx.tx_type.includes('Adjustment')) {
          action = `Posted ${tx.tx_type.toLowerCase()}: $${Math.abs(tx.amount).toFixed(2)}`;
          category = 'adjustment';
        }
        
        if (action) {
          events.push({
            timestamp: postTime,
            userId: tx.user_id,
            userName: tx.user_name || tx.user_id,
            action,
            category,
            department: tx.department,
            relatedId: tx.id
          });
        }
      }
      
      // Void events
      if (tx.void_date) {
        events.push({
          timestamp: tx.void_date,
          userId: tx.user_id || 'System',
          userName: tx.user_name || tx.user_id || 'System',
          action: `Voided ${tx.tx_type ? tx.tx_type.toLowerCase() : 'transaction'}: $${Math.abs(tx.amount).toFixed(2)}`,
          category: tx.tx_type === 'Payment' ? 'payment' : 'charge',
          department: tx.department,
          relatedId: tx.id
        });
      }
    });
    
    // 3. Insurance verification workflow
    const coverageWorkflowQuery = `
      SELECT 
        cm.COVERAGE_ID as id,
        cm.LAST_VERIF_DATE as verify_date,
        cm.MEMBER_VERF_USER_ID as verify_user_id,
        cm.MEMBER_VERF_USER_ID_NAME as verify_user_name,
        cm.MEM_VERIF_STAT_C_NAME as verify_status,
        c.PAYOR_ID_PAYOR_NAME as payor_name
      FROM COVERAGE_MEMBER_LIST cm
      LEFT JOIN COVERAGE c ON cm.COVERAGE_ID = c.COVERAGE_ID
      WHERE cm.PAT_ID = ?
        AND cm.LAST_VERIF_DATE IS NOT NULL
    `;
    
    const verifications = this.db.query(coverageWorkflowQuery).all(patientId) as any[];
    
    verifications.forEach(ver => {
      if (ver.verify_date) {
        events.push({
          timestamp: ver.verify_date,
          userId: ver.verify_user_id || 'Verification User',
          userName: ver.verify_user_name || ver.verify_user_id || 'Verification User',
          action: `Verified insurance: ${ver.payor_name || 'Unknown'} - ${ver.verify_status || 'Completed'}`,
          category: 'verification',
          relatedId: ver.id
        });
      }
    });
    
    // 4. Hospital workflow events
    const hospitalWorkflowQuery = `
      SELECT 
        h.HSP_ACCOUNT_ID as id,
        h.ADM_DATE_TIME as admit_time,
        h.DISCH_DATE_TIME as discharge_time,
        h.COMBINE_USER_ID as combine_user_id,
        h.COMBINE_USER_ID_NAME as combine_user_name,
        h.COMBINE_DATE_TIME as combine_time
      FROM HSP_ACCOUNT h
      WHERE h.HSP_ACCOUNT_ID IN (
        SELECT DISTINCT HSP_ACCOUNT_ID 
        FROM PAT_ENC 
        WHERE PAT_ID = ?
      )
    `;
    
    const hospitalEvents = this.db.query(hospitalWorkflowQuery).all(patientId) as any[];
    
    hospitalEvents.forEach(hosp => {
      // Hospital admission
      if (hosp.admit_time) {
        events.push({
          timestamp: hosp.admit_time,
          userId: 'Hospital Staff',
          userName: 'Hospital Staff',
          action: 'Patient admitted to hospital',
          category: 'encounter',
          department: 'Hospital',
          relatedId: hosp.id
        });
      }
      
      // Hospital discharge
      if (hosp.discharge_time) {
        events.push({
          timestamp: hosp.discharge_time,
          userId: 'Hospital Staff',
          userName: 'Hospital Staff',
          action: 'Patient discharged from hospital',
          category: 'encounter',
          department: 'Hospital',
          relatedId: hosp.id
        });
      }
      
      // Account combination (if applicable)
      if (hosp.combine_time && hosp.combine_user_id) {
        events.push({
          timestamp: hosp.combine_time,
          userId: hosp.combine_user_id,
          userName: hosp.combine_user_name || hosp.combine_user_id,
          action: 'Combined hospital accounts',
          category: 'encounter',
          department: 'Hospital',
          relatedId: hosp.id
        });
      }
    });
    
    // 5. Claims/Invoice workflow - skipping due to lack of audit columns in this dataset
    // In a full Epic system, INVOICE would have CREATE_INSTANT, CREATE_USER_ID, etc.
    
    // 6. Payment matching workflow
    const matchingWorkflowQuery = `
      SELECT 
        m.TX_ID as charge_tx_id,
        m.MTCH_TX_HX_ID as payment_tx_id,
        m.MTCH_TX_HX_DT as match_date,
        m.MTCH_TX_HX_DSUSR_ID as match_user_id,
        m.MTCH_TX_HX_DSUSR_ID_NAME as match_user_name,
        m.MTCH_TX_HX_UN_DT as unmatch_date,
        m.MTCH_TX_HX_UDUSR_ID as unmatch_user_id,
        m.MTCH_TX_HX_UDUSR_ID_NAME as unmatch_user_name,
        m.MTCH_TX_HX_AMT as amount,
        m.MTCH_TX_HX_INV_NUM as invoice_number
      FROM ARPB_TX_MATCH_HX m
      WHERE m.TX_ID IN (
        SELECT TX_ID FROM ARPB_TRANSACTIONS WHERE ACCOUNT_ID = ?
      )
    `;
    
    const matches = this.db.query(matchingWorkflowQuery).all(accountId) as any[];
    
    matches.forEach(match => {
      // Payment matching
      if (match.match_date) {
        const invoiceInfo = match.invoice_number ? ` to claim ${match.invoice_number}` : '';
        events.push({
          timestamp: match.match_date,
          userId: match.match_user_id || 'System',
          userName: match.match_user_name || match.match_user_id || 'System',
          action: `Matched payment: $${Math.abs(match.amount).toFixed(2)}${invoiceInfo}`,
          category: 'payment',
          relatedId: match.payment_tx_id
        });
      }
      
      // Payment unmatching
      if (match.unmatch_date && match.unmatch_user_id) {
        events.push({
          timestamp: match.unmatch_date,
          userId: match.unmatch_user_id,
          userName: match.unmatch_user_name || match.unmatch_user_id,
          action: `Unmatched payment: $${Math.abs(match.amount).toFixed(2)}`,
          category: 'payment',
          relatedId: match.payment_tx_id
        });
      }
    });
    
    // Sort all events by timestamp
    events.sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return dateA - dateB;
    });
    
    // Calculate duration between steps
    for (let i = 0; i < events.length - 1; i++) {
      const currentTime = new Date(events[i].timestamp).getTime();
      const nextTime = new Date(events[i + 1].timestamp).getTime();
      const durationMinutes = Math.round((nextTime - currentTime) / (1000 * 60));
      events[i].duration = durationMinutes;
    }
    
    return events;
  }
  
  // Generate workflow summary
  private generateWorkflowSummary(events: WorkflowEvent[]): WorkflowSummary {
    if (events.length === 0) {
      return {
        totalSteps: 0,
        uniqueUsers: 0,
        averageStepDuration: 0,
        departmentsInvolved: [],
        firstAction: '',
        lastAction: '',
        totalDuration: 0
      };
    }
    
    const uniqueUsers = new Set(events.map(e => e.userId));
    const departments = new Set(events.filter(e => e.department).map(e => e.department!));
    
    const durations = events.filter(e => e.duration).map(e => e.duration!);
    const avgDuration = durations.length > 0 ? 
      durations.reduce((sum, d) => sum + d, 0) / durations.length : 0;
    
    const firstDate = new Date(events[0].timestamp);
    const lastDate = new Date(events[events.length - 1].timestamp);
    const totalDays = Math.round((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      totalSteps: events.length,
      uniqueUsers: uniqueUsers.size,
      averageStepDuration: Math.round(avgDuration),
      departmentsInvolved: Array.from(departments),
      firstAction: events[0].timestamp,
      lastAction: events[events.length - 1].timestamp,
      totalDuration: totalDays
    };
  }

  // Main extraction method for a complete patient financial record
  async extractPatientFinancialRecord(patientId: string): Promise<PatientFinancialRecord | null> {
    // First, find the patient's guarantor
    const guarantorQuery = `
      SELECT ACCOUNT_ID 
      FROM ACCT_GUAR_PAT_INFO 
      WHERE PAT_ID = ?
      LIMIT 1
    `;

    const guarantorResult = this.db.query(guarantorQuery).get(patientId) as any;
    if (!guarantorResult) {
      console.error(`No guarantor found for patient ${patientId}`);
      return null;
    }

    const guarantor = await this.extractGuarantor(guarantorResult.ACCOUNT_ID);
    if (!guarantor) {
      console.error(`Failed to extract guarantor ${guarantorResult.ACCOUNT_ID}`);
      return null;
    }

    // Extract all financial data
    const [
      coverages,
      encounters,
      hospitalAccounts,
      professionalTransactions,
      invoices,
      payments,
      matches
    ] = await Promise.all([
      this.extractPatientCoverages(patientId),
      this.extractEncounters(patientId),
      this.extractHospitalAccounts(patientId),
      this.extractProfessionalTransactions(patientId),
      this.extractInvoices(guarantor.accountId),
      this.extractPaymentEOBs(patientId),
      this.extractTransactionMatches(guarantor.accountId)
    ]);

    // Collect all hospital transactions
    const hospitalTransactions = hospitalAccounts.flatMap(ha => ha.transactions);

    // Calculate financial summary
    const financialSummary = this.calculateFinancialSummary(
      professionalTransactions,
      hospitalTransactions,
      payments
    );

    // Get patient name
    const patientQuery = `SELECT PAT_NAME FROM PATIENT WHERE PAT_ID = ?`;
    const patientResult = this.db.query(patientQuery).get(patientId) as any;

    // Generate enhanced dashboard data
    const timeline = this.generateTimeline(
      encounters,
      professionalTransactions,
      hospitalTransactions,
      invoices,
      hospitalAccounts
    );

    const departmentSummaries = this.generateDepartmentSummaries(
      encounters,
      professionalTransactions,
      hospitalTransactions
    );

    const financialFlows = this.generateFinancialFlows(
      professionalTransactions,
      hospitalTransactions,
      payments,
      financialSummary,
      departmentSummaries
    );

    const monthlySummaries = this.generateMonthlySummaries(
      encounters,
      professionalTransactions,
      hospitalTransactions
    );

    const enhancedEncounters = this.enhanceEncounters(
      encounters,
      professionalTransactions,
      hospitalTransactions,
      hospitalAccounts
    );
    
    // Extract workflow audit trail
    const workflowAuditTrail = await this.extractWorkflowAuditTrail(patientId, guarantor.accountId);
    const workflowSummary = this.generateWorkflowSummary(workflowAuditTrail);

    return {
      patientId,
      patientName: patientResult?.PAT_NAME || null,
      guarantor,
      coverages,
      encounters,
      hospitalAccounts,
      professionalTransactions,
      hospitalTransactions,
      invoices,
      payments,
      matches,
      financialSummary,
      timeline,
      financialFlows,
      departmentSummaries,
      monthlySummaries,
      enhancedEncounters,
      workflowAuditTrail,
      workflowSummary
    };
  }

  // Extract all patients' financial records
  async extractAllPatientsFinancialRecords(): Promise<PatientFinancialRecord[]> {
    const patientsQuery = `
      SELECT DISTINCT PAT_ID as patientId
      FROM ACCT_GUAR_PAT_INFO
    `;

    const patients = this.db.query(patientsQuery).all() as any[];
    const records: PatientFinancialRecord[] = [];

    for (const patient of patients) {
      const record = await this.extractPatientFinancialRecord(patient.patientId);
      if (record) {
        records.push(record);
      }
    }

    return records;
  }

  close() {
    this.db.close();
  }
}

// Main execution
if (import.meta.main) {
  const dbPath = "../c2/ehi.sqlite";
  const extractor = new FinancialDataExtractor(dbPath);

  try {
    console.log("Extracting financial data...");
    const records = await extractor.extractAllPatientsFinancialRecords();
    
    // Write to JSON file
    const outputPath = "patient_financial_data.json";
    await Bun.write(outputPath, JSON.stringify(records, null, 2));
    
    console.log(`Successfully extracted financial data for ${records.length} patients`);
    console.log(`Output written to ${outputPath}`);
    
    // Print summary
    for (const record of records) {
      console.log(`\nPatient: ${record.patientName} (${record.patientId})`);
      console.log(`  Guarantor: ${record.guarantor.accountName}`);
      console.log(`  Coverages: ${record.coverages.length}`);
      console.log(`  Encounters: ${record.encounters.length}`);
      console.log(`  Hospital Accounts: ${record.hospitalAccounts.length}`);
      console.log(`  Professional Transactions: ${record.professionalTransactions.length}`);
      console.log(`  Hospital Transactions: ${record.hospitalTransactions.length}`);
      console.log(`  Invoices: ${record.invoices.length}`);
      console.log(`  Financial Summary:`);
      console.log(`    Total Charges: $${record.financialSummary.totalCharges.toFixed(2)}`);
      console.log(`    Total Payments: $${record.financialSummary.totalPayments.toFixed(2)}`);
      console.log(`    Outstanding Balance: $${record.financialSummary.outstandingBalance.toFixed(2)}`);
    }
  } catch (error) {
    console.error("Error extracting financial data:", error);
  } finally {
    extractor.close();
  }
}