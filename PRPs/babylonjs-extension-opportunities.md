# PRP: BabylonJS Extension Opportunities for EdgeCraft

## 🎯 Goal
- Identify and prioritize Babylon.js extension opportunities that unlock RTS differentiators, satisfy community demand, and create monetizable tooling for Edge Craft.
- Provide phased roadmap, effort estimates, and risk analysis to guide future implementation PRPs.

## 📌 Status
- **State**: 🔬 Research
- **Created**: 2025-10-24

## 📈 Progress
- Audited current Edge Craft rendering stack and Babylon community requests to build baseline capability matrix.
- Evaluated cutting-edge techniques (WebGPU, Gaussian splatting, frame graphs) and RTS-specific requirements.
- Produced phased roadmap (Differentiators, Cutting-Edge, Ecosystem Tools) with effort estimates and monetization strategy.

## 🛠️ Results / Plan
- Phase 1 recommendation: prioritize GPU-driven instancing toolkit and Fog of War + Minimap suite for immediate RTS advantage.
- Pending stakeholder decision on resource allocation and packaging strategy (open source vs. commercial).
- Next actions include validating concepts with Babylon community and scoping prototypes for top-ranked extensions.

## ✅ Definition of Done
- [ ] Roadmap endorsed by engineering, product, and business stakeholders with Phase 1 scope approved.
- [ ] Effort, staffing, and sequencing plan documented for each prioritized extension.
- [ ] Risk mitigation strategies accepted, including WebGL fallback expectations and maintenance plan.
- [ ] Monetization and community release strategy validated (licensing, tiering, support commitments).
- [ ] Success metrics established for adoption, performance, and revenue tracking.

## 📋 Definition of Ready
- [x] Inventory of existing Edge Craft rendering capabilities captured.
- [x] Babylon community demand researched across issues, forums, and feature requests.
- [x] Competitive analysis of RTS requirements compiled.
- [ ] Stakeholder sponsors identified for technical and business review.
- [ ] Budget and resourcing constraints clarified for proposed phases.

---

## 📚 Research Summary

### What EdgeCraft Already Has
- **CustomShaderSystem**: Water, force field, hologram, dissolve shaders with hot reload support
- **CascadedShadowSystem**: Professional CSM implementation
- **PostProcessingPipeline**: FXAA, bloom, tone mapping, color grading
- **GPUParticleSystem**: GPU-accelerated particle effects
- **Terrain rendering**: Multi-texture splatting with heightmaps
- **MaterialCache & DrawCallOptimizer**: 70% material reduction, 80% draw call reduction

### BabylonJS Community Wants (from GitHub issues)
1. **Frame Graph Implementation** - Most requested feature for flexible rendering orchestration
2. **Node Particle Editor (NPE)** - Visual particle system editor
3. **Gaussian Splatting Updates** - Improved support for 3D Gaussian splatting
4. **Area Lights Updates** - Physically-based area light rendering
5. **KTX2 Basis Universal Texture Compression** - Modern texture compression support
6. **Inspector v2 Improvements** - Better debugging/development tools
7. **Audio Engine Updates** - Enhanced audio capabilities
8. **XR Pointer Selection Control** - Finer-grained XR interaction control

### Cutting-Edge Techniques (2024-2025)
- **Gaussian Splatting**: Real-time photorealistic rendering from point clouds (Three.js has implementation via @mkkellogg/gaussian-splats-3d)
- **WebGPU Compute Shaders**: GPU-driven rendering, physics simulation, indirect drawing
- **Neural Rendering**: AI-assisted rendering techniques
- **Virtual Texturing**: Mega-textures for large worlds
- **Sparse Voxel Octrees**: Efficient large-scale geometry representation

### RTS-Specific Needs
- **Massive unit batching**: GPU instancing for thousands of units
- **Fog of War rendering**: Real-time visibility computation on GPU
- **Minimap generation**: Efficient scene overview rendering
- **Selection highlighting**: Per-instance selection effects
- **Heightmap terrain optimizations**: LOD, streaming, culling
- **Pathfinding visualization**: Debug overlays for AI systems

---

## Top 7 Recommended Extensions

### Phase 1: RTS Differentiators (Immediate Competitive Advantage)

#### 1. GPU-Driven Instancing, LOD, and Culling Toolkit
**What it is**: WebGPU-first system for frustum + occlusion culling, per-instance LOD, and indirect drawing entirely on GPU. Supports static meshes and skinned units via animation textures or compute skinning.

**Why it matters**: 
- Eliminates CPU bottleneck for massive RTS armies (10k+ units)
- Dramatically reduces draw calls through GPU-driven indirect rendering
- Core competitive advantage for large-scale battles

