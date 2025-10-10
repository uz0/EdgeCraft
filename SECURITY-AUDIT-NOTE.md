# Security Audit Configuration

## Current Status

The CI/CD pipeline is configured to fail only on **HIGH** and **CRITICAL** severity vulnerabilities.

## Known Moderate Vulnerabilities

### nanoid <3.3.8 (Moderate Severity)

**Issue**: Predictable results in nanoid generation when given non-integer values
**Advisory**: https://github.com/advisories/GHSA-mwcw-c2x4-8c55
**Affected Package**: nanoid (via @colyseus/core dependency chain)
**Risk Assessment**: Low impact for our use case

**Reason for Acceptance:**
- This vulnerability only affects nanoid when given non-integer values
- Our codebase does not directly use nanoid with custom parameters
- The vulnerability comes from colyseus@0.15.0 dependency
- Upgrading to fix requires breaking changes in colyseus (v0.14.17)
- No high or critical vulnerabilities present

**Mitigation:**
- Monitor for colyseus updates that resolve this dependency
- Track in GitHub issue for future resolution
- CI will still fail on high/critical vulnerabilities

## Audit Level Configuration

```yaml
# .github/workflows/ci.yml
- name: Run Audit
  run: npm audit --audit-level=high
```

This configuration ensures:
- ✅ Build fails on high/critical vulnerabilities
- ✅ Build passes with documented moderate vulnerabilities
- ✅ Security remains a priority without blocking development

## Future Actions

1. Monitor colyseus releases for nanoid update
2. Plan upgrade path when breaking change is acceptable
3. Re-evaluate quarterly for security updates

**Last Updated**: 2025-10-10
**Status**: Accepted Risk (Moderate)
