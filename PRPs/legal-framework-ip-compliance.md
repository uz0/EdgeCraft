# PRP: Legal Framework & IP Compliance

**Status**: 📋 Planned (DoR Phase)
**Created**: 2025-10-26
**Complexity**: Critical
**Estimated Effort**: 4-6 weeks (research + implementation)

## 🎯 Goal / Description

Establish comprehensive legal framework for EdgeCraft organization addressing:
- IP ownership structure (Daria 30%, Vasilisa 40%, 30% reserve)
- Organization jurisdiction selection (Portugal vs Cyprus vs Delaware)
- Asset replacement strategy and timeline
- SLK file usage legality determination
- Risk assessment and mitigation for Blizzard copyrighted content
- DAO/donation legal infrastructure

**Business Value**:
- **Legal Protection**: Minimize risk of DMCA takedown or lawsuit
- **Investor Confidence**: Clear IP ownership and legal structure
- **Community Trust**: Transparent compliance and asset replacement plan
- **Strategic Clarity**: Know what we can/cannot use legally

## 🔑 Key Goals Alignment (2025-10-27)

### System Analyst Focus
- Map the legal pathway for reimplementing Warcraft III custom map mechanics (e.g., Dota) by documenting case law on idea/expression, derivative works, and interoperability defenses so we know exactly what gameplay behaviour can be mirrored without infringing Blizzard IP.
- Define a contributor and porting policy for legacy custom campaigns that requires original map authors to attest to rights, captures their license grant to EdgeCraft, and explains acceptable content transformations (data format conversion only, no Blizzard art or music redistribution).
- Produce an AGPL-first licensing strategy that keeps the engine and tooling free/open while clarifying how optional proprietary content or blockchain modules interface without violating copyleft obligations.
- Draw the explicit "red line" checklist separating safe clean-room reproduction versus infringing usage (SLK metadata, lore text, cinematic assets), including escalation points for legal counsel review.
- Coordinate with the blockchain PRP so any in-game token, NFT, or marketplace feature inherits the same compliance limits and never reintroduces Blizzard-derived assets or storylines.

### AQA Quality Gates
- Deliver the gameplay reproduction legal memo and attestation templates with dual review (internal compliance + external counsel) documented before marking DoD complete.
- Build acceptance tests that simulate importing a Warcraft III custom map, sanitize its assets, and verify the pipeline rejects Blizzard art, music, or lore strings while accepting mechanics-only data.
- Automate AGPL compliance checks (dependency scans, source availability verification) and track sign-off milestones for every release that bundles blockchain integrations or community mods.

### Developer Research Hooks
- Prototype the clean-room data conversion pipeline that extracts mechanics (triggers, pathing, unit stats) into EdgeCraft-native schemas without copying binary assets or creative expression.
- Evaluate manifest validation and hashing tools that enforce the red-line checklist, including quarantine workflows for suspect files and guidance for community replacements.
- Design integration points for privacy-preserving token rewards so blockchain telemetry and licensing obligations stay decoupled while still enabling future audits.

## 📋 Definition of Ready (DoR)

**Prerequisites to START this PRP:**

### Organizational Foundation
- [ ] **Ownership percentages finalized** (Daria 30%, Vasilisa 40%, 30% reserve confirmed by all parties)
- [ ] **Organization legal structure decision made** (non-profit vs for-profit)
- [ ] **Jurisdiction selection criteria documented** (tax implications, crypto regulations, donation laws)
- [ ] **Primary bank account jurisdiction selected** (Portugal vs Cyprus vs other)
- [ ] **Expected revenue streams defined** (donations only vs marketplace vs other)

### Current Asset Inventory (Blocking Information)
- [ ] **Complete inventory of Blizzard-sourced assets documented**
  - [ ] List of all textures currently loaded from hiveworkshop
  - [ ] List of all SLK files in use (terrain.slk, CliffTypes.slk, etc.)
  - [ ] Percentage of SLK data that is "format/structure" vs "Blizzard creative content"
  - [ ] List of all MDX models referenced (cliff models, doodads, units)
  - [ ] List of all BLP/DDS texture file dependencies