**Technical Details**:
- WebGPU compute shaders for culling/LOD selection
- Indirect drawing (drawIndirect/drawIndexedIndirect)
- Animation texture baking for skinned crowds
- Zero-allocation instance updates
- JSON-based LOD rules configuration
- Graceful WebGL fallback (instancing + CPU frustum, no occlusion)

**Technical Feasibility**: Hard (WebGPU compute + indirect draws + Babylon integration)

**Business Value**: High
- Core RTS advantage
- Broad appeal to any large-scene project
- Reusable/sellable to other BabylonJS developers

**Time Estimate**: 4-6 weeks for MVP (WebGPU), +2 weeks for WebGL fallback

**Differentiation**:
- Tight Babylon Scene/Mesh integration
- Feature flags for progressive enhancement
- Simple API: `instanceManager.addUnit(mesh, position, lod)`
- Built-in animation texture support

**Exists Elsewhere**: Three.js has examples/papers; Babylon lacks production-ready GPU-driven kit

---

#### 2. Fog of War + Minimap GPU Suite
**What it is**: Compute-driven visibility system with current/explored textures updated from unit positions and vision cones. Includes minimap renderer, material dimming, and height-aware line-of-sight.

**Why it matters**:
- Signature RTS feature (fog of war is essential)
- GPU computation scales to thousands of units
- Reusable for stealth/survival games
- Professional minimap generation

**Technical Details**:
- Compute shaders for visibility texture updates
- Vision cone/circle rendering to GPU texture
- Height-aware LOS using terrain heightmap sampling
- Soft edges and gradient falloff
- "Explored" vs "visible" distinction
- Material hooks to dim objects outside FOW
- Minimap camera with visibility overlay
- Decal system for "revealed" areas

**Technical Feasibility**: Medium (compute + material hooks + minimap camera)

**Business Value**: High
- Signature RTS feature
- Differentiates from competitors
- Sellable as general "visibility system"

**Time Estimate**: 1.5-3 weeks

**Differentiation**:
- Plug-and-play API: `fogOfWar.addVisionSource(unit, radius)`
- Integration with CascadedShadowSystem (disable shadows in FOW)
- Integration with terrain materials
- Built-in minimap renderer

**Exists Elsewhere**: Typically game-specific snippets, not a Babylon plugin

---

### Phase 2: Cutting-Edge + Community Demand

#### 3. Gaussian Splatting Renderer for BabylonJS
**What it is**: Real-time 3D Gaussian splat renderer with weighted blended OIT, screen-space LOD, and loaders for common splat formats (.ply, .splat, .ksplat).

**Why it matters**:
- Hottest graphics technique of 2024
- Photorealistic backdrops from photogrammetry
- Showcase cutting-edge rendering capability
- Strong PR/marketing value for startup

**Technical Details**:
- 3D Gaussian representation (position, covariance, color, opacity)
- Depth-sorted splatting with OIT blending
- Screen-space LOD (cull small splats)
- Octree spatial culling
- Loader support for .ply, .splat, .ksplat formats
- Spherical harmonics support for view-dependent effects
- Streaming/tiling for large datasets
- VR/WebXR support

**Technical Feasibility**: Medium-Hard (OIT, sorting heuristics, loaders)

**Business Value**: High
- Hot topic in graphics community
- PR/marketing value
- Useful for architectural visualization
- Future-proofing technology

**Time Estimate**: 2-4 weeks

**Differentiation**:
- Babylon-native materials and scene integration
- Streaming/tiling for large datasets (>50M points)
- VR support
- Editor tooling to convert/import splat datasets
- Better than Three.js implementation with Babylon ecosystem

**Exists Elsewhere**: Three.js has @mkkellogg/gaussian-splats-3d; Babylon has experimental support but not turnkey

---

#### 4. Lightweight Frame Graph/Render Graph Orchestrator
**What it is**: Declarative frame graph system to define rendering passes, dependencies, and resource management. Auto-schedules post-processing, shadows, ID buffers, minimap, HZB, and deferred passes.

**Why it matters**:
- Most requested BabylonJS feature
- Foundation for advanced rendering techniques
- Better performance through automatic scheduling
- Cleaner codebase organization
- Built-in profiling

**Technical Details**:
- Pass definition system: `graph.addPass('shadows', { dependencies: ['depth'], outputs: ['shadowMap'] })`
- Resource lifecycle management (textures, buffers)
- Automatic barrier/synchronization insertion
- Profiler overlay showing pass timings
- Integration with existing PostProcessingPipeline
- Integration with CascadedShadowSystem
- Support for custom passes
- Zero-config defaults for common scenarios

**Technical Feasibility**: Hard (graph modeling + Babylon pass integration)

