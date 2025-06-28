---
# Part 2: Core Clinical Domains

*From patient identity to lab results—the complete narrative of clinical care.*

Welcome to the heart of healthcare data. In the five chapters that follow, you'll explore how Epic captures the essential elements of patient care: who patients are, where they receive care, what conditions they have, what tests are ordered, and what medications they take.

This part builds directly on the patterns you mastered in Part 1. You'll see `(ID, LINE)` patterns organizing multiple diagnoses per encounter, `_HX` tables tracking address changes over time, and `_C_NAME` columns categorizing everything from appointment status to allergy severity. But now, instead of focusing on the patterns themselves, you'll focus on the clinical meaning they convey.

Each chapter represents a complete clinical domain:

- **Patient Identity and Demographics**: The foundation—how Epic identifies and describes the people receiving care
- **Encounters and Patient Movement**: The organizational spine—every interaction between patient and healthcare system
- **Diagnoses and Problems**: The clinical narrative—distinguishing episodic conditions from ongoing health issues
- **Orders and Results**: The investigative trail—from provider request to laboratory answer
- **Medications, Allergies, and Immunizations**: The safety triad—critical data for preventing adverse events

By the end of Part 2, you'll understand not just how to query clinical data, but how to interpret it correctly. You'll know why encounter diagnoses differ from problem lists, how to trace a lab order through to its results, and why a patient might have five different addresses on file.

Let's begin with the most fundamental question in healthcare: Who is the patient?

---