# Contributing to Edge Craft

Edge Craft is a clean-room RTS engine built with TypeScript, React, and Babylon.js. We use a PRP (Product Requirement Proposal) workflow, strict automation, and zero-comment code to keep the project maintainable.

## Quick Start

1. Fork or clone the repository.
2. Install dependencies with `npm install`.
3. Verify the toolchain:
   - `npm run typecheck`
   - `npm run lint`
   - `npm run test`
   - `npm run validate`
4. Start the dev server with `npm run dev`.

## PRP-Centric Workflow

1. Read the active PRP in `PRPs/` and confirm the state before making changes.
2. Track progress by updating the PRP table after each significant change (code, tests, docs). Include the role you are acting as (System Analyst, AQA, Developer).
3. Change PRP status as work moves from 📋 Planned → 🔬 Research → 🟡 In Progress → 🧪 Testing → ✅ Complete.
4. Keep the Definition of Done and Definition of Ready checklists current.

## Coding Standards

- **Zero Comments Policy:** code comments are disallowed unless they document a temporary workaround or a TODO/FIXME that must be resolved before merging. Exception: minimal explanatory comments in configuration files (jest.config.js, vite.config.ts, etc.) where brief context improves maintainability. Prefer moving rationale to documentation.
- Prefer descriptive names over comments (e.g., `loadTerrainManifest`).
- Avoid premature abstractions; duplicate thoughtfully until a pattern is established.
- Files must remain under 500 lines. Split modules when approaching the limit.
- No `index.ts`/`index.js` barrel files. Import using full, explicit paths.
- Public APIs require JSDoc.

## Branches, Commits, and PRs

- Use clear branch names tied to the PRP, e.g., `feature/map-preview-camera`.
- `hotfix-*` and `trivial-*` prefixes are reserved for explicit maintainer requests.
- Reference the relevant PRP and affected files in your commit messages.
- Before opening a PR, fill in `.github/pull_request_template.md` completely and link the PRP section where progress is tracked.

## Testing & Automation

- Run the full validation suite locally before pushing:  
  `npm run typecheck && npm run lint && npm run test && npm run validate`
- Author unit tests alongside any business logic change. Place them next to the implementation files with the `*.unit.ts` or `*.unit.tsx` suffix.
- Use Playwright (`tests/*.test.ts`) for end-to-end coverage of UI and workflow scenarios.
- GitHub Actions will rerun these commands. Fix any failures locally before re-running CI.
- New tests must keep overall unit coverage at or above 80%.

## Issues and Templates

- Choose from the issue templates under `.github/ISSUE_TEMPLATE/`:
  - 🐛 Bug Report
  - 🌟 Feature Proposal
  - 📚 Documentation Update
  - 🧱 Technical Task
- Provide minimal reproductions for engine or tooling bugs, including map files or scripts when possible.
- Feature proposals must outline success metrics and align with a PRP. New PRPs should follow the existing format in `PRPs/`.
- Stale closed issues are automatically locked after seven days of inactivity; open a new issue if the problem resurfaces.

## Security

Report vulnerabilities privately via [GitHub Security Advisories](https://github.com/dcversus/edgecraft/security/advisories/new) or email `security@edgecraft.dev`. See `SECURITY.md` for details.

## Communication

- `README.md` covers project structure and scripts.
- `CLAUDE.md` (and the `AGENTS.md`/`agents.md` symlinks) define AI collaborator expectations—review them before using automation or AI assistance.
- Use the Progress Tracking section of the relevant PRP instead of ad-hoc status updates.

Thanks for contributing to Edge Craft!