**Business Value**: High
- Frequent user request
- Foundation for all advanced features
- Professional tool for large projects

**Time Estimate**: 3-5 weeks

**Differentiation**:
- "Lite" surface area (not overly complex)
- Zero-config defaults
- Native integration with Babylon systems
- Minimal profiler UI built-in
- Focus on usability over feature completeness initially

**Exists Elsewhere**: Internal engine graphs exist; BabylonJS community wants it

---

### Phase 3: Ecosystem Tools (Broader Market)

#### 5. Node-Based Particle/VFX Editor
**What it is**: Visual node graph editor for particle systems (spawn, forces, collisions, color/size over life) that exports to your existing GPUParticleSystem. Live preview and preset library.

**Why it matters**:
- High community demand (NPE in top requests)
- Lowers barrier to entry for artists
- Widens market beyond RTS
- Reusable for all BabylonJS projects

**Technical Details**:
- Node graph UI (similar to Node Material Editor)
- Nodes: emitters, forces, color curves, size curves, collisions, spawning rules
- Codegen to WGSL/GLSL or JSON
- Exports to existing GPUParticleSystem API
- Live preview panel
- Preset library (explosions, magic, weather, etc.)
- Timeline/keyframe support
- Import/export of particle definitions

**Technical Feasibility**: Medium-Hard (UI + codegen; runtime uses existing system)

**Business Value**: Medium-High
- High demand feature
- Widens market appeal
- Could be sold as standalone tool

**Time Estimate**: 3-5 weeks for solid MVP

**Differentiation**:
- One-click export to Babylon GPUParticleSystem
- Runtime performance parity with hand-written shaders
- Preset library included
- Targets existing production-ready GPUParticleSystem

**Exists Elsewhere**: Babylon has Node Material Editor but not production particle graph

---

#### 6. PBR Area Lights via LTC
**What it is**: Physically-plausible area lights (rectangle, disk, line) for Babylon PBR using Linearly Transformed Cosines (LTC). Includes shadow approximations and energy conservation.

**Why it matters**:
- Widely requested community feature
- Dramatic visual quality upgrade
- Essential for realistic bases/structures
- Professional lighting capability

**Technical Details**:
- LTC (Linearly Transformed Cosines) implementation
- Rectangle/disk/line light shapes
- Pre-computed LUT textures for BRDF
- Shadow approximation (shadow map or contact shadows)
- Energy conservation
- PBR integration (metallic/roughness workflow)
- Multiple light support
- Editor-friendly controls
- Optional lightmap bridging

**Technical Feasibility**: Medium (shader integration + LUTs)

**Business Value**: Medium
- Strong community interest
- Upgrades visual quality
- Differentiates from competitors

**Time Estimate**: 1-2 weeks

**Differentiation**:
- Robust PBR integration
- Validated LUTs included
- Editor-friendly controls
- Shadow support

**Exists Elsewhere**: LTC widely known in graphics; Babylon doesn't ship full area lights

---

#### 7. KTX2 Texture Pipeline and Compressor
**What it is**: Turnkey pipeline to encode/transcode textures to KTX2/BasisU with per-platform targets, mip generation, texture arrays/cubemaps, and build-time automation.

**Why it matters**:
- Requested BabylonJS feature
- Dramatically reduces download size (50-80% reduction)
- Reduces VRAM usage
- Faster loading times
- Applies to ALL BabylonJS projects

**Technical Details**:
- CLI tool for texture compression
- Build-time integration (Node.js/CI hooks)
- Per-platform encoding profiles (WebGL/WebGPU, mobile)
- Automatic mipmap generation
- Texture array/cubemap support
- Quality/size tradeoff preview UI
- Automatic material patching in assets
- Batch processing
- Integration with asset manifest system

**Technical Feasibility**: Medium (tooling + integration; relies on BasisU/ktx2)

**Business Value**: High
- Applies to all Babylon projects
- Immediate performance wins
- Reduces bandwidth costs
- Professional asset pipeline

**Time Estimate**: 1-2 weeks

**Differentiation**:
- Babylon-first presets
- Asset pipeline plugins (Node/CI)
- Preview quality/size tradeoff UI
- Automatic material patching
- End-to-end workflow

**Exists Elsewhere**: BasisU/ktx2 tools exist; Babylon loads KTX2 but end-to-end pipelines are piecemeal

---

## Implementation Phases

### Phase 1: RTS Differentiators (2.5-9 weeks)
**Priority: Immediate competitive advantage**
1. GPU-Driven Instancing, LOD, and Culling Toolkit (4-8 weeks)
2. Fog of War + Minimap GPU Suite (1.5-3 weeks)

**Parallelizable**: Yes, different engineers can work on each component in parallel.

