// Workflow Audit Trail Implementation for Epic Tables
// This extends the FinancialDataExtractor to include workflow tracking

export interface WorkflowEvent {
  eventId: string; // Unique identifier for the event
  eventType: 'registration' | 'encounter' | 'charge' | 'payment' | 'adjustment' | 'verification' | 'claim' | 'match';
  eventSubtype?: string; // More specific type (e.g., 'charge_entry', 'charge_void')
  timestamp: string;
  userId?: string;
  userName?: string;
  patientId: string;
  encounterId?: number;
  transactionId?: number;
  accountId?: number;
  departmentId?: number;
  departmentName?: string;
  amount?: number;
  description: string;
  metadata?: Record<string, any>; // Additional event-specific data
}

export interface WorkflowAuditTrail {
  patientId: string;
  events: WorkflowEvent[];
  summary: {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsByUser: Record<string, number>;
    timelineStart: string;
    timelineEnd: string;
  };
}

// Epic table column mappings for audit fields
// Note: These are common patterns - actual column names may vary
export const AUDIT_COLUMNS = {
  // User ID columns
  USER_ID_PATTERNS: [
    'CREATE_USER_ID',
    'UPDATE_USER_ID', 
    'POST_USER_ID',
    'VOID_USER_ID',
    'MATCH_USER_ID',
    'UNMATCH_USER_ID',
    'VERIF_USER_ID',
    'CHECK_IN_USER_ID',
    'CHECK_OUT_USER_ID',
    'CLOSE_USER_ID',
    'ADM_USER_ID',
    'DISCH_USER_ID',
    'SUBMIT_USER_ID',
    'STATUS_CHANGE_USER_ID',
    'ENC_CREATE_USER_ID',
    'USER_ID',
    'ENTRY_USER_ID'
  ],
  
  // Timestamp columns  
  TIMESTAMP_PATTERNS: [
    'CREATE_INSTANT',
    'CREATE_DATE',
    'CREATE_TIME',
    'UPDATE_INSTANT',
    'UPDATE_DATE',
    'POST_DATE',
    'POST_TIME',
    'VOID_DATE',
    'MATCH_DATE',
    'UNMATCH_DATE',
    'VERIF_DATE',
    'LAST_VERIF_DATE',
    'CHECK_IN_TIME',
    'CHECK_OUT_TIME',
    'CLOSE_DATE',
    'ADM_DATE_TIME',
    'DISCH_DATE_TIME',
    'SUBMIT_DATE',
    'STATUS_CHANGE_DATE',
    'ENC_CREATE_INSTANT',
    'ENTRY_DATE',
    'ENTRY_TIME',
    'SERVICE_DATE',
    'CONTACT_DATE',
    'TX_MATCH_DATE',
    'MTCH_TX_HX_DT',
    'MTCH_TX_HX_UN_DT'
  ],
  
  // Action/status columns
  ACTION_PATTERNS: [
    'TX_TYPE_C',
    'TX_TYPE_C_NAME',
    'TX_TYPE_HA_C',
    'TX_TYPE_HA_C_NAME',
    'ACTION_C',
    'ACTION_C_NAME',
    'STATUS_C',
    'STATUS_C_NAME',
    'INV_STATUS_C',
    'INV_STATUS_C_NAME',
    'PEOB_ACTION_C',
    'PEOB_ACTION_C_NAME'
  ]
};

