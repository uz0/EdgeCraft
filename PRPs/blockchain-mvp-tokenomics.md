# PRP: Blockchain MVP & Tokenomics

**Status**: 📋 Planned (DoR Phase - BLOCKED by PRP Legal Framework)
**Created**: 2025-10-26
**Complexity**: High
**Estimated Effort**: 8-12 weeks (design + implementation + audit)

## 🎯 Goal / Description

Design and implement blockchain infrastructure and token economics for EdgeCraft:
- Token utility definition (governance, access, rewards, marketplace)
- Distribution model (founders 30%+40%, community, treasury, investors)
- Blockchain platform selection (Polygon recommended)
- Smart contract development (token, DAO, staking, marketplace)
- Donation infrastructure (crypto + fiat)
- Compliance strategy (avoid securities classification)

**Business Value**:
- **Community Ownership**: DAO governance gives players voice in game direction
- **Sustainable Funding**: Crypto + fiat donations fund development
- **Creator Economy**: Tokenized marketplace rewards map/mod creators
- **Network Effect**: Token incentivizes user growth and retention

## 🔑 Key Goals Alignment (2025-10-27)

### System Analyst Focus
- Align with the legal PRP to decide whether a privacy-preserving network (Aztec, zk rollups, or similar) can host an anonymous in-game currency without triggering securities or money-transmitter exposure; capture decision criteria and required legal sign-offs.
- Draft the yellowpaper structure covering total supply, 40% gameplay reward pool for "LLM token sharing" (player-provided compute/token allowances), DAO treasury splits, and guardrails that keep the system AGPL-friendly and free-to-play aligned.
- Define comparative hypotheses that prove blockchain integration improves retention/monetisation versus a non-chain rewards system, including measurable KPIs and fallback plan if compliance costs outweigh benefits.
- Scope a pilot for optional NFT inventory attachments (e.g., ERC-1155 loadouts) that respects lore/original-assets guidelines and keeps ownership/licensing boundaries clear.
- Identify gating dependencies: Legal green-light on derivative works policy, privacy law review for anonymous rewards, and operational readiness for treasury custody.

### AQA Quality Gates
- Build a validation matrix that documents anonymity guarantees (zero-knowledge proofs, relayer trust model) and records compliance/legal approval before any mainnet deployment.
- Simulate the 40% player reward distribution across varied engagement cohorts to ensure fairness, anti-sybil protections, and treasury solvency thresholds are met.
- Establish pre-launch audit criteria covering smart contracts, privacy infrastructure, AML/KYC posture, and stress testing for token emission plus NFT attachments.

### Developer Research Hooks
- Evaluate Aztec (or comparable privacy L2) SDK maturity, throughput, and relayer requirements to confirm it can sustain real-time in-game micro-rewards with acceptable latency and fees.
- Model the "share LLM tokens" mechanic: how off-chain compute/LLM allowances map to on-chain attestations, what oracle or proof system is needed, and how to prevent data leakage.
- Prototype inventory-linked NFT architecture (likely ERC-1155 with off-chain metadata) and outline how it syncs with EdgeCraft inventory without exposing Blizzard-derived content.
- Investigate wallet abstraction or account abstraction flows that keep the anonymous internal currency easy to onboard while respecting AGPL distribution requirements and parental controls.

**Dependencies**:
- ⚠️ **BLOCKED**: Legal Framework PRP must be complete first
- Organization jurisdiction affects token classification
- Securities law compliance depends on token design
- DAO structure depends on legal entity type

## 📋 Definition of Ready (DoR)

**Prerequisites to START this PRP:**

### Organizational & Legal Foundation (Dependencies on PRP 1)
- [ ] **Legal Framework PRP (PRP 1) is COMPLETE** ✅
  - [ ] Organization jurisdiction finalized
  - [ ] Legal structure established (non-profit vs for-profit)
  - [ ] Securities law compliance approach determined
- [ ] **Token legal classification determined**
  - [ ] Utility token (not a security)
  - [ ] Security token (regulated, requires compliance)
  - [ ] Hybrid (governance + utility)
  - [ ] No token (donations only via fiat/crypto)