**Business Impact**: Core RTS features that differentiate EdgeCraft from competitors.

---

### Phase 2: Cutting-Edge + Community (5-9 weeks)
**Priority: PR value + high community demand**
3. Gaussian Splatting Renderer (2-4 weeks)
4. Lightweight Frame Graph Orchestrator (3-5 weeks)

**Parallelizable**: Yes, each component can be developed independently.

**Business Impact**: Marketing/PR value, addresses top BabylonJS community requests.

---

### Phase 3: Ecosystem Tools (5-9 weeks)
**Priority: Broader market appeal + reusable products**
5. Node-Based Particle/VFX Editor (3-5 weeks)
6. PBR Area Lights via LTC (1-2 weeks)
7. KTX2 Texture Pipeline (1-2 weeks)

**Parallelizable**: Yes, these tools can be developed concurrently by separate teams.

**Business Impact**: Sellable to broader BabylonJS community, widens market reach.

---

## Total Effort Estimate
- **Minimum (all parallelized with 3 engineers)**: ~9 weeks
- **Maximum (sequential, 1 engineer)**: ~26 weeks
- **Realistic (2 engineers, some parallelization)**: ~13-16 weeks

---

## Monetization Opportunities

### Direct Revenue
1. **Sell plugins individually** on BabylonJS marketplace/GitHub Sponsors
2. **Premium tier**: GPU-Driven + Fog of War + Frame Graph bundle ($299-499/license)
3. **Standard tier**: Gaussian Splatting + Node Particle Editor ($99-149/license)
4. **Asset pipeline tier**: KTX2 Pipeline ($49-79/license)

### Indirect Benefits
1. **Open-source PR**: Release base versions as open-source for community goodwill
2. **Showcase capability**: Attracts investors/partners/customers
3. **Technical leadership**: Position EdgeCraft as BabylonJS innovation leader
4. **Hiring advantage**: Attract top graphics engineers interested in cutting-edge tech

---

## Risk Mitigation

### Technical Risks
- **WebGPU adoption**: Ship WebGPU-first with WebGL fallbacks and feature flags
- **Editor UX scope**: Keep V1 simple (export to existing systems), defer runtime VM
- **Frame graph complexity**: Start "lite" (passes + resources + profiling), avoid overfitting
- **Splatting memory/IO**: Gate large splat sets behind streaming and LOD

### Business Risks
- **Over-engineering**: Timebox each extension; ship MVPs first
- **Market fit**: Validate with BabylonJS community before building
- **Maintenance burden**: Keep codebases small and focused
- **Competition**: Monitor Three.js/Unity WebGL for similar features

---

## Advanced Path (Future Consideration)

**When to consider**:
- Scenes consistently exceed 200k visible instances
- Gaussian splats >50M points or VR requirements
- Multi-view (split-screen/portals) needed
- Heavy tool adoption requiring more features

**Advanced features**:
- Meshlet-based culling with command binning
- HZB (Hierarchical Z-Buffer) occlusion per-cluster
- Out-of-core splat tiling with async decompression
- Full graph VM for particle editor with live preview
- Multi-producer resources in frame graph
- Bindless materials and indirect multi-draw compaction

---

## Recommended Immediate Actions

1. **Validate with community**: Post concepts to BabylonJS forum, gauge interest
2. **Prototype GPU-Driven system**: 1-week spike to validate WebGPU approach
3. **Design APIs**: Document public APIs for extensions before implementation
4. **Set up infrastructure**: GitHub repos, CI/CD, documentation site
5. **Build Phase 1**: Start with GPU-Driven + Fog of War (highest RTS value)

---

## Success Metrics

### Technical Metrics
- GPU-Driven: Support 50k+ instances at 60 FPS
- Fog of War: <1ms compute time for 1000 units
- Gaussian Splatting: 10M+ points at 60 FPS
- Frame Graph: Zero overhead when not profiling

### Business Metrics
- Community engagement: GitHub stars, forum discussions
- Adoption: Downloads/installs from other BabylonJS projects
- Revenue: Paid licenses sold
- PR value: Blog posts, conference talks, social media mentions

---

## Conclusion

EdgeCraft has opportunity to:
1. **Differentiate immediately** with GPU-Driven + Fog of War (Phase 1)
2. **Lead community** with Gaussian Splatting + Frame Graph (Phase 2)
3. **Build ecosystem** with reusable tools (Phase 3)

All while staying on BabylonJS foundation and avoiding costly engine rewrite. These extensions provide competitive advantage, fill community gaps, leverage cutting-edge tech, and are potentially sellable products.

**Recommended start**: Phase 1 (GPU-Driven + Fog of War) for immediate RTS competitive advantage.
