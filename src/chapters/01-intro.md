# Part 1: Foundational Data Modeling Patterns

*Master the recurring patterns that govern Epic's entire database architecture.*

Welcome to the heart of Epic's data model. In the six chapters that follow, you'll learn the fundamental patterns that appear throughout all 551 tables in the EHI export. These aren't arbitrary design choices—they're systematic solutions to healthcare's complex data challenges, refined over decades of real-world use.

Think of these patterns as Epic's "grammar." Just as understanding grammar lets you construct and comprehend any sentence, mastering these patterns will let you navigate any table in the database—even ones you've never seen before.

Here's what you'll discover:

- **The (ID, LINE) Pattern**: How Epic models one-to-many relationships using composite keys
- **The (ID, GROUP_LINE, VALUE_LINE) Pattern**: The elegant solution for nested lists
- **The _HX Pattern**: Epic's approach to maintaining complete audit history
- **The _C_NAME Pattern**: Why category names appear as text, not codes
- **The _REAL Pattern**: Epic's unique decimal date format for perfect chronological sorting
- **Other Common Patterns**: Additional conventions that appear throughout the database

Each pattern builds on the previous ones. By the end of Part 1, you'll possess a mental toolkit that transforms Epic's seemingly complex database into a predictable, navigable system.

Let's begin with the most fundamental pattern of all: how Epic represents simple lists.