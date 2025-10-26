# Extraction vs Replacement Decision

- Alternatives evaluated: `mpqjs` (incomplete compression coverage), `StormLib` via WebAssembly (binary size 1.8 MB, no browser streaming), `blizzardry` (GPL).
- Decision: **Extract Edge Craft implementation** into standalone package `@edgecraft/mpq-toolkit`.
  - Pros: proven compatibility with W3X/W3M/SC2Map, existing unit coverage 82%, clean-room history.
  - Cons: ongoing maintenance responsibility mitigated via shared repo template.
- Approval: Engineering (Ravi P.) and Legal (Mina K.) 2025-10-24.
- Action items: follow extraction blueprint in PRP, schedule repo bootstrap in Sprint 45.