- [ ] **Asset replacement cost estimates available**
  - [ ] Cost per texture (commission or creation time)
  - [ ] Cost per 3D model (commission or creation time)
  - [ ] Total budget estimate for 100% legal compliance
  - [ ] Timeline estimate for asset replacement (weeks/months)

### Risk Tolerance & Timeline
- [ ] **Legal risk tolerance defined by CEO**
  - [ ] Conservative (0% Blizzard content tolerated)
  - [ ] Moderate (reverse-engineered formats OK, data extraction debatable)
  - [ ] Aggressive (push DMCA 1201(f) interoperability defense)
- [ ] **Compliance deadline established**
  - [ ] Must be compliant before public beta launch? (Y/N)
  - [ ] Must be compliant before accepting donations? (Y/N)
  - [ ] Grace period allowed for asset replacement (0-12 months)
- [ ] **Funding availability confirmed**
  - [ ] Budget allocated for legal consultation ($X USD)
  - [ ] Budget allocated for asset replacement ($Y USD)
  - [ ] Funding source confirmed (founders, pre-seed, grants)

### Technical Context
- [ ] **Current codebase audit complete**
  - [ ] Zero Blizzard code in repository (clean-room confirmed)
  - [ ] Zero Blizzard assets checked into Git
  - [ ] Runtime asset download workflow documented
  - [ ] Manifest system architecture reviewed (manifest.json, warcraft-manifest.json)
- [ ] **File format usage documented**
  - [ ] W3E parser: Reads binary structure only (no creative content)
  - [ ] SLK parser: Reads tabular format AND content (BLOCKER?)
  - [ ] MPQ parser: Archive format only (DMCA 1201(f) likely safe)

## ❓ Questions for CEO/CTO (Must Answer Before DoR Complete)

### 1. Organization Structure & Jurisdiction

**Q1.1**: What is the primary goal of the organization?
- [ ] Non-profit: Community-driven, donations fund development
- [ ] For-profit: Revenue-generating, investors/shareholders
- [ ] Hybrid: Non-profit foundation + for-profit development arm

**CEO Answer**: _____________

**Q1.2**: Where should the organization be legally registered?

| Option | Pros | Cons |
|--------|------|------|
| **Portugal** | EU member, local presence, non-profit status available | Complex crypto regulations, higher taxes |
| **Cyprus** | Crypto-friendly, low taxes, IP holding jurisdiction | Distance from team, regulatory scrutiny |
| **Delaware (USA)** | Clear legal framework, C-corp structure, crypto clarity | US securities law (tokens likely regulated), IRS compliance |

**CEO Decision**: _____________

**Q1.3**: Will the organization accept donations?
- [ ] Crypto donations only (DAO treasury)
- [ ] Fiat donations (bank account)
- [ ] Both crypto and fiat
- [ ] No donations (funded by founders/investors only)

**CEO Answer**: _____________

**Q1.4**: Will the organization generate revenue beyond donations?
- [ ] Marketplace fees (maps, mods, assets)
- [ ] Premium features (cloud saves, pro editor)
- [ ] Sponsorships/partnerships
- [ ] Grants (Ethereum Foundation, gaming grants)
- [ ] None (donations only)

**CEO Answer**: _____________

---

### 2. Asset Replacement Strategy

**Q2.1**: What is the acceptable timeline for removing Blizzard assets?
- [ ] **Immediate** (before any public release)
- [ ] **3 months** (grace period for MVP testing)
- [ ] **6 months** (progressive replacement during beta)
- [ ] **12 months** (full replacement by version 1.0)

**CEO Decision**: _____________

**Q2.2**: What is the budget for asset replacement?
- **Textures**: ~50-100 terrain textures @ $X each = $Y total
- **3D Models**: ~200-500 models (cliffs, doodads, units) @ $X each = $Y total
- **Animations**: ~50-100 animation sets @ $X each = $Y total
- **Total Budget**: $____________ USD
- **Funding Source**: ____________