// Workflow event extraction queries
export const WORKFLOW_QUERIES = {
  // Patient registration events
  PATIENT_REGISTRATION: `
    SELECT 
      'REG_' || p.PAT_ID as eventId,
      'registration' as eventType,
      'patient_created' as eventSubtype,
      p.CREATE_INSTANT as timestamp,
      p.CREATE_USER_ID as userId,
      p.PAT_ID as patientId,
      'Patient record created: ' || p.PAT_NAME as description
    FROM PATIENT p
    WHERE p.PAT_ID = ?
  `,
  
  // Account creation events  
  ACCOUNT_CREATION: `
    SELECT
      'ACCT_' || a.ACCOUNT_ID as eventId,
      'registration' as eventType,
      'account_created' as eventSubtype,
      a.CREATE_INSTANT as timestamp,
      a.CREATE_USER_ID as userId,
      agpi.PAT_ID as patientId,
      a.ACCOUNT_ID as accountId,
      'Guarantor account created: ' || a.ACCOUNT_NAME as description
    FROM ACCOUNT a
    JOIN ACCT_GUAR_PAT_INFO agpi ON a.ACCOUNT_ID = agpi.ACCOUNT_ID
    WHERE agpi.PAT_ID = ?
  `,
  
  // Encounter events
  ENCOUNTER_EVENTS: `
    SELECT 
      'ENC_CREATE_' || pe.PAT_ENC_CSN_ID as eventId,
      'encounter' as eventType,
      'encounter_created' as eventSubtype,
      pe.ENC_CREATE_INSTANT as timestamp,
      pe.ENC_CREATE_USER_ID as userId,
      pe.ENC_CREATE_USER_ID_NAME as userName,
      pe.PAT_ID as patientId,
      pe.PAT_ENC_CSN_ID as encounterId,
      pe.DEPARTMENT_ID as departmentId,
      'Encounter created at ' || COALESCE(d.DEPARTMENT_NAME, 'Unknown Dept') as description
    FROM PAT_ENC pe
    LEFT JOIN CLARITY_DEP d ON pe.DEPARTMENT_ID = d.DEPARTMENT_ID
    WHERE pe.PAT_ID = ?
    
    UNION ALL
    
    SELECT 
      'ENC_CHECKIN_' || pe.PAT_ENC_CSN_ID as eventId,
      'encounter' as eventType,
      'patient_checkin' as eventSubtype,
      pe.CHECK_IN_TIME as timestamp,
      pe.CHECK_IN_USER_ID as userId,
      NULL as userName,
      pe.PAT_ID as patientId,
      pe.PAT_ENC_CSN_ID as encounterId,
      pe.DEPARTMENT_ID as departmentId,
      'Patient checked in' as description
    FROM PAT_ENC pe
    WHERE pe.PAT_ID = ? AND pe.CHECK_IN_TIME IS NOT NULL
    
    UNION ALL
    
    SELECT 
      'ENC_CHECKOUT_' || pe.PAT_ENC_CSN_ID as eventId,
      'encounter' as eventType,
      'patient_checkout' as eventSubtype,
      pe.CHECK_OUT_TIME as timestamp,
      pe.CHECK_OUT_USER_ID as userId,
      NULL as userName,
      pe.PAT_ID as patientId,
      pe.PAT_ENC_CSN_ID as encounterId,
      pe.DEPARTMENT_ID as departmentId,
      'Patient checked out' as description
    FROM PAT_ENC pe
    WHERE pe.PAT_ID = ? AND pe.CHECK_OUT_TIME IS NOT NULL
  `,
  
  // Professional billing transaction events
  PROF_BILLING_EVENTS: `
    SELECT 
      'ARPB_TX_' || at.TX_ID as eventId,
      CASE 
        WHEN at.TX_TYPE_C_NAME = 'Charge' THEN 'charge'
        WHEN at.TX_TYPE_C_NAME = 'Payment' THEN 'payment'
        WHEN at.TX_TYPE_C_NAME LIKE '%Adjustment%' THEN 'adjustment'
        ELSE 'transaction'
      END as eventType,
      LOWER(at.TX_TYPE_C_NAME) as eventSubtype,
      COALESCE(at.CREATE_INSTANT, at.POST_DATE) as timestamp,
      COALESCE(at.CREATE_USER_ID, at.POST_USER_ID) as userId,
      agpi.PAT_ID as patientId,
      at.ACCOUNT_ID as accountId,
      at.TX_ID as transactionId,
      at.DEPARTMENT_ID as departmentId,
      at.TX_TYPE_C_NAME || ': $' || ABS(at.AMOUNT) || 
        CASE WHEN at.PROC_ID IS NOT NULL THEN ' for ' || COALESCE(eap.PROC_NAME, 'procedure') ELSE '' END as description,
      at.AMOUNT as amount
    FROM ARPB_TRANSACTIONS at
    JOIN ACCT_GUAR_PAT_INFO agpi ON at.ACCOUNT_ID = agpi.ACCOUNT_ID
    LEFT JOIN CLARITY_EAP eap ON at.PROC_ID = eap.PROC_ID
    WHERE agpi.PAT_ID = ?
    ORDER BY timestamp
  `,
  
  // Hospital billing transaction events
  HOSP_BILLING_EVENTS: `
    SELECT 
      'HSP_TX_' || ht.TX_ID as eventId,
      CASE 
        WHEN ht.TX_TYPE_HA_C_NAME = 'Charge' THEN 'charge'
        WHEN ht.TX_TYPE_HA_C_NAME = 'Payment' THEN 'payment'
        WHEN ht.TX_TYPE_HA_C_NAME LIKE '%Adjustment%' THEN 'adjustment'
        ELSE 'transaction'
      END as eventType,
      LOWER(ht.TX_TYPE_HA_C_NAME) as eventSubtype,
      COALESCE(ht.CREATE_INSTANT, ht.TX_POST_DATE) as timestamp,
      COALESCE(ht.CREATE_USER_ID, ht.POST_USER_ID) as userId,
      pe.PAT_ID as patientId,
      ht.HSP_ACCOUNT_ID as accountId,
      ht.TX_ID as transactionId,
      ht.DEPARTMENT as departmentId,
      ht.TX_TYPE_HA_C_NAME || ': $' || ABS(ht.TX_AMOUNT) || 
        CASE WHEN ht.PROCEDURE_DESC IS NOT NULL THEN ' for ' || ht.PROCEDURE_DESC ELSE '' END as description,
      ht.TX_AMOUNT as amount
    FROM HSP_TRANSACTIONS ht
    JOIN PAT_ENC pe ON ht.HSP_ACCOUNT_ID = pe.HSP_ACCOUNT_ID
    WHERE pe.PAT_ID = ?
    ORDER BY timestamp
  `,
  
  // Insurance verification events
  COVERAGE_VERIFICATION: `
    SELECT 
      'CVG_VERIF_' || cm.COVERAGE_ID || '_' || cm.LINE as eventId,
      'verification' as eventType,
      'coverage_verified' as eventSubtype,
      cm.LAST_VERIF_DATE as timestamp,
      cm.VERIF_USER_ID as userId,
      cm.PAT_ID as patientId,
      'Insurance verified: ' || c.PAYOR_ID_PAYOR_NAME || ' - ' || cm.MEM_VERIF_STAT_C_NAME as description
    FROM COVERAGE_MEMBER_LIST cm
    JOIN COVERAGE c ON cm.COVERAGE_ID = c.COVERAGE_ID
    WHERE cm.PAT_ID = ? AND cm.LAST_VERIF_DATE IS NOT NULL
  `,
  
  // Claim/Invoice events
  CLAIM_EVENTS: `
    SELECT 
      'INV_CREATE_' || i.INVOICE_ID as eventId,
      'claim' as eventType,
      'claim_created' as eventSubtype,
      i.CREATE_INSTANT as timestamp,
      i.CREATE_USER_ID as userId,
      agpi.PAT_ID as patientId,
      i.ACCOUNT_ID as accountId,
      'Claim created: ' || ib.INV_NUM || ' ($' || 
        (SELECT SUM(at.AMOUNT) FROM INV_TX_PIECES itp 
         JOIN ARPB_TRANSACTIONS at ON itp.TX_ID = at.TX_ID 
         WHERE itp.INV_ID = i.INVOICE_ID) || ')' as description
    FROM INVOICE i
    JOIN INV_BASIC_INFO ib ON i.INVOICE_ID = ib.INV_ID
    JOIN ACCT_GUAR_PAT_INFO agpi ON i.ACCOUNT_ID = agpi.ACCOUNT_ID
    WHERE agpi.PAT_ID = ?
    
    UNION ALL
    
    SELECT 
      'INV_STATUS_' || ib.INV_ID || '_' || ib.LINE as eventId,
      'claim' as eventType,
      'claim_status_change' as eventSubtype,
      ib.STATUS_CHANGE_DATE as timestamp,
      ib.STATUS_CHANGE_USER_ID as userId,
      agpi.PAT_ID as patientId,
      i.ACCOUNT_ID as accountId,
      'Claim ' || ib.INV_NUM || ' status: ' || ib.INV_STATUS_C_NAME as description
    FROM INV_BASIC_INFO ib
    JOIN INVOICE i ON ib.INV_ID = i.INVOICE_ID
    JOIN ACCT_GUAR_PAT_INFO agpi ON i.ACCOUNT_ID = agpi.ACCOUNT_ID
    WHERE agpi.PAT_ID = ? AND ib.STATUS_CHANGE_DATE IS NOT NULL
  `,
  
  // Payment matching events
  PAYMENT_MATCHING: `
    SELECT 
      'MATCH_' || m.TX_ID || '_' || m.LINE as eventId,
      'match' as eventType,
      'payment_matched' as eventSubtype,
      m.MTCH_TX_HX_DT as timestamp,
      m.MATCH_USER_ID as userId,
      agpi.PAT_ID as patientId,
      at.ACCOUNT_ID as accountId,
      m.TX_ID as transactionId,
      'Payment matched: $' || m.MTCH_TX_HX_AMT || 
        CASE WHEN m.MTCH_TX_HX_INV_NUM IS NOT NULL THEN ' to claim ' || m.MTCH_TX_HX_INV_NUM ELSE '' END as description,
      m.MTCH_TX_HX_AMT as amount
    FROM ARPB_TX_MATCH_HX m
    JOIN ARPB_TRANSACTIONS at ON m.TX_ID = at.TX_ID
    JOIN ACCT_GUAR_PAT_INFO agpi ON at.ACCOUNT_ID = agpi.ACCOUNT_ID
    WHERE agpi.PAT_ID = ?
    
    UNION ALL
    
    SELECT 
      'UNMATCH_' || m.TX_ID || '_' || m.LINE as eventId,
      'match' as eventType,
      'payment_unmatched' as eventSubtype,
      m.MTCH_TX_HX_UN_DT as timestamp,
      m.UNMATCH_USER_ID as userId,
      agpi.PAT_ID as patientId,
      at.ACCOUNT_ID as accountId,
      m.TX_ID as transactionId,
      'Payment unmatched: $' || m.MTCH_TX_HX_AMT as description,
      m.MTCH_TX_HX_AMT as amount
    FROM ARPB_TX_MATCH_HX m
    JOIN ARPB_TRANSACTIONS at ON m.TX_ID = at.TX_ID
    JOIN ACCT_GUAR_PAT_INFO agpi ON at.ACCOUNT_ID = agpi.ACCOUNT_ID
    WHERE agpi.PAT_ID = ? AND m.MTCH_TX_HX_UN_DT IS NOT NULL
  `
};

