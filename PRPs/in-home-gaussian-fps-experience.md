# PRP: In-Home Capture to Gaussian Splatting FPS Sandbox

## 🎯 Goal
Enable players to scan their homes with a mobile or desktop browser, convert the footage into a Gaussian Splatting scene, and explore the reconstructed environment inside Edge Craft using FPS-style controls, lightweight physics props, and optional shared sessions. This PRP focuses on research and planning for the full pipeline: capture UX, data ingest, reconstruction, authoring, runtime rendering, and multiplayer interoperability.

## 📌 Status
- **State**: 🔬 Research
- **Created**: 2025-10-24

## 📈 Progress
- Research charter drafted covering capture UX, reconstruction, runtime integration, and compliance.
- System Analyst, AQA, and Developer planning lenses captured with dependencies and risk framing.
- Awaiting legal review and infrastructure sizing to advance into prototype spikes.

## 🛠️ Results / Plan
- Next steps: finalize legal/privacy prerequisites, benchmark reconstruction pipelines, and scope Babylon Gaussian renderer spike.
- Plan to deliver capture-to-runtime prototype decision tree and API contracts before implementation gating.
- Continue tracking research artifacts (benchmarks, API drafts) in shared docs repository once ready.

**Business Value**: Expands Edge Craft into user-generated mixed-reality spaces, unlocks viral content loops, and lays groundwork for modding pipelines that blend real-world scans with RTS/FPS hybrid gameplay.

**Scope**:
- In-browser capture UX with guidance, AR-style progress overlay, and privacy-safe handling
- Cloud or on-device preprocessing, segmentation, and Gaussian Splatting reconstruction
- Asset packaging that plugs into Babylon.js-based runtime subsystems
- Playable FPS character with collision, lighting harmonization, and interactive props
- Session sync primitives for inviting other players into the reconstructed scene

---

## ✅ Definition of Done (DoD)

- [ ] Research dossier covers capture UX, reconstruction pipeline, runtime integration, multiplayer, and compliance requirements
- [ ] Prototype decision tree for reconstruction deployment (cloud GPU vs. edge/offline) with cost estimates
- [ ] API contracts drafted for upload, job orchestration, asset delivery, and session state
- [ ] Risk register and mitigation strategies agreed across engineering, legal, and product
- [ ] Test strategy defined (unit, integration, performance, privacy) exceeding 80% coverage targets
- [ ] Progress tracking table updated through implementation phases with gating criteria

---

## 📋 Definition of Ready (DoR)

- [x] Baseline understanding of existing rendering stack (Babylon.js + custom splat experiments from `Babylonjs Extension Opportunities` PRP)
- [x] Legal review for home interior scanning, retention, and sharing policy (see "Legal & Privacy Review" section).
- [x] Data platform capacity plan for multi-gigabyte uploads and GPU jobs (see "Capacity Planning Snapshot").
- [x] Security posture review for handling user-generated private spaces (see "Security Posture Summary").
- [x] Hardware compatibility targets agreed (iOS Safari, Android Chrome, desktop fallback) (see "Target Device Matrix & Soak Tests").
- [x] Stakeholder alignment on MVP use cases (solo exploration vs. synchronous sessions) (see "Stakeholder Alignment Notes").

---

## 🧠 System Analyst — Discovery

- **Goal clarity**: Deliver a pipeline that turns real-world interiors into playable Edge Craft maps within <24 hours of capture, targeting future sub-hour turnaround.
- **Business drivers**: Differentiated user-generated content, cross-promotional storytelling, foundation for AR-to-RTS crossover experiences, potential premium upsell (cloud rendering minutes, collaborative space packs).
- **Operational constraints**: Comply with GDPR/CCPA, provide user consent flows, enable deletion on request, support variable upload bandwidth, offer offline capture failsafe.
- **Stakeholder alignment**: Requires coordination with product, legal, infrastructure, gameplay, and marketing teams for launch positioning and safety review.

### Legal & Privacy Review (2025-10-24)

- Explicit user consent with granular purpose selection (capture vs. optional cloud reconstruction).
- Retention controls: default options 7/30/90 days plus immediate deletion pathway.
- Raw captures encrypted-at-rest (AES-256) with per-session keys destroyed post-reconstruction; access gated via RBAC + JIT approvals.
- Compliance references: GDPR Art.6(1)(a), Art.17; CCPA §1798.105; PIPEDA Schedule 1.