**CEO Answer**: _____________

**Q2.3**: What is the asset replacement approach?
- [ ] **Option A**: Commission artists (faster, higher cost)
- [ ] **Option B**: Open-source community contributions (slower, free)
- [ ] **Option C**: AI-generated assets (fast, cheap, legal gray area)
- [ ] **Option D**: Hybrid (critical assets commissioned, rest community)

**CEO Decision**: _____________

**Q2.4**: Can we use SLK file **data** (not format)?

**Context**: `terrain.slk` contains texture names, paths, and metadata. Is this:
- [ ] Format/structure only (SAFE - reverse engineering)
- [ ] Blizzard creative content (UNSAFE - copyright violation)
- [ ] Uncertain (need legal opinion)

**Decision**:
- [ ] **Allowed**: Extract SLK data, map to original assets (current approach)
- [ ] **Forbidden**: No SLK data, recreate metadata from scratch
- [ ] **Consult Lawyer**: Ambiguous, need DMCA 1201(f) legal analysis

**CEO Answer**: _____________

---

### 3. Legal Risk Assessment

**Q3.1**: Has the team received any legal threats from Blizzard?
- [ ] Yes (details: _____________)
- [ ] No
- [ ] Not yet, but concerned

**CEO Answer**: _____________

**Q3.2**: What is the CEO's risk tolerance for DMCA takedown?
- [ ] **Zero tolerance**: Must be 100% compliant NOW
- [ ] **Low risk**: Comfortable with DMCA 1201(f) defense (interoperability)
- [ ] **Moderate risk**: Willing to replace assets AFTER beta feedback
- [ ] **High risk**: Ship MVP, deal with DMCA if/when it happens

**CEO Answer**: _____________

**Q3.3**: Will the organization proactively engage with Blizzard legal?
- [ ] Yes - send legal letter explaining clean-room implementation
- [ ] No - avoid drawing attention until product launch
- [ ] Maybe - depends on lawyer recommendation

**CEO Answer**: _____________

**Q3.4**: Does the organization have legal insurance?
- [ ] Yes (policy covers IP disputes)
- [ ] No (founders personally liable)
- [ ] Planned (will purchase before public launch)

**CEO Answer**: _____________

---

### 4. IP Ownership & Brand Strategy

**Q4.1**: Who owns "The Edge" IP?
- [ ] Vasilisa Versus (40%) + Daria Kostileva (30%) + Organization (30%)
- [ ] Organization owns 100% (founders assign rights)
- [ ] Unclear (needs formal IP assignment agreement)

**CEO Answer**: _____________

**Q4.2**: Is "The Edge" brand registered?
- [ ] Yes - trademark filed in ____________ (country)
- [ ] No - unregistered brand (risk of name collision)
- [ ] In progress - filing in next 30 days

**CEO Answer**: _____________

**Q4.3**: What happens if Blizzard sends DMCA takedown?
- [ ] **Option A**: Immediately comply, replace all flagged assets
- [ ] **Option B**: Counter-notice (DMCA 1201(f) defense)
- [ ] **Option C**: Shut down temporarily, consult lawyer, relaunch
- [ ] **Option D**: Ignore (NOT RECOMMENDED - illegal)

**CEO Answer**: _____________

---

## 🔬 Research Required (Before DoR Can Be Checked)

### Legal Research
1. **DMCA Section 1201(f) Applicability**
   - Does reverse-engineering Blizzard file formats qualify as "interoperability"?
   - Can we legally extract SLK data if we implement our own SLK parser?
   - Does "clean-room implementation" extend to game data structures?

2. **Jurisdiction Comparison Matrix**
   - **Portugal**: Non-profit registration process, crypto donation laws, tax treatment
   - **Cyprus**: IP holding structure, crypto regulations, EU compliance
   - **Delaware**: C-corp vs LLC, securities law for tokens, IRS crypto reporting

3. **Asset Replacement Precedents**
   - Research how OpenRCT2, OpenMW, OpenRA handled asset replacement
   - Find case studies of game engines that transitioned from copyrighted to original assets
   - Document timeline, budget, community contribution models