// Extended FinancialDataExtractor with workflow audit capabilities
export class WorkflowAuditExtractor {
  private db: any; // Database connection
  
  constructor(db: any) {
    this.db = db;
  }
  
  // Helper to discover audit columns in a table
  async discoverAuditColumns(tableName: string): Promise<{
    userColumns: string[];
    timestampColumns: string[];
    actionColumns: string[];
  }> {
    const columns = this.db.query(`PRAGMA table_info(${tableName})`).all() as any[];
    
    const userColumns: string[] = [];
    const timestampColumns: string[] = [];
    const actionColumns: string[] = [];
    
    for (const col of columns) {
      const colName = col.name.toUpperCase();
      
      // Check for user ID columns
      if (AUDIT_COLUMNS.USER_ID_PATTERNS.some(pattern => colName.includes(pattern))) {
        userColumns.push(col.name);
      }
      
      // Check for timestamp columns
      if (AUDIT_COLUMNS.TIMESTAMP_PATTERNS.some(pattern => colName.includes(pattern))) {
        timestampColumns.push(col.name);
      }
      
      // Check for action/status columns
      if (AUDIT_COLUMNS.ACTION_PATTERNS.some(pattern => colName.includes(pattern))) {
        actionColumns.push(col.name);
      }
    }
    
    return { userColumns, timestampColumns, actionColumns };
  }
  