- [ ] **Regulatory requirements documented**
  - [ ] Jurisdiction crypto regulations reviewed
  - [ ] KYC/AML requirements identified (if applicable)
  - [ ] Tax reporting obligations defined

### Business Model & Revenue Strategy
- [ ] **Primary revenue streams defined**
  - [ ] Donations (crypto + fiat)
  - [ ] Marketplace fees (maps, mods, assets)
  - [ ] Premium features (subscription, one-time purchase)
  - [ ] Grants (Ethereum Foundation, gaming ecosystems)
  - [ ] Token sales (private round, public sale)
- [ ] **Token utility clearly defined**
  - [ ] What does the token DO in the game? (governance, access, rewards)
  - [ ] Why would users buy/hold the token?
  - [ ] How does token create value for holders?
- [ ] **Distribution model decided**
  - [ ] Founders: _____% (Daria 30%, Vasilisa 40%, team 30%?)
  - [ ] Community: _____% (airdrops, gameplay rewards)
  - [ ] Treasury: _____% (development fund, DAO governance)
  - [ ] Investors: _____% (pre-seed, seed rounds)
  - [ ] Advisors: _____% (legal, technical, marketing)

### Technical Foundation
- [ ] **Blockchain platform selected**
  - [ ] **Ethereum** (high security, high gas fees, ERC-20/ERC-721)
  - [ ] **Polygon** (low fees, Ethereum-compatible, gaming-friendly) ← RECOMMENDED
  - [ ] **Arbitrum/Optimism** (Layer 2, lower fees than Ethereum)
  - [ ] **Avalanche/BNB Chain** (fast, low cost, smaller ecosystem)
  - [ ] **Custom chain** (full control, high complexity)
- [ ] **Smart contract requirements documented**
  - [ ] Token contract (ERC-20, ERC-721, or custom)
  - [ ] DAO governance contract (voting, proposals)
  - [ ] Marketplace contract (escrow, royalties)
  - [ ] Staking contract (lock tokens, earn rewards)
  - [ ] In-game asset contracts (NFTs for maps/mods?)
- [ ] **Wallet integration strategy defined**
  - [ ] MetaMask (browser extension, most popular)
  - [ ] WalletConnect (mobile-friendly, multi-wallet)
  - [ ] Custom wallet (full control, higher complexity)
  - [ ] No wallet (fiat donations only)

### Financial & Compliance
- [ ] **Budget allocated for blockchain development**
  - [ ] Smart contract development: $_______ USD
  - [ ] Security audit: $_______ USD (CRITICAL - must audit before mainnet)
  - [ ] Legal opinion (token classification): $_______ USD
  - [ ] Blockchain infrastructure (nodes, APIs): $_______ USD/month
- [ ] **Token supply & economics defined**
  - [ ] Total supply cap: ____________ tokens
  - [ ] Initial supply: ____________ tokens
  - [ ] Inflation rate: _____% per year (or deflationary)
  - [ ] Burning mechanism: Y/N (reduce supply over time)
- [ ] **Donation infrastructure ready**
  - [ ] **Crypto**: DAO treasury wallet address (multi-sig recommended)
  - [ ] **Fiat**: Bank account or payment processor (Stripe, PayPal)
  - [ ] Tax receipts for donations (if non-profit)

---

## ❓ Questions for CEO (Must Answer Before DoR Complete)

### 1. Token Purpose & Utility

**Q1.1**: What is the PRIMARY purpose of the token?
- [ ] **Governance**: Vote on game features, map curation, treasury spending
- [ ] **Access**: Unlock premium maps, editor features, multiplayer servers
- [ ] **Rewards**: Earn tokens by playing, creating maps, contributing code
- [ ] **Currency**: Buy/sell in-game assets (maps, mods, skins) on marketplace
- [ ] **Staking**: Lock tokens to earn rewards, access exclusive content
- [ ] **Hybrid**: Multiple utilities (e.g., governance + rewards + marketplace)

**CEO Answer**: _____________

**Q1.2**: Why would users want to hold the token?
- [ ] Speculative value (expect price to increase)
- [ ] Governance power (influence game direction)
- [ ] Access to premium content
- [ ] Earn passive income (staking rewards)
- [ ] Support the project (donation alternative)

