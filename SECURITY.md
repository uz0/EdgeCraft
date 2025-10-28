# Security Policy

Edge Craft is an open-source real-time strategy engine. We take security seriously for all contributors and downstream projects.

## Supported Versions

We follow a rolling release model with security fixes applied to the `main` branch only.

| Version | Supported          |
| ------- | ------------------ |
| main    | :white_check_mark: |
| < main  | :x:                |

If you are running a fork or older commit, please cherry-pick the necessary patches once fixes land on `main`.

## Reporting a Vulnerability

1. **Do not create a public issue.** Instead:
   - Open a [private security advisory](https://github.com/dcversus/edgecraft/security/advisories/new), or
   - Email `security@edgecraft.dev` (plaintext or encrypted with our PGP key below)

2. Include:
   - A detailed description of the vulnerability
   - Steps to reproduce with assets or scripts (attach via encrypted archive if needed)
   - The commit hash or release you tested
   - Expected vs. actual behaviour
   - Potential impact and suggested severity (CVSS if available)

3. **Response SLA:**
   - Acknowledgment: Within 3 business days
   - Status updates: At least weekly until resolution
   - Critical vulnerabilities: Fix within 7 days
   - High severity: Fix within 30 days
   - Medium/Low severity: Fix within 90 days

### PGP Public Key

For encrypted vulnerability reports:

```
-----BEGIN PGP PUBLIC KEY BLOCK-----
(PGP key to be added)
-----END PGP PUBLIC KEY BLOCK-----
```

## Disclosure Process

- We aim to release fixes within 30 days of confirmation.
- Coordinated disclosure timelines can be arranged if downstream projects need additional time.
- When fixes are published, we will update this repository with a security advisory summarizing impact, remediation steps, and affected components.

Thank you for keeping Edge Craft secure.