  // Extract workflow events for a patient
  async extractPatientWorkflowEvents(patientId: string): Promise<WorkflowEvent[]> {
    const events: WorkflowEvent[] = [];
    
    // Execute each workflow query and collect events
    for (const [queryName, query] of Object.entries(WORKFLOW_QUERIES)) {
      try {
        const results = this.db.query(query).all(patientId) as any[];
        
        for (const row of results) {
          // Convert row to WorkflowEvent
          const event: WorkflowEvent = {
            eventId: row.eventId,
            eventType: row.eventType,
            eventSubtype: row.eventSubtype,
            timestamp: row.timestamp,
            userId: row.userId,
            userName: row.userName,
            patientId: row.patientId,
            encounterId: row.encounterId,
            transactionId: row.transactionId,
            accountId: row.accountId,
            departmentId: row.departmentId,
            departmentName: row.departmentName,
            amount: row.amount,
            description: row.description,
            metadata: {} // Can be extended with additional fields
          };
          
          events.push(event);
        }
      } catch (error) {
        console.warn(`Failed to execute ${queryName}: ${error}`);
        // Continue with other queries
      }
    }
    
    // Sort events by timestamp
    events.sort((a, b) => {
      const dateA = new Date(a.timestamp || '').getTime();
      const dateB = new Date(b.timestamp || '').getTime();
      return dateA - dateB;
    });
    
    return events;
  }
  