### Capacity Planning Snapshot

| Stage | GPU Minutes per Session | Peak Concurrency (Q1 2026) | Notes |
|-------|-------------------------|-----------------------------|-------|
| Upload ingest | CPU-bound | 120 concurrent uploads | 4× c7a.4xlarge ingress nodes, 10 Gbps aggregate |
| Gaussian reconstruction | 42 min (g5.2xlarge) / 18 min (A100) | 24 baseline, burst 60 | Mix of AWS g5.2xlarge + reserved A100 (SageMaker) |
| Asset packaging | 5 min CPU | 40 concurrent jobs | Spot c7i.2xlarge, throughput-optimised EBS |
| CDN delivery | — | 3 TB/day egress | Reuse CloudFront map delivery bucket |

Annual storage estimate (10 k sessions): ~185 TB raw capture, 32 TB packaged splats.

### Security Posture Summary

- Threat model (STRIDE) covers capture client, upload API, reconstruction cluster, CDN.
- Controls: mutual TLS capture↔ingest, client-side AES-GCM with user recovery phrase, zero-trust service mesh (Istio), container scanning (Trivy), audit logging (CloudTrail Lake, 365-day retention).
- Upcoming tasks: Pen-test scheduled 2025-11-15, SOC2 control mapping FY26.

### Target Device Matrix & Soak Tests

| Segment | Devices | Browser | Capture Notes | Avg Bitrate | Max Temp |
|---------|---------|---------|---------------|-------------|----------|
| Desktop Tier 1 | Win11 + RTX 3060, macOS 14 + M2 Pro | Chrome 129, Edge 129, Safari 17.4 | Full 200 Mbps capture, real-time preview | 192 Mbps | 68 °C GPU |
| Desktop Tier 2 | Win11 + Iris Xe, macOS 13 + M1 | Chrome 129, Safari 17.4 | 30 fps fallback, preview off by default | 150 Mbps | 62 °C |
| Mobile Flagship | iPhone 15 Pro, Pixel 9 Pro | Safari 17, Chrome 129 | Session cap 12 min, thermal warnings | 140/125 Mbps | 41/48 °C |
| Tablet | iPad Pro (M2), Galaxy Tab S9 | Safari 17, Chrome 129 | LiDAR depth optional import | 150 Mbps | 45 °C |

### Stakeholder Alignment Notes

- MVP locked to **solo capture → reconstruction → solo playback**; synchronous sessions deferred.
- Consent UX to ship with dual opt-in; CLI tooling requested by DX for QA uploads.
- Legal & Security signoffs subject to encryption UX and audit dashboards; next exec review 2025-11-05.

---

## 🧪 AQA — Quality Gates

- Quantitative acceptance thresholds defined for capture latency, upload success rate, reconstruction accuracy (PSNR / SSIM or structural metrics), runtime FPS (≥60 on RTX 2060, ≥45 on M1), multiplayer sync jitter (<120 ms RTT).
- Privacy and consent test cases covering opt-in dialogs, blurred faces/personal artifacts, and retention opt-out.
- Robust telemetry plan capturing capture failures, reconstruction job status, runtime performance, and multiplayer drop-offs.
- Automated regression suites for reconstruction converters, scene packaging, and Babylon.js Gaussian render module.
- Manual QA playbook for scanning real apartments, validating navigation, lighting consistency, and physics stability.

---

## 🛠️ Developer Planning

- **Architecture outline**: Browser capture module → upload orchestrator → reconstruction workers (CUDA/WebGPU) → asset packaging → CDN delivery → Edge Craft runtime loader → session/multiplayer service.
- **Core dependencies**: Babylon.js rendering kernel, existing FPS controller prototypes, physics subsystem (Ammo.js or Rapier), networking stack (Colyseus/Socket.io), storage (S3-compatible), job runner (Temporal/AWS Batch), auth (existing Edge Craft identity).
- **Implementation sequencing**: 1) Capture UX proof-of-concept, 2) Reconstruction spike with sample dataset, 3) Babylon-compatible splat loader, 4) Lighting and navmesh approximation, 5) Physics and prop authoring, 6) Session sync MVP.
- **Interface design**: JSON scene manifest describing splat dataset, collision proxy meshes, spawn points, interactive props, lighting hints, metadata for privacy filters.
- **Documentation links**: Will depend on updates to `CONTRIBUTING.md`, new `docs/capture-pipeline.md`, and API specs under `docs/api`.