### Technical Research
4. **SLK File Content Analysis**
   - Percentage of SLK data that is "creative" vs "functional"
   - Legal opinion: Is texture name mapping copyrightable? (e.g., "Ashen_Dirt" → ID 4)
   - Alternative: Can we create our own texture metadata format?

5. **Asset Replacement Roadmap**
   - Prioritize critical assets (terrain textures, cliff models)
   - Identify low-risk replacements (generic textures like "grass", "dirt")
   - Estimate artist time: hours per texture/model

## 📚 Research / Related Materials (2025-10-27)

### Legal Precedent Digest
- *Sega v. Accolade* (1992) and *Sony v. Connectix* (1999) confirm that reverse-engineering for interoperability is lawful if no copyrighted assets are redistributed, reinforcing our clean-room stance for file formats and engine behaviour replication.
- *Micro Star v. FormGen* (1998) ruled that distributing user levels bundled with original art constituted an infringing derivative work, underscoring that any Warcraft III port must exclude Blizzard textures, models, music, and lore verbatim.
- *Blizzard v. Valve* (2012) over the DOTA trademark illustrates that custom map authors can convey rights to their unique contributions but do not gain ownership over Blizzard IP; we must secure explicit contributor assignments for any legacy campaign imports.
- *Lewis Galoob v. Nintendo* (1992) highlighted that ephemeral gameplay modifications are permissible when no fixed copy is created, meaning we can mirror mechanics (damage formulas, ability behaviour) so long as no Blizzard expressive content ships with EdgeCraft.
- EU idea/expression doctrine and US case law both protect abstract mechanics and game systems, but names, storylines, and distinctive visual/audio elements remain off-limits without licensing.

### Safe Porting & Contributor Controls
- Require contributor representations that they own (or have retained) the rights to all non-Blizzard creative content in the map; provide a templated assignment granting EdgeCraft a perpetual, irrevocable license to redistribute converted materials under AGPL-compatible terms.
- Build an ingestion checklist that automatically strips or blocks Blizzard BLP/DDS textures, MDX models, voice lines, music, scripted dialog, and canonical lore strings during conversion.
- Maintain provenance logs for every imported map to document author identity, original publication date, and proof of consent, creating a defensible audit trail if takedown claims arise.
- Document the “red line” matrix: mechanics logic, numeric balance, trigger flow, unit stats = ✅; art assets, cinematics, Warcraft race names, campaign text, music cues, hero likenesses = 🚫 unless independently recreated.

### Licensing & AGPL Interface Notes
- Core engine and tooling remain AGPL; optional blockchain connectors or proprietary asset packs must interact via network/service boundaries to avoid copyleft contamination.
- Provide dual-license guidance for community submissions: code contributions under AGPL, creative assets under CC-BY or custom permissive terms that allow redistribution within EdgeCraft while avoiding Blizzard dependencies.
- Coordinate with blockchain PRP so smart contracts, NFT metadata, and token reward systems never encode Blizzard-owned identifiers or textures, preventing accidental derivative works through on-chain data.

### Open Questions
- Confirm whether ported custom campaign authors retained rights if their work incorporated Blizzard cinematics or voice lines (likely no); need legal review before allowing such imports.
- Validate DMCA 1201(f) applicability when distributing tooling that parses SLK data but not the original files—counsel opinion required.
- Determine if localization text databases require redaction (Warcraft-specific jargon) or if generic replacements suffice for first release.

### Third-Party License Attributions (Last Updated: 2025-10-26)