**CEO Answer**: _____________

**Q1.3**: Will the token be listed on exchanges?
- [ ] Yes - target exchanges: ____________ (Uniswap, Binance, Coinbase)
- [ ] No - internal use only (not tradeable)
- [ ] Maybe - depends on community demand

**CEO Answer**: _____________

---

### 2. Token Distribution & Economics

**Q2.1**: What is the token distribution?

| Allocation | Percentage | Vesting | Lockup |
|-----------|-----------|---------|--------|
| Founders (Daria, Vasilisa) | ___% | ___ months | ___ months |
| Community (gameplay, airdrops) | ___% | Immediate | None |
| Treasury (DAO, development) | ___% | N/A (locked) | Governance |
| Investors (pre-seed, seed) | ___% | ___ months | ___ months |
| Team (developers, advisors) | ___% | ___ months | ___ months |

**CEO fills in**: _____________

**Q2.2**: How will tokens be distributed?
- [ ] **Airdrop**: Free tokens to early users/testers
- [ ] **Gameplay rewards**: Earn tokens by playing matches, creating maps
- [ ] **Staking**: Lock tokens to earn more tokens
- [ ] **Token sale**: Sell tokens to investors/public (RISK: securities law)
- [ ] **Mining**: Proof-of-work/stake (unlikely for game token)

**CEO Answer**: _____________

**Q2.3**: What is the token supply model?
- [ ] **Fixed supply** (e.g., 1 billion tokens, no inflation)
- [ ] **Inflationary** (new tokens minted over time, e.g., 5% per year)
- [ ] **Deflationary** (tokens burned via marketplace fees, buybacks)
- [ ] **Hybrid** (inflation + burning, net neutral or deflationary)

**Example**:
- Total supply: 1,000,000,000 tokens
- Initial circulating supply: 100,000,000 tokens (10%)
- Inflation: 5% per year for first 5 years
- Burning: 2% of marketplace fees burned

**CEO Answer**: _____________

---

### 3. Blockchain Platform & Infrastructure

**Q3.1**: Which blockchain should we use?

| Platform | Pros | Cons | Recommendation |
|----------|------|------|----------------|
| **Ethereum** | Most secure, largest ecosystem, high liquidity | High gas fees ($10-100 per transaction) | ❌ Too expensive for gameplay |
| **Polygon** | Low fees ($0.01 per tx), Ethereum-compatible, gaming focus | Less decentralized than Ethereum | ✅ **RECOMMENDED** for gaming |
| **Arbitrum/Optimism** | Ethereum L2, lower fees, good security | Smaller ecosystem than Polygon | ✅ Good alternative |
| **Avalanche/BNB Chain** | Very low fees, fast, gaming-friendly | Centralized (BNB), smaller dev community | ⚠️ Consider for Asia market |

**CEO Decision**: Use ____________ blockchain

**Q3.2**: Will we deploy smart contracts on mainnet immediately?
- [ ] **Testnet first** (6-12 months testing, no real money)
- [ ] **Mainnet at MVP launch** (real tokens from day 1)
- [ ] **Hybrid** (testnet for beta, mainnet for v1.0)

**CEO Answer**: _____________

**Q3.3**: Will we run our own blockchain nodes?
- [ ] Yes (full control, higher cost ~$500-1000/month)
- [ ] No (use Infura, Alchemy, or QuickNode APIs)

**CEO Answer**: _____________

---

### 4. DAO Governance & Treasury

**Q4.1**: How will the DAO treasury be managed?
- [ ] **Multi-sig wallet** (e.g., 3-of-5 signatures required)
  - Signers: Daria, Vasilisa, CTO, community rep 1, community rep 2
- [ ] **DAO voting** (token holders vote on spending proposals)
- [ ] **Hybrid** (multi-sig for small expenses, DAO vote for large expenses)

**CEO Answer**: _____________

**Q4.2**: What can the DAO treasury fund?
- [ ] Developer salaries
- [ ] Asset replacement (textures, models)
- [ ] Marketing campaigns
- [ ] Legal fees
- [ ] Community grants (map creators, modders)
- [ ] Infrastructure (servers, CDN)

**CEO Answer**: _____________

