# Appendix A: Epic EHI Terminology Glossary

*A comprehensive guide to terms, abbreviations, and concepts that appear throughout Epic's Electronic Health Information export.*

This glossary serves as your reference guide to Epic's specialized terminology. Terms are organized alphabetically within categories to help you quickly find what you need. Each entry includes the full term, definition, and context for how it's used in Epic's EHI export.

---

## Epic-Specific Identifiers

### CSN (Contact Serial Number)
A unique identifier assigned to each patient encounter or visit in Epic. The CSN remains constant throughout the encounter and serves as the primary key linking all encounter-related data. One inpatient stay may consist of multiple CSNs for different services (labs, radiology, etc.). Referenced as PAT_ENC_CSN_ID in the database.

### DX_ID
Epic's internal identifier for diagnoses in the CLARITY_EDG table. Unlike ICD codes, DX_ID is Epic's proprietary diagnosis identifier that remains consistent across the system.

### FIN (Financial Identification Number)
An identifier used for financial tracking and billing purposes. While similar to HAR, FIN specifically relates to the financial aspects of patient care and may be used differently by various healthcare organizations.

### HAR (Hospital Account Record)
The unique identifier for a hospital billing account in Epic. Stores hospital/technical charges, payments, and adjustments for encounters. Multiple encounters can share a single HAR for episode-based billing. Referenced as HSP_ACCOUNT_ID.

### MRN (Medical Record Number)
See PAT_MRN_ID.

### PAT_ENC_CSN_ID
The database column name for the Contact Serial Number. This is the primary identifier linking all data related to a specific patient encounter.

### PAT_ID
Epic's internal patient identifier that remains constant throughout the patient's lifetime in the system. Unlike the MRN, the PAT_ID is never visible to end users and is used exclusively for database relationships.

### PAT_MRN_ID
The Medical Record Number visible to clinicians and patients. This "human-facing" identifier appears on wristbands, documents, and user interfaces. May be facility-specific and can include prefixes indicating location.

### PROC_ID
Epic's internal identifier for procedures in the CLARITY_EAP table. Links to billable procedures and clinical services but does not directly contain CPT codes.

### TX_ID
Transaction identifier used in both ARPB_TRANSACTIONS (professional billing) and HSP_TRANSACTIONS (hospital billing) tables. Uniquely identifies each financial transaction.

---

## Clinical Terms & Abbreviations

### ADT (Admission, Discharge, Transfer)
The system and tables (e.g., CLARITY_ADT) that track patient movement through a healthcare facility. ADT events create an audit trail of patient location changes.

### DRG (Diagnosis-Related Group)
A patient classification system that groups hospital cases expected to have similar resource use. Used for Medicare and insurance reimbursement. Stored in HSP_ACCOUNT.FINAL_DRG_ID.

### EDG (Epic Diagnosis Grouper)
Epic's diagnosis master file, represented in the CLARITY_EDG table. Contains Epic's internal diagnosis codes and descriptions.

### EOB (Explanation of Benefits)
Insurance documentation explaining coverage decisions, stored in tables like PMT_EOB_INFO_I. Details what insurance paid, patient responsibility, and reasons for denials.

### LOS (Length of Stay)
The duration of a hospital admission, calculated from HOSP_ADMSN_TIME to HOSP_DISCHRG_TIME in the PAT_ENC table.

### MAR (Medication Administration Record)
Documentation of medication administration. Note: MAR tables are typically not included in standard EHI exports.

### NKA (No Known Allergies)
A specific entry in the allergy system indicating allergies have been reviewed and none found. Distinguished from missing allergy data.

### PRO (Patient-Reported Outcomes)
Data collected directly from patients about their health status, typically through questionnaires. Stored in tables like MYC_APPT_QNR_DATA and flowsheet measurements.

### UDI (Unique Device Identifier)
FDA-required tracking for medical devices. While Epic supports UDI tracking, these tables are often excluded from EHI exports.

---

## Financial/Billing Terms

### ARPB (Accounts Receivable Professional Billing)
Epic's professional billing system that handles physician and provider charges. All tables with the ARPB_ prefix belong to this system.

### CDM (Charge Description Master)
Also called Chargemaster. The comprehensive list of billable items with prices. While Epic maintains this internally, it's typically not included in EHI exports.

### COB (Coordination of Benefits)
The process determining payment responsibility when patients have multiple insurance plans. Managed through filing order in PAT_CVG_FILE_ORDER.

### CPT (Current Procedural Terminology)
Standardized medical procedure codes maintained by the AMA. In Epic, CPT codes are stored at the transaction level (e.g., LL_CPT_CODE) rather than in procedure masters.

### DRG (Diagnosis-Related Group)
See Clinical Terms section.

### ERA (Electronic Remittance Advice)
Electronic payment and adjustment information from insurance companies. Processed through remittance tables like CL_REMIT.

### HAR (Hospital Account Record)
See Epic-Specific Identifiers section.

### HCPCS (Healthcare Common Procedure Coding System)
Two-level code system including CPT codes (Level I) and supplies/services codes (Level II).

### HSP (Hospital)
Prefix indicating hospital billing tables (e.g., HSP_ACCOUNT, HSP_TRANSACTIONS). Part of Epic's dual billing architecture.

### HTR (Hospital Transactions)
The Chronicles master file containing hospital billing transactions, extracted to HSP_TRANSACTIONS in Clarity.