  // Generate workflow audit trail with summary
  async generateWorkflowAuditTrail(patientId: string): Promise<WorkflowAuditTrail> {
    const events = await this.extractPatientWorkflowEvents(patientId);
    
    // Calculate summary statistics
    const eventsByType: Record<string, number> = {};
    const eventsByUser: Record<string, number> = {};
    
    for (const event of events) {
      // Count by type
      eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;
      
      // Count by user
      if (event.userId) {
        const userKey = event.userName || event.userId;
        eventsByUser[userKey] = (eventsByUser[userKey] || 0) + 1;
      }
    }
    
    // Find timeline bounds
    const timestamps = events
      .map(e => e.timestamp)
      .filter(t => t)
      .map(t => new Date(t).getTime());
    
    const timelineStart = timestamps.length > 0 
      ? new Date(Math.min(...timestamps)).toISOString()
      : '';
    
    const timelineEnd = timestamps.length > 0
      ? new Date(Math.max(...timestamps)).toISOString()
      : '';
    
    return {
      patientId,
      events,
      summary: {
        totalEvents: events.length,
        eventsByType,
        eventsByUser,
        timelineStart,
        timelineEnd
      }
    };
  }
  
  // Generate a human-readable workflow narrative
  generateWorkflowNarrative(trail: WorkflowAuditTrail): string {
    let narrative = `Workflow Audit Trail for Patient ${trail.patientId}\n`;
    narrative += `Period: ${trail.summary.timelineStart} to ${trail.summary.timelineEnd}\n`;
    narrative += `Total Events: ${trail.summary.totalEvents}\n\n`;
    
    narrative += "Timeline of Events:\n";
    narrative += "==================\n";
    
    for (const event of trail.events) {
      const timestamp = event.timestamp ? new Date(event.timestamp).toLocaleString() : 'Unknown time';
      const user = event.userName || event.userId || 'Unknown user';
      
      narrative += `${timestamp} - ${event.description}\n`;
      narrative += `  Action by: ${user}\n`;
      
      if (event.departmentName) {
        narrative += `  Department: ${event.departmentName}\n`;
      }
      
      if (event.amount !== undefined) {
        narrative += `  Amount: $${Math.abs(event.amount).toFixed(2)}\n`;
      }
      
      narrative += "\n";
    }
    
    return narrative;
  }
}

// Example usage
if (import.meta.main) {
  // This would be integrated with the FinancialDataExtractor
  console.log("Workflow Audit Trail implementation ready for integration");
}