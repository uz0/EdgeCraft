# Capture Pipeline Capacity Snapshot

| Stage | Estimated GPU Minutes per Session | Peak Concurrency (Q1 2026) | Infra Notes |
|-------|------------------------------------|-----------------------------|-------------|
| Upload ingest | 0 (CPU-bound) | 120 concurrent uploads | 4 × c7a.4xlarge ingress nodes behind CloudFront, 10 Gbps aggregate |
| Gaussian reconstruction | 42 min (g5.2xlarge) / 18 min (A100) | 24 jobs (baseline), burst 60 | Mix of AWS g5.2xlarge + reserved A100 (SageMaker) for VIP queues |
| Asset packaging | 5 min (CPU) | 40 concurrent jobs | Spot c7i.2xlarge with EBS throughput optimized |
| CDN distribution | — | 3 TB/day egress budget | Leverage existing CloudFront RTMP bucket |

**Storage forecast:**
- Raw capture per 180 m² session ≈ 18.5 GB (HEVC @ 200 Mbps).
- Retention tiering: hot S3 (30 days), Glacier Instant Retrieval thereafter.
- Annual storage allocation (10k sessions): ≈ 185 TB raw, 32 TB packaged splats.

**Next steps:** Integrate metrics into Grafana dashboard, add auto-scaling rules for reconstruction workers at 70% queue depth threshold.