### ICD (International Classification of Diseases)
Diagnosis codes maintained by WHO. ICD-10-CM for diagnoses, ICD-10-PCS for inpatient procedures. Note: Direct ICD mappings often missing from EHI exports.

### NPI (National Provider Identifier)
10-digit identifier for healthcare providers required for HIPAA transactions. Unique per provider, never recycled.

### UB (Uniform Bill)
The UB-04 claim form used for hospital billing. Revenue codes in CL_UB_REV_CODE support UB billing.

---

## Technical/Database Terms

### Caché
InterSystems' commercial implementation of MUMPS, which underlies Epic's Chronicles database.

### Chronicles
Epic's proprietary hierarchical database built on MUMPS technology. The real-time operational database where clinical work occurs.

### Clarity
Epic's SQL Server-based reporting database. Receives nightly ETL updates from Chronicles. The source for EHI exports.

### Cogito
Epic's analytics platform that bridges Chronicles and Clarity for reporting.

### ETL (Extract, Transform, Load)
The nightly process copying data from Chronicles to Clarity, converting hierarchical to relational structure.

### INI
Chronicles master files (e.g., Patient INI, Order INI). Each INI type maps to Clarity tables.

### LINE
A column appearing in 275 Epic tables implementing the (ID, LINE) pattern for one-to-many relationships. Always starts at 1, increments sequentially.

### MUMPS
Massachusetts General Hospital Utility Multi-Programming System. Created in 1966, still powers Epic's core database.

### REAL dates
Epic's internal date format storing days since 12/31/1840. Columns ending in _REAL use this format with decimals for same-day sequencing.

### TSV (Tab-Separated Values)
The file format used for EHI exports. Similar to CSV but uses tabs as delimiters.

---

## Epic Modules & Components

### Chronicles
See Technical/Database Terms section.

### Clarity
See Technical/Database Terms section.

### EpicCare
Epic's ambulatory EHR module, though this branding rarely appears in database structures.

### EPP (Epic Payer Platform)
Epic's insurance/payer integration platform. The CLARITY_EPP table contains benefit plan information.

### MyChart
Epic's patient portal. Tables with MYC_ prefix contain patient portal data including messages, questionnaires, and appointments.

### OpTime
Epic's surgical documentation system. OpTime-specific tables typically excluded from EHI exports.

---

## Regulatory & Compliance Terms

### 21st Century Cures Act
Federal law enacted December 13, 2016, mandating rapid, free, and full patient access to electronic health information.

### Designated Record Set
HIPAA-defined set of records used to make decisions about individuals. Includes medical records and billing records. Defines scope of EHI.

### EHI (Electronic Health Information)
Electronic protected health information (ePHI) that would be included in a designated record set. The complete scope of data in the EHI export.

### FHIR (Fast Healthcare Interoperability Resources)
HL7's modern standard for healthcare data exchange. Provides structured API access to a subset of EHI.

### HIPAA (Health Insurance Portability and Accountability Act)
Federal law establishing privacy and security standards for protected health information.

### Information Blocking
Practices that interfere with access, exchange, or use of EHI. Prohibited by Cures Act with penalties up to $1 million.

### PHI (Protected Health Information)
Individually identifiable health information protected under HIPAA. Includes demographics, diagnoses, and treatment information.

### USCDI (United States Core Data for Interoperability)
Standardized set of health data classes and elements for nationwide exchange. Defines minimum data for FHIR APIs.

---

## Common Epic Patterns

### _2, _3, _4 Tables
Continuation tables for entities exceeding column limits. PATIENT_2 and PATIENT_3 extend the main PATIENT table.

### _AMT Suffix
Indicates currency amount fields, stored in dollars as REAL data type.

### _C Suffix
Indicates a category code field (the numeric code).

### _C_NAME Suffix
Contains the human-readable category name. 1,695 columns use this pattern.

### _DT Suffix
Date field (without time component).

### _DTTM Suffix
DateTime field (includes both date and time).

### _HX Suffix
History table tracking changes over time. Uses effective dating with EFF_START_DATE and EFF_END_DATE.

### _ID Suffix
Identifier field, typically INTEGER type linking to another table.

### _NAME Suffix
Human-readable name field, often paired with an _ID field for denormalization.

### _REAL Suffix
Epic's internal decimal date format. Days since 12/31/1840 with decimal for sequencing.

### _YN Suffix
Yes/No boolean field. Values: 'Y' (Yes), 'N' (No), NULL (Unknown/Not specified).

### (ID, LINE) Pattern
Composite key pattern for one-to-many relationships. Appears in 275 tables.

### GROUP_LINE, VALUE_LINE Pattern
Nested list pattern for grouped data. 17 tables use this three-level hierarchy.

---

## Notes on Usage

1. **Case Sensitivity**: Epic table and column names are typically uppercase in documentation but may vary in actual implementations.

2. **Null vs. Empty**: Epic sometimes uses empty strings ('') interchangeably with NULL values, particularly in date fields.

3. **Text Values**: Category names (_C_NAME fields) require exact text matching—Epic doesn't use the underlying numeric codes in EHI exports.

4. **Missing Data**: Not all Epic modules and tables appear in EHI exports. Research, surgical, and device tracking data often excluded.

5. **Version Variations**: Terms and structures may vary slightly between Epic versions and organizational configurations.

---
