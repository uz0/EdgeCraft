# Security Posture Review (2025-10-24)

- **Threat modelling:** STRIDE session covering capture client, upload API, reconstruction cluster, CDN delivery.
- **Controls committed:**
  - Mutual TLS between capture client and ingest gateway (mTLS cert rotated every 30 days).
  - Client-side AES-GCM encryption with user-provided recovery phrase; keys rehydrated briefly in reconstruction worker memory.
  - Zero-trust service mesh (Istio) enforcing namespace-level network policies.
  - Continuous vulnerability scanning (Trivy) on container images; high severity SLA < 48h.
  - Audit logging piped to CloudTrail Lake with 365-day retention.
- **Outstanding tasks:** Pen-test scheduled 2025-11-15, SOC2 control mapping for FY26.
- **Result:** Security team signed off research phase with gating on encryption UX and audit log dashboards.
