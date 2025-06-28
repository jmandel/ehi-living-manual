---
# Part 4: Advanced Domains and Synthesis

*From patient portals to quality metrics—putting it all together.*

Welcome to the culmination of your Epic EHI journey. In these final three chapters, you'll explore specialized data domains that extend beyond traditional clinical workflows, learn to identify and address data quality issues, and synthesize everything you've learned into powerful cross-domain analyses.

This part represents a shift in perspective. Parts 1-3 taught you Epic's data model from the ground up—patterns, clinical domains, financial flows. Now you'll apply that knowledge to real-world challenges: understanding patient-generated data from MyChart, validating data integrity, and answering complex questions that span multiple domains.

What makes these topics "advanced" isn't their complexity—it's their integration. A MyChart message might trigger a referral that generates an encounter with charges. A data quality issue in one table can cascade through related domains. A business question about readmissions requires joining clinical, financial, and administrative data.

Here's what you'll master:

- **Specialized and Patient-Generated Data**: Exploring MyChart portal interactions, social history documentation, and understanding what's notably absent from standard EHI exports
- **Data Integrity and Validation**: Building SQL queries to find orphaned records, impossible dates, and potential duplicates—becoming a data quality detective
- **Cross-Domain Analysis**: The capstone experience—tracing charges from creation to payment, calculating readmission rates, and linking clinical outcomes to financial results

This part assumes you're comfortable with Epic's patterns and core domains. You'll see fewer explanations of basic concepts and more focus on practical application. The queries become more complex, joining multiple tables to answer real questions that healthcare organizations face daily.

By the end of Part 4, you'll have evolved from a Epic data tourist to a seasoned guide, capable of navigating any corner of the EHI export and synthesizing insights that span the entire healthcare enterprise.

Let's begin by exploring the rich world of patient-generated data and specialized clinical domains.

---