**Q4.3**: How will community members earn tokens?
- [ ] **Play-to-earn**: Win matches, complete achievements
- [ ] **Create-to-earn**: Upload popular maps, get downloads
- [ ] **Contribute-to-earn**: Fix bugs, improve codebase
- [ ] **Stake-to-earn**: Lock tokens, earn yield

**Example Reward Structure**:
- Win a match: 10 tokens
- Upload a map: 50 tokens (+ 1% of marketplace fees if sold)
- Fix a bug: 100-500 tokens (based on complexity)
- Stake 1000 tokens: Earn 5% APY (50 tokens/year)

**CEO Answer**: _____________

---

### 5. Compliance & Securities Law

**Q5.1**: Is the token a security under the Howey Test?

**Howey Test** (SEC definition of a security):
1. Investment of money? **YES** (users buy/earn tokens)
2. Common enterprise? **YES** (EdgeCraft organization)
3. Expectation of profit? **DEPENDS** (if token price increases)
4. Efforts of others? **DEPENDS** (if value comes from team's work)

**If YES to all 4 → SECURITY → Heavy regulation (accredited investors only, SEC registration)**

**Q5.2**: How can we avoid securities classification?
- [ ] **Utility focus**: Token grants access/features, NOT investment
- [ ] **Decentralization**: No central team controlling value
- [ ] **Burn investor marketing**: Don't promise profits or price increases
- [ ] **Fair launch**: No pre-sale to investors, all tokens earned via gameplay
- [ ] **Legal opinion**: Hire lawyer to issue safe harbor opinion

**CEO Decision**:
- [ ] **Conservative**: No token until legal clarity (donations only)
- [ ] **Moderate**: Launch utility token, avoid securities language
- [ ] **Aggressive**: Launch token, deal with SEC if they challenge

**CEO Answer**: _____________

---

### 6. Donation Infrastructure

**Q6.1**: How will the organization accept donations?

**Crypto Donations**:
- [ ] **DAO treasury wallet** (multi-sig recommended)
  - Ethereum address: 0x____________
  - Polygon address: 0x____________
- [ ] **Supported tokens**: ETH, USDC, USDT, DAI, MATIC
- [ ] **Tax receipts**: Y/N (if non-profit)

**Fiat Donations**:
- [ ] **Bank account**: Direct deposit (need organization bank account)
- [ ] **Payment processors**: Stripe, PayPal, Patreon
- [ ] **Crypto-to-fiat**: Coinbase Commerce (accept crypto, receive fiat)

**CEO Answer**: _____________

**Q6.2**: Will donations grant tokens?
- [ ] Yes (1 USD = X tokens)
- [ ] No (donations are separate from token economics)
- [ ] Optional (donors can choose to receive tokens or not)

**CEO Answer**: _____________

**Q6.3**: Are donations tax-deductible?
- [ ] Yes (requires non-profit status, e.g., 501(c)(3) in USA)
- [ ] No (for-profit organization)
- [ ] Depends on jurisdiction

**CEO Answer**: _____________

---

## 🔬 Research Required (Before DoR Can Be Checked)

### Legal Research
1. **Securities Law Analysis**
   - Apply Howey Test to EdgeCraft token design
   - Research "safe harbor" frameworks (e.g., SEC guidance on utility tokens)
   - Identify jurisdictions with crypto-friendly regulations (Switzerland, Singapore, Portugal)

2. **DAO Legal Structure**
   - Research DAO legal wrappers (Wyoming DAO LLC, Swiss Foundation)
   - Liability protection for DAO members
   - Tax treatment of DAO treasury

3. **Token Sale Compliance**
   - If token sale planned: KYC/AML requirements
   - Accredited investor rules (if security token)
   - Crowdfunding regulations (Reg CF, Reg A+ in USA)

### Technical Research
4. **Blockchain Platform Comparison**
   - Gas fees: Ethereum vs Polygon vs Arbitrum
   - Transaction speed: Block time, finality
   - Developer tools: SDKs, indexers (The Graph), wallets
   - Gaming ecosystem: Existing games on each platform

5. **Smart Contract Audits**
   - Research audit firms: OpenZeppelin, CertiK, Trail of Bits
   - Cost: $5,000 - $50,000 depending on complexity
   - Timeline: 2-4 weeks

6. **Token Distribution Mechanisms**
   - Airdrop tools: Merkle drop, claim contracts
   - Vesting contracts: Cliff, linear unlock, milestone-based
   - Staking contracts: Simple yield vs governance staking

### Economic Research
7. **Tokenomics Benchmarks**
   - Research gaming token models: Axie Infinity (AXS), Decentraland (MANA), Immutable X (IMX)
   - Analyze supply/demand dynamics
   - Model token price scenarios (best case, base case, worst case)

8. **Treasury Management**
   - DAO treasury diversification (hold stablecoins vs native tokens)
   - Yield farming strategies (earn interest on treasury)
   - Risk management (hedging, insurance)

## 📚 Research / Related Materials (2025-10-27)

### Privacy Network Comparison
- **Aztec**: Upcoming Aztec Network (Noir-based, private-by-default) targets ~200 TPS with hybrid rollup design; Connect sunset (2024) means production timeline uncertain, so pilot would rely on devnet/testnet and requires running our own sequencer/relayer. Strength: programmable privacy (shielded transfers, on-chain anonymity). Risk: immature tooling, limited wallet support; compliance review needed because fully private flows trigger regulatory scrutiny.
- **Polygon zkEVM**: Public, high compatibility with Ethereum tooling, ~30-50 TPS today, no native privacy. Could pair with third-party privacy layer (Railgun, zkMoney) for optional shielding but adds UX friction. Good for mainnet readiness and exchange liquidity.
- **Starknet**: Cairo-based, ~20 TPS currently with roadmap to higher throughput; account abstraction native (helpful for gas sponsorship). Privacy currently absent, though projects like ZKLend exploring. Needs custom Cairo dev skills.
- **zkSync Era**: EVM-like via LLVM transpilation, 2000+ TPS target, ecosystem growing; offers `zkPorter` for hybrid data availability but not privacy. Easiest path if anonymity requirement can be scoped to off-chain mixing.
- **Manta Pacific / Secret Network**: Provide privacy features (Celestia DA for Manta, TEE-based for Secret) but smaller ecosystems; TEEs raise trust concerns for AGPL alignment.

### Currency Architecture Insights
- For the 40% gameplay reward pool, model emissions using `rewardPerBlock = (annualRewardPool / blocksPerYear)` with dynamic difficulty: scale rewards by `playerShare = individualContribution / totalContribution`, where contribution = verified LLM token allotments + in-game time. Apply anti-sybil caps by binding contributions to soulbound reputation NFTs or staked collateral.
- Implement dual-bucket treasury: 40% player rewards (streamed via vesting contract), 30% community grants (map creators), 20% operations, 10% reserve. Vesting contracts should be upgrade-resistant (use OpenZeppelin `CliffVesting` + timelock governor).
- Anonymous payouts require relayer-operated shielded pools (Aztec or alternative). If Aztec unavailable, consider building on Polygon with Semaphore-style zero-knowledge claims: players submit proofs of weekly activity to claim payouts without exposing addresses.

### NFT Pilot Considerations
- Prefer ERC-1155 for inventory attachments (stackable items, skins). Metadata stored on IPFS/Arweave with hashes recorded in manifest; ensure all art is original or procedurally generated to comply with legal PRP.
- Implement opt-in bridging: NFTs only unlock cosmetic inventory slots; gameplay effects remain server-authoritative to avoid pay-to-win perceptions.
- Track provenance in `PlaySession` structs so rewards can reference both fungible tokens and optional NFT drops from the same proof-of-play attestation.

### UX & Compliance Notes
- Account abstraction (EIP-4337) or Sequencer-sponsored transactions needed for frictionless onboarding; evaluate Biconomy or native Starknet AA depending on chosen chain.
- Integrate privacy disclosures and parental controls: shielded currency must allow voluntary transparency (view keys) when required by law or tournaments.
- Draft fallback plan: if privacy chain not production-ready, release on public L2 with obfuscation limited to off-chain reward escrow until compliance counsel signs off on full anonymity.

### Open Questions
- Can we source or operate a compliant relayer network that keeps user data anonymous while still blocking sanctioned addresses?
- What oracle infrastructure will attest to “LLM token sharing” without revealing proprietary usage data? Explore ZK-proof-of-resource.
- How do we sunset or migrate tokens if privacy chain changes (Aztec delays)? Need upgrade/migration clause in yellowpaper.

---

## ✅ Definition of Done (DoD)

**Deliverables to COMPLETE this PRP:**

- [ ] **Tokenomics Model Finalized**
  - [ ] Token utility documented (governance, access, rewards)
  - [ ] Distribution spreadsheet created (founders, community, treasury)
  - [ ] Supply model defined (fixed, inflationary, deflationary)
  - [ ] Reward structure documented (play-to-earn, create-to-earn)
- [ ] **Smart Contracts Developed**
  - [ ] Token contract (ERC-20 or custom)
  - [ ] DAO governance contract (voting, proposals)
  - [ ] Staking contract (lock tokens, earn yield)
  - [ ] Marketplace contract (escrow, royalties) - OPTIONAL for MVP
- [ ] **Security Audit Passed**
  - [ ] Audit firm selected (OpenZeppelin, CertiK, Trail of Bits)
  - [ ] Audit report published (all critical issues resolved)
  - [ ] Bounty program launched (ongoing security monitoring)
- [ ] **Testnet Deployment Complete**
  - [ ] Contracts deployed to Polygon Mumbai (or Ethereum Goerli)
  - [ ] Frontend wallet integration working (MetaMask)
  - [ ] DAO voting functional (create proposal, vote, execute)
  - [ ] Token distribution working (airdrops, rewards)
- [ ] **Mainnet Deployment Ready** (but NOT deployed until legal approval)
  - [ ] Contracts deployed to Polygon (or Ethereum)
  - [ ] Multi-sig wallet created for DAO treasury
  - [ ] Donation page live (crypto + fiat)
  - [ ] Legal compliance verified (token classification confirmed)
- [ ] **Documentation Complete**
  - [ ] Tokenomics whitepaper published
  - [ ] Smart contract documentation (code comments, README)
  - [ ] User guides (how to earn tokens, stake, vote)
  - [ ] Developer guides (integrate wallet, read blockchain data)

---

## 📋 Progress Tracking

| Date | Role | Change Made | Status |
|------|------|-------------|--------|
| 2025-10-26 | System Analyst | Created PRP with comprehensive DoR checklist | Planned |
| 2025-10-27 | System Analyst | Added key goals for anonymous currency strategy, yellowpaper scope, and NFT pilot dependencies | Planned |
| 2025-10-27 | Developer Research | Compiled privacy L2 comparison, emission modeling approach, and NFT pilot considerations | Planned |
| _TBD_ | CEO | Answer prerequisite questions | Pending |
| _TBD_ | Legal Team | Determine token classification | Blocked by PRP 1 |
| _TBD_ | Developer | Research blockchain platforms | Pending |

---

## 📝 Notes

**This PRP is BLOCKED by Legal Framework PRP.**

Cannot start blockchain work until:
- Organization jurisdiction finalized (affects token classification)
- Legal structure established (DAO vs C-corp)
- Securities law compliance determined (utility vs security token)

**Recommended Blockchain Platform**: **Polygon**
- Low gas fees ($0.01 per transaction)
- Ethereum-compatible (ERC-20 tokens)
- Strong gaming ecosystem (The Sandbox, Decentraland)
- Good developer tools (Hardhat, Ethers.js)

**Estimated Costs**:
- Smart contract development: $10,000 - $30,000
- Security audit: $5,000 - $50,000
- Legal opinion: $5,000 - $15,000
- Infrastructure (APIs, nodes): $100 - $500/month
- **Total MVP budget**: $20,000 - $95,000

**Timeline**:
- Tokenomics design: 2 weeks
- Smart contract development: 4 weeks
- Security audit: 2-4 weeks
- Testnet deployment: 2 weeks
- **Total**: 10-14 weeks (2.5-3.5 months)

---

**Status**: 📋 Planned - BLOCKED by Legal Framework PRP
**Next Steps**: Complete Legal Framework PRP first, then return to this PRP
