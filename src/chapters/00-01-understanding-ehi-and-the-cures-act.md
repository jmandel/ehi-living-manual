# Chapter 0.1: Understanding EHI and the Cures Act

*Purpose: To grasp why this dataset exists and how federal law reshaped patient access to health data.*

### The Revolution That Changed Everything

On December 13, 2016, the **21st Century Cures Act** became law, fundamentally transforming how patients access their health information. This wasn't just another healthcare regulation—it was a seismic shift that required every healthcare organization to provide patients with "rapid, free, and full access" to their electronic health information. 

The law's impact is simple yet profound: patients now have the legal right to obtain *all* their health data in electronic format, without cost, and without unnecessary barriers. Healthcare providers, EHR vendors, and health information exchanges that fail to comply face penalties up to $1 million per violation.

### Two Pathways to Your Data

The Cures Act created two distinct pathways for accessing health information, each serving different needs:

**1. FHIR API Access: The Standardized Lane**
- Uses the HL7 FHIR (Fast Healthcare Interoperability Resources) standard
- Provides structured, interoperable data
- Limited to core clinical data elements defined by USCDI (United States Core Data for Interoperability)
- Perfect for apps that need common data elements like medications, lab results, and allergies
- Must be accessible "without special effort"

**2. EHI Export: The Complete Picture**
- Contains the full **Electronic Health Information (EHI)**—everything in your designated record set
- No standardized format required, just "computable and electronic"
- Includes *everything*: clinical notes, financial data, audit logs, and more
- The focus of this book because it provides access to data not available via FHIR APIs

### What Exactly Is EHI?

**Electronic Health Information (EHI)** is defined as electronic protected health information (ePHI) that would be included in a **designated record set** under HIPAA. In practical terms, this means:

<example-query description="View the scope of EHI data available in our export">
SELECT 
    COUNT(DISTINCT table_name) as total_tables,
    COUNT(*) as total_columns,
    SUM(CASE WHEN documentation IS NOT NULL THEN 1 ELSE 0 END) as documented_columns,
    ROUND(100.0 * SUM(CASE WHEN documentation IS NOT NULL THEN 1 ELSE 0 END) / COUNT(*), 1) as documentation_rate
FROM _metadata
WHERE column_name IS NOT NULL
</example-query>

This query reveals the breadth of EHI: patient demographics, encounters, diagnoses, medications, lab results, clinical notes, financial transactions, insurance information, and much more. If Epic stores it electronically and it's part of your medical or billing record, it's EHI.

### Why This Book Focuses on EHI Export

While FHIR APIs are excellent for targeted data retrieval, they only scratch the surface. Consider these scenarios where EHI export is essential:

1. **Research and Analytics**: Need to analyze treatment patterns across thousands of patients? FHIR won't give you the detailed encounter workflows, provider schedules, or financial correlations.

2. **Migration and Archival**: Moving to a new EHR system? You need *everything*, not just the standardized subset.

3. **Legal and Compliance**: Responding to litigation or audit requests requires the complete record, including metadata and audit trails not exposed via FHIR.

4. **Advanced Clinical Decision Support**: Building AI models that understand the full context of care requires access to clinical notes, nursing documentation, and communication logs.

### The Information Blocking Rules

The Cures Act doesn't just grant access rights—it actively prohibits **information blocking**, defined as practices that interfere with access, exchange, or use of EHI. There are only eight narrow exceptions:

1. **Preventing Harm**: Only when providing access could cause *physical* harm (not emotional)
2. **Privacy**: Specific privacy protections beyond HIPAA
3. **Security**: Legitimate security practices
4. **Infeasibility**: Technical impossibility
5. **Health IT Performance**: System downtime or maintenance
6. **Content and Manner**: Alternative fulfillment methods
7. **Fees**: Reasonable cost recovery allowed
8. **Licensing**: For interoperability elements

The burden of proof lies with the organization claiming an exception. The default is full access.

### Timeline and Compliance

The implementation rolled out in phases:
- **April 5, 2021**: Initial requirements for USCDI-defined data
- **October 6, 2022**: Expanded to *all* EHI
- **December 31, 2023**: Full API and export capabilities required for certified health IT

Today, any Epic organization must be able to provide you with a complete EHI export. This requirement created the very dataset we'll explore throughout this book.

---

### Key Takeaways

- The 21st Century Cures Act mandates "rapid, free, and full access" to all electronic health information
- Two access pathways exist: standardized FHIR APIs (limited scope) and complete EHI exports (everything)
- EHI includes all electronic protected health information in the designated record set—clinical and financial
- Information blocking is prohibited with only eight narrow exceptions, primarily focused on preventing physical harm
- This legal framework is why you can now access and analyze the complete Epic dataset we'll explore in this book