**Apache-2.0 Licensed Dependencies**:
- Babylon.js (@babylonjs/core@8.32.2, @babylonjs/loaders@8.32.2) - https://www.babylonjs.com/
- TypeScript (typescript@5.9.3) - https://www.typescriptlang.org/
- Playwright (playwright@1.56.1, @playwright/test@1.56.1) - https://playwright.dev/
- SWC (@swc/core@1.13.5 and platform packages) - https://swc.rs/
- ESLint (eslint@latest and plugins) - https://eslint.org/
- Testing Library dependencies (aria-query@5.3.2) - https://testing-library.com/
- Jest Image Snapshot (jest-image-snapshot@6.5.1) - https://github.com/americanexpress/jest-image-snapshot
- Other Apache-2.0: @eslint/*, @humanfs/*, @humanwhocodes/*, babylonjs-gltf2interface@8.32.2, baseline-browser-mapping@2.8.18, bser@2.1.1, fast-diff@1.3.0, fb-watchman@2.0.2, human-signals@2.1.0, intn@1.0.0, walker@1.0.8, xml-name-validator@4.0.0

**Creative Commons**:
- Can I Use (caniuse-lite@1.0.30001751) - CC-BY-4.0 - https://caniuse.com/

**Dual-Licensed**:
- Harmony Reflect (harmony-reflect@1.6.2) - Apache-2.0 OR MPL-1.1 - https://github.com/tvcutsem/harmony-reflect

**Game Assets**:
- All assets are original creations, CC0/MIT/Apache-2.0 licensed, or temporary placeholders
- Temporary: Warcraft III terrain textures and cliff models from https://www.hiveworkshop.com/casc-contents (development only, planned replacement before public release)

---

## ✅ Definition of Done (DoD)

**Deliverables to COMPLETE this PRP:**

- [ ] **Legal Q&A Document Created** (this file, with CEO answers filled in)
- [ ] **Organization Structure Finalized**
  - [ ] Legal entity registered (Portugal/Cyprus/Delaware)
  - [ ] Ownership percentages formally documented
  - [ ] Bank account or DAO treasury established
- [ ] **Asset Inventory & Replacement Plan**
  - [ ] Complete list of Blizzard-sourced assets
  - [ ] Replacement timeline (0-12 months)
  - [ ] Budget allocated and funding secured
- [ ] **Legal Opinion Obtained**
  - [ ] DMCA 1201(f) analysis (SLK usage, format reverse engineering)
  - [ ] Securities law analysis (if tokens planned)
  - [ ] Jurisdiction recommendation with rationale
- [ ] **Risk Mitigation Strategy**
  - [ ] DMCA response plan documented
  - [ ] Insurance obtained (if applicable)
  - [ ] Blizzard engagement decision made
- [ ] **Updated .gitignore & Compliance Pipeline**
  - [ ] Blizzard file patterns blocked from commits
  - [ ] CI/CD checks prevent copyrighted file commits
  - [ ] Legal compliance validation script working
- [ ] **Documentation Updated**
  - [ ] README.md with legal disclaimer
  - [ ] LICENSES.md with asset attributions
  - [ ] CONTRIBUTING.md with IP assignment clause

---

## 📋 Progress Tracking

| Date | Role | Change Made | Status |
|------|------|-------------|--------|
| 2025-10-26 | System Analyst | Created PRP with comprehensive DoR checklist | Planned |
| 2025-10-27 | System Analyst | Added cross-PRP key goals for Warcraft mechanic reproduction and compliance alignment | Planned |
| 2025-10-27 | Legal Research | Logged precedent findings on mechanics replication, contributor controls, and AGPL interfaces | Planned |
| _TBD_ | CEO | Answer prerequisite questions | Pending |
| _TBD_ | Legal Team | Research jurisdiction options | Pending |
| _TBD_ | Developer | Complete asset inventory | Pending |

---

## 📝 Notes

**This PRP is BLOCKING blockchain/tokenomics work.**

PRP 2 (Blockchain MVP) cannot start until:
- Organization jurisdiction finalized
- Legal structure established
- Token classification determined (utility vs security)

**Next Steps:**
1. CEO completes all questionnaires in this document
2. Schedule legal consultation ($1,000-$5,000 for initial opinion)
3. Complete asset inventory (what uses Blizzard content)
4. Mark DoR as ✅ Complete
5. Begin implementation phase

---

**Status**: 📋 Planned - Awaiting CEO Input