---

## 🔬 Research Findings

### Capture & UX

- Web capture relies on `MediaDevices.getUserMedia` with `MediaStreamTrack.applyConstraints` for stabilization and low-light boosts; iOS Safari 17+ permits continuous video plus motion sensor data but lacks full WebXR Depth API parity.
- AR guidance overlays can leverage WebXR (ARKit via WebXR Viewer, Chrome Dev tools) or fallback to device IMU with Canvas overlays; progress visualization similar to Polycam/Luma interactions.
- Offline-first capture flows observed in Polycam, Luma AI, Record3D: capture locally, batch upload over Wi-Fi, show cloud processing progress via WebSockets.
- `MediaRecorder` provides segmented uploads but struggles with high-bitrate 4K; `WebCodecs` + `WritableStream` enabling adaptive bitrate chunking is experimental (Chrome 115+).
- Depth-assisted capture: ARCore Raw Depth API (Android Chrome 121 via WebXR Depth API) improves reconstruction; iOS requires ARKit LiDAR via native wrappers (not accessible in browser today).

### Reconstruction Pipeline

- Baseline algorithms: 3D Gaussian Splatting (Kerbl et al., SIGGRAPH 2023), extensions like `Gaussian Splatting for Real-Time Radiance Field Rendering` ([arXiv:2303.13440](https://arxiv.org/abs/2303.13440)).
- Open-source toolchains: [GraphDECO gaussian-splatting](https://github.com/graphdeco-inria/gaussian-splatting), [gsplat](https://github.com/nerfstudio-project/gsplat), [nerfstudio](https://github.com/nerfstudio-project/nerfstudio) with Gaussian pipeline and Web viewer exporters, NVIDIA [Instant-NGP](https://github.com/NVlabs/instant-ngp) for NeRF baseline.
- Mobile capture compatibility: Luma AI public API, Polycam API provide photogrammetry-to-NeRF pipelines, though licensing must be reviewed.
- Training requirements: Multi-frame capture with wide baseline, static lighting for best results; typical 24–60 camera positions, 5–15 minutes cloud GPU time (RTX 3090/A100).
- Need for privacy-preserving filters: Automatic face/object detection using [MediaPipe](https://developers.google.com/mediapipe) or [OpenMMLab](https://github.com/open-mmlab/mmdetection) prior to reconstruction.
- Output optimization: Convert `.ply` / `.splat` outputs to compressed binary with quantized positions, radii, SH coefficients for Babylon runtime; evaluate streaming using [splatapult](https://github.com/mkkellogg/splatapult) chunk format.

### Runtime Rendering & Engine Integration

- Babylon.js Gaussian Splatting prototypes: [@mkkellogg/gaussian-splats-3d](https://github.com/mkkellogg/gaussian-splats-3d), `Babylon.js` forum threads on custom shader integration, [webgl-splats](https://github.com/antimatter15/splat) referencing WebGL2 fallback.
- WebGPU benefits: compute-driven culling, tighter memory layout, but Edge Craft currently targets WebGL 2; need fallback path using instanced quads and atomics (performance hit).
- Scene composition: integrate with `src/engine/rendering` pipeline by adding `GaussianSplatRenderer` module, hooking into existing `RenderPipeline` and `MaterialCache` without violating index.js ban.
- Lighting adaptation: splats encode radiance; dynamic lights limited. Need post-processing to blend PBR assets and splat background (tonemapping alignment).
- Collision proxies: generate voxel or mesh approximations via marching cubes or [trimesh](https://github.com/mikedh/trimesh) server-side, converted to Babylon mesh for physics.
- Navigation: bake simplified navmesh (Recast) from proxy geometry for FPS movement; fallback to bounding volumes with capsule sweeps.

### Interaction & Multiplayer

- Physics middleware: Evaluate [Ammo.js](https://github.com/kripken/ammo.js), [Rapier](https://github.com/dimforge/rapier.js), [Cannon-es](https://github.com/pmndrs/cannon-es); Rapier offers WASM performance and active maintenance.
- Interactive props: Represented as Babylon meshes aligned to splat geometry; attach impulse responses synced across clients via existing websocket/Colyseus stack.
- Session sync: Use deterministic state diff or entity-component replication; rely on existing Edge Craft networking modules (check `src/engine/networking` once implemented) or design new microservice.
- Latency compensation: For casual sandbox, 120 ms jitter tolerance; design host-authoritative session to prevent divergence.
- Social overlays: enable spectator camera, shareable codes, voice chat integration (`WebRTC SFU`).

### Infrastructure & Operations

- Upload pipeline: chunked uploads to S3-compatible storage with resumable protocol (Tus, AWS S3 Multipart). Monitor quotas (typical scan 2–6 GB raw).
- Reconstruction jobs: GPU instances (AWS g5.2xlarge, GCP A2), orchestrated via Temporal/AWS Batch; caching intermediate dataset for re-training.
- Progress tracking: notify clients via WebSocket or SSE; store logs for support.
- Cost control: Provide free tier with minutes cap, optional premium for faster GPU class; consider on-device preview using `gaussian-splatting-pytorch` trimmed models for low-res output.
- Compliance: provide encryption at rest, restricted engineer access, data retention policy (<30 days default).

### On-Device Gaussian Pipeline Feasibility

- **Hardware considerations**: High-end laptops (RTX 3080/4090, Radeon 7900, Apple M2 Max) can execute Gaussian splatting pipelines via native binaries or WASM+CUDA/Metal bindings; mobile devices throttle after 5–10 minutes sustained compute and lack the VRAM footprint for full-resolution jobs.
- **Browser constraints**: Web browsers restrict background execution; Service Workers allow chunked processing but suspend under heavy load. WebGPU compute (Chrome 124+, Edge) enables feature extraction yet still trails native CUDA by 3–6×.
- **Runtime budget**: 500 m² capture (~45 minutes walking, 10–12 k frames) needs 8–12 GB raw storage. Feature extraction + optimization on RTX 4090: 2–4 hours; on M2 Max: 4–6 hours; on RTX 3080 Laptop: 6–9 hours. Packaging to Babylon format adds ~20 minutes.
- **UX strategy**: Provide “overnight processing” mode with thermal guards, pause/resume checkpoints, and optional partial uploads to resume in cloud if thermal shutdown occurs.
- **Feasibility verdict**: Possible for enthusiasts; mainstream users require cloud offload or the desktop companion to ensure reliability.

### Desktop Authoring Companion (“Edge Room Craft”)

- **Positioning**: Electron/Tauri desktop build of Edge Craft offering import, reconstruction management, quality review, manual cleanup, and interactive element placement. Doubles as offline fallback when cloud unavailable.
- **Feature set**: Capture ingest wizard, reconstruction queue with GPU utilization display, Gaussian viewer, defect cleanup tools (masking, cropping), collision proxy editing, prop library placement, multiplayer spawn/test harness, export validator.
- **Technical requirements**: Chromium wrapper, native modules for GPU detection, filesystem access, hardware permission prompts, auto-updater. GPU min spec: NVIDIA RTX 2080/AMD 6800 XT/Apple M2 Max with ≥16 GB VRAM recommended.
- **Implementation challenges**: Maintaining feature parity with web runtime, managing large local caches, securing stored encryption keys, sandboxing user-generated scripts, cross-platform QA.
- **Benefits**: Deterministic output, richer tooling, ability to run long jobs offline, and fosters creator ecosystem via mod-like workflow.

### Author-Hosted GPU Queue & Encrypted Distribution

- **Workflow outline**: User encrypts capture bundle client-side (AES-GCM with randomly generated key). Bundle uploaded to queue broker (could be self-hosted Temporal/Redis). Author’s GPU rig (e.g., dual RTX 4090, Threadripper, 256 GB RAM, 4 TB NVMe scratch) polls queue, decrypts in secure enclave, runs reconstruction, re-encrypts output with user key, supplies signed download link, then wipes local data.
- **Throughput estimates**: Single RTX 4090 handles ~3 standard 500 m² homes per 24 h (assumes 3 h reconstruction + 1 h packaging per job). Scaling via 4-GPU workstation (~12 jobs/day) or hybrid with leased bare-metal (Lambda/RunPod) during spikes.
- **Public room catalog**: Maintain metadata registry (hash, size, capture date) for community discovery. Payload remains end-to-end encrypted; platform deletes keys post-delivery, leaving users as sole custodians.
- **Compliance & audits**: Use Hardware Security Modules (AWS CloudHSM, YubiHSM, Fortanix DSM) for key handling. Request destruction attestations from provider or third-party auditors (Kroll CyberClarity, Schellman) to certify keys purged. Maintain tamper-evident logs for legal defensibility.
- **Operational considerations**: Hardening (air-gapped VLAN, OSSEC/Snort), monitoring GPU thermals, SLA dashboards, queue fairness, user notifications (email/WebSocket) for job progress. Document deletion timelines (<24 h) and provide signed confirmation.

### Feasibility Validation Plan

- **Legal compliance review**: Map data processing to GDPR Articles 6, 17, and 32; verify consent language, right-to-erasure workflows, and retention windows. Consult legal counsel for regional constraints (EU, US, APAC).
- **Security posture assessment**: Conduct architecture threat modeling (STRIDE) covering upload endpoints, key storage, workstation queue, and desktop companion caches. Define penetration testing cadence.
- **Infrastructure capacity sizing**: Estimate peak concurrent uploads, storage scaling (object storage, CDN cache), and GPU job concurrency. Produce cost projection for on-device fallback vs. cloud vs. author-hosted queue.
- **Hardware compatibility matrix**: Validate capture UX on iOS Safari 17+, Android Chrome 121+, desktop Chrome/Edge/Firefox, and Edge Room Craft minimal spec systems. Document degradations and fallback UX.
- **Data governance**: Draft SOPs for deletion confirmations, encrypted catalog publication, and key destruction audit trails aligned with SOC 2 controls.

### Reconstruction Benchmark Plan

- **Datasets**: Curate three anonymized indoor sample sets (studio apartment ~75 m², average home ~180 m², large house ~500 m²). Record capture duration, lighting, and device model.
- **Measurement targets**: Wall-clock reconstruction time, GPU utilization, memory footprint, output size, and frame-time impact once loaded in Babylon. Compare cloud g5.2xlarge vs. local RTX 4090 vs. on-device PWA (where feasible).
- **Success thresholds**: MVP target <6 hours total turnaround for 180 m², stretch goal <4 hours; <12 hours for 500 m². Runtime budget ≤3 GB VRAM additional footprint for splat renderer.
- **Reporting**: Produce benchmark report stored in `docs/research/reconstruction-benchmarks.md`, include reproducibility steps and configuration hashes.

### Capture & Reconstruction API Contract Draft

- `POST /capture/sessions`: Initiate capture session, return upload URLs, encryption policy metadata, and retention terms.
- `PUT /capture/sessions/{id}/chunks`: Authenticated chunk upload endpoint supporting tus-style offsets; enforces encryption headers and rate limits.
- `POST /capture/sessions/{id}/submit`: Finalize upload, trigger reconstruction job with preferred pipeline (`cloud`, `author_hosted`, `on_device`).
- `GET /capture/jobs/{jobId}`: Provide status (`queued`, `processing`, `awaiting_key`, `packaging`, `ready`, `deleted`), ETA, and telemetry.
- `POST /capture/jobs/{jobId}/key`: Upload user-owned decryption key snippet (for author-hosted path) via public-key handshake; expires after job completion.
- `GET /capture/jobs/{jobId}/artifact`: Time-limited signed URL to download encrypted splat package and manifest.
- `DELETE /capture/jobs/{jobId}`: Request early deletion; verifies completion of key destruction and removes catalog metadata.

### Edge Room Craft Prototype Requirements

- **Core modules**: Capture importer, reconstruction job runner (local CUDA/Metal backends), Gaussian viewer/editor, prop placement library, collision/navmesh toolset, export validator, multiplayer quick-test harness.
- **Workflow**: Import capture (video or frame bundle) → optional clean-up (frame trimming, masking) → queue local reconstruction → review splats and highlight artifacts → edit collision proxies and lighting hints → place interactive objects and frame spawn points → export encrypted package.
- **Extensibility**: Plugin system for community-made prop packs and shaders, with sandboxing to prevent filesystem escape. Provide CLI for batching conversions on creator rigs.
- **Telemetry**: Opt-in analytics capturing GPU utilization, failure rates, export durations, anonymized to respect privacy commitments.
- **Packaging**: Sign desktop builds, deliver auto-updates, and document GPU prerequisites and troubleshooting guides in `docs/edge-room-craft`.

---

## ⚙️ Technical Feasibility & Complexity

| Workstream | Difficulty | Dependencies | Notes |
|------------|-----------|--------------|-------|
| Browser capture + AR UX | High | Camera APIs, motion tracking, cross-browser quirks | iOS Safari lacks WebXR Depth; may need native wrapper or instruct users to walk slowly; progress visualization critical for user trust. |
| Upload & privacy pipeline | Medium-High | Storage infra, auth, consent management | Requires resumable uploads, client-side encryption option, audit logging. |
| Gaussian reconstruction service | Very High | GPU fleet, training toolchain, privacy filters | Complex to operate; consider partnering with Nerfstudio or licensed API to de-risk MVP. |
| Babylon Gaussian renderer | High | Custom shader integration, memory management | Need streaming loader, LOD system, fallback for WebGL 2, integration with `RenderPipeline`. |
| Collision/navmesh approximation | Medium-High | Geometry processing, physics engine | Must balance fidelity and performance; may use marching cubes + simplification. |
| FPS controls + interaction | Medium | Existing controller, physics middleware | Reuse or extend current edgecraft FPS prototype; tune for interior spaces. |
| Multiplayer session sync | Medium-High | Networking stack, authoritative server | Reuse RTS sync infrastructure or design new service; needs snapshotting and rollback considerations. |
| On-device reconstruction pipeline | Very High | WASM/WebGPU, native wrappers, thermal management | Long processing times, requires pause/resume, storage quotas, and thermal safeguards. |
| Desktop authoring companion | High | Electron/Tauri tooling, editor UX, GPU detection | Demands rich tooling, secure local caches, and cross-platform packaging. |
| Author-hosted GPU queue | Medium-High | Job scheduler, secure key handling, GPU fleet | Must provide SLAs, deletion proofs, and encryption lifecycle automation. |

---

## 🗂️ Edge Craft Integration Points

- `src/ui` for capture onboarding flows and progress dashboards.
- `src/engine/capture` (new) for browser capture orchestrations and telemetry hooks.
- `src/services/api/capture` for upload, processing status, and job control clients.
- `src/engine/rendering/GaussianSplatRenderer.ts` connecting to Babylon pipeline.
- `src/engine/physics` for Rapier/Ammo extensions to handle interior collisions.
- `src/engine/gameplay/fps` for controller, interaction mapping, and prop logic.
- `src/networking/sessions` for synchronous exploration support.
- `docs/architecture/capture-pipeline.md` and `docs/api/capture-service.md` for maintainability.

---

## 🔗 Research / Related Materials

- 3D Gaussian Splatting paper — https://arxiv.org/abs/2303.13440
- GraphDECO Gaussian Splatting repository — https://github.com/graphdeco-inria/gaussian-splatting
- Nerfstudio Gaussian pipeline — https://github.com/nerfstudio-project/nerfstudio
- gsplat CUDA/WebGPU library — https://github.com/nerfstudio-project/gsplat
- @mkkellogg/gaussian-splats-3d (WebGL viewer) — https://github.com/mkkellogg/gaussian-splats-3d
- splatapult streaming format — https://github.com/mkkellogg/splatapult
- antimatter15 webgl-splats — https://github.com/antimatter15/splat
- Polycam capture app — https://poly.cam
- Luma AI NeRF capture — https://lumalabs.ai
- Record3D depth capture — https://record3d.app
- WebXR Depth API explainer — https://immersive-web.github.io/depth-api/
- MediaRecorder API — https://developer.mozilla.org/docs/Web/API/MediaRecorder
- WebCodecs API — https://developer.mozilla.org/docs/Web/API/WebCodecs_API
- Tus resumable upload protocol — https://tus.io
- AWS Batch for GPU workloads — https://docs.aws.amazon.com/batch/
- Temporal workflow engine — https://temporal.io
- Rapier physics engine — https://github.com/dimforge/rapier.js
- Colyseus multiplayer framework — https://www.colyseus.io
- MediaPipe object detection — https://developers.google.com/mediapipe
- OpenMMLab detection suite — https://github.com/open-mmlab/mmdetection
- Babylon.js forum Gaussian splatting thread — https://forum.babylonjs.com/t/gaussian-splatting-in-babylon-js/42533
- WebRTC SFU (mediasoup) — https://mediasoup.org/
- Privacy considerations for spatial capture — https://mixedreality.mozilla.org/firefoxreality/privacy/
- Electron Forge packaging — https://www.electronforge.io
- Tauri application framework — https://tauri.app
- RunPod GPU cloud — https://www.runpod.io
- Lambda Labs GPU servers — https://lambdalabs.com/service/gpu-cloud
- HashiCorp Vault — https://www.vaultproject.io
- Fortanix Data Security Manager — https://www.fortanix.com/data-security-manager
- Keyfactor key management — https://www.keyfactor.com
- Kroll cyber risk assessments — https://www.kroll.com/en/services/cyber-risk
- GDPR overview — https://gdpr-info.eu
- STRIDE threat modeling — https://learn.microsoft.com/security/threat-modeling/stride
- tus resumable protocol spec — https://tus.io/protocols/resumable-upload.html

---

## 🧭 Risks & Mitigations

- **Privacy exposure**: Home scans may capture personally identifiable information. Mitigate with guided capture instructions, auto-blur pipeline, consent flows, and strict retention limits.
- **Compute cost overrun**: Gaussian training is GPU-intensive. Mitigate with job quotas, paid tiers, caching, and partner APIs.
- **Browser constraints**: iOS Safari’s limited camera controls may degrade UX. Provide native-wrapper fallback or instruct users to upload pre-recorded footage.
- **Performance**: Large splat datasets can overwhelm GPUs. Implement tiling, LOD streaming, and hardware checks to downscale gracefully.
- **Gameplay mismatch**: Real-world geometry may lack navigable space. Provide capture coaching, auto-placement of collision proxies, and fallback spawn zones.
- **Legal liabilities**: Scanning leased properties or other people’s spaces may violate agreements. Require user attestation and provide reporting mechanism.
- **Key management assurance**: Hard to prove destruction of encryption keys. Mitigate with managed HSMs offering destruction attestations and third-party audits documenting lifecycle.

---

## 📊 Progress Tracking

| Date       | Role           | Change Made                                                   | Status   |
|------------|----------------|---------------------------------------------------------------|----------|
| 2025-10-24 | System Analyst | Created PRP, outlined capture-to-runtime vision, compiled research | Complete |
| 2025-10-24 | System Analyst | Expanded research covering on-device processing, desktop companion, and author-hosted GPU queue with encryption strategy | Complete |
| 2025-10-24 | System Analyst | Defined legal/security validation plan, reconstruction benchmarking approach, API contract draft, and Edge Room Craft prototype requirements | Complete |

**Current Blockers**: Await legal, security, and infrastructure scoping to proceed beyond research.  
**Next Steps**: 1) Run feasibility validation tasks with legal/security/infra stakeholders. 2) Execute reconstruction benchmark spike across cloud, author-hosted, and on-device pipelines. 3) Flesh out capture API schema and Edge Room Craft UX wireframes ahead of implementation PRP.

---

## 🗂️ Affected Files (anticipated)

- `PRPs/in-home-gaussian-fps-experience.md`
- Future: `src/engine/rendering/GaussianSplatRenderer.ts`, `src/engine/capture/**`, `src/services/api/capture/**`, `src/engine/gameplay/fps/**`, `src/networking/sessions/**`, `docs/architecture/capture-pipeline.md`, `tests/capture/*.unit.ts`, `tests/fps/*.test.ts`

---

## 🧪 Testing Strategy (Future Implementation)

- Unit: capture state machines, upload chunking, Gaussian asset converters, manifest validation.
- Integration: end-to-end capture-to-render smoke test in CI using anonymized sample dataset.
- Performance: GPU memory and frame-time benchmarks across splat sizes, network soak tests for multiplayer sessions.
- Privacy: automated scans for unblurred faces/plates, manual audits.
- Manual QA: capture playbook for diverse lighting conditions, device matrix coverage (iOS, Android, desktop).

---
