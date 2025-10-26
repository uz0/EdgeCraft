# Security Policy

Edge Craft is an open-source real-time strategy engine. We take security seriously for all contributors and downstream projects.

## Supported Versions

We currently support security fixes for the active `main` branch. If you are running a fork, please cherry-pick the necessary patches once fixes land on `main`.

## Reporting a Vulnerability

1. **Do not create a public issue.** Instead, open a [private security advisory](https://github.com/dcversus/edgecraft/security/advisories/new) or email `security@edgecraft.dev`.
2. Include:
   - A detailed description of the vulnerability
   - Steps to reproduce with assets or scripts (attach via encrypted archive if needed)
   - The commit hash or release you tested
   - Expected vs. actual behaviour
   - Potential impact and suggested severity (CVSS if available)
3. We will acknowledge receipt within three business days and provide status updates at least weekly until resolution.

## Disclosure Process

- We aim to release fixes within 30 days of confirmation.
- Coordinated disclosure timelines can be arranged if downstream projects need additional time.
- When fixes are published, we will update this repository with a security advisory summarizing impact, remediation steps, and affected components.

Thank you for keeping Edge Craft secure.
