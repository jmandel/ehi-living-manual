# Patient Financial Dashboard Guide

## Overview

The Patient Financial Dashboard provides a comprehensive, interactive view of healthcare financial data designed specifically for patients to understand their medical billing journey.

## Dashboard Components

### 1. Header Section
- **Patient Name**: Displayed prominently at the top
- **Patient ID & Guarantor**: Basic identification information

### 2. Financial Summary Card
Quick overview of key financial metrics:
- **Total Charges**: All healthcare charges incurred
- **Total Payments**: All payments received
- **Insurance Payments**: Amount paid by insurance
- **Patient Payments**: Amount paid by patient
- **Outstanding Balance**: Current amount owed (red if positive, green if negative/credit)

### 3. Insurance Coverage Card
Details about active insurance policies:
- Payer name (e.g., "BLUE CROSS OF WISCONSIN")
- Plan details
- Member number
- Coverage dates (when available)

### 4. Recent Activity Card
Shows the 5 most recent financial events with icons:
- 🏥 Healthcare visits (encounters)
- $ Charges posted
- 📄 Claims submitted
- ✓ Payments received

### 5. Healthcare Journey Timeline
**Interactive timeline visualization** showing the chronological flow of healthcare events:

- **Blue circles**: Healthcare encounters/visits
- **Red circles**: Charges (size indicates amount)
- **Orange circles**: Claims submitted to insurance
- **Green circles**: Payments received

**Interactions**:
- Hover over any circle to see detailed information
- Circle size represents the financial amount
- X-axis shows time progression
- Y-axis separates event types for clarity

### 6. Financial Flow Sankey Diagram
**Visual representation of money flow** through the healthcare billing process:

**Left side (Sources)**:
- Professional Services (doctor charges)
- Hospital Services (facility charges)

**Middle (Processing)**:
- Total Charges aggregation
- Insurance vs Patient responsibility split

**Right side (Outcomes)**:
- Insurance payments
- Patient payments
- Deductibles
- Copays
- Coinsurance
- Write-offs

**Reading the diagram**:
- Width of flows represents dollar amounts
- Follow the paths to see how charges are processed
- Hover over flows for exact amounts

### 7. Charges by Department
**Bar chart** showing which hospital departments generated the most charges:
- Sorted by total charge amount
- Shows top 8 departments
- Hover for visit count and exact amounts
- Helps identify where healthcare dollars are spent

### 8. Monthly Trends
**Line chart** tracking financial patterns over time:
- **Red line/area**: Monthly charges
- **Green line**: Monthly payments
- Shows seasonal patterns or treatment periods
- Helps visualize payment lag times

### 9. Encounter Details Table
**Detailed table** of recent healthcare visits showing:
- **Date**: When the visit occurred
- **Department**: Where the service was provided
- **Type**: Inpatient, outpatient, emergency, etc.
- **Charges**: Total charges for that visit
- **Payments**: Payments received for that visit
- **Balance**: Outstanding amount (highlighted in red if unpaid)
- **Days Ago**: How long since the visit

**Note on Zero-Dollar Encounters**: You may see encounters with $0.00 charges. These are real clinical visits where:
- Charges haven't been posted yet
- Services were covered under a capitated payment plan
- The visit was a no-charge follow-up
- Billing is still pending

The system filters out automated system-generated encounters (CLARITY ETL artifacts) to show only real clinical visits.

## Understanding Your Financial Data

### Color Coding
- **Green**: Positive financial indicators (payments, credits)
- **Red**: Amounts owed or charges
- **Blue**: Neutral information (encounters)
- **Orange**: Claims/administrative events

### Key Terms
- **Charges**: The full price of healthcare services
- **Allowed Amount**: What insurance agrees to pay
- **Deductible**: Amount you pay before insurance starts
- **Copay**: Fixed amount you pay per visit
- **Coinsurance**: Percentage you pay after deductible
- **Write-offs**: Amounts forgiven or adjusted

### Timeline Patterns to Look For
1. **Charge Lag**: Charges may appear days/weeks after service
2. **Payment Delay**: Insurance payments typically take 30-90 days
3. **Claim Resubmissions**: Multiple claims for same service date
4. **Payment Matching**: Payments should correspond to specific charges

## Tips for Using the Dashboard

### 1. Start with the Summary
Review the financial summary card first to understand your overall situation.

### 2. Check Coverage
Verify your insurance information is correct and up-to-date.

### 3. Follow the Timeline
Use the timeline to understand the sequence of events for each healthcare episode.

### 4. Trace the Money
Use the Sankey diagram to see how charges become your responsibility.

### 5. Review Encounters
Check the encounter table for any visits with outstanding balances.

### 6. Monitor Trends
Look at monthly trends to understand your healthcare spending patterns.

## Common Questions

### "Why is my balance negative?"
A negative balance means you have a credit - you've overpaid or adjustments were made in your favor.

### "Why don't payments match charges?"
Insurance often pays less than charged amounts based on contracted rates. The difference may be written off or become patient responsibility.

### "What if I see errors?"
Contact your healthcare provider's billing department with specific transaction IDs and dates from the dashboard.

### "How current is this data?"
The dashboard shows data as of the last extraction date. Financial data typically has a 24-48 hour processing delay.

## Technical Notes

### Browser Compatibility
- Works best in modern browsers (Chrome, Firefox, Safari, Edge)
- Requires JavaScript enabled
- Responsive design adapts to screen size

### Data Privacy
- All data is processed locally in your browser
- No data is sent to external servers
- Safe to use on personal devices

### Performance
- Large datasets may take a moment to load
- Visualizations are optimized for up to 2 years of data
- Filtering options available for better performance