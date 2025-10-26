# PRP: WebGL vs Babylon.js Evaluation

## 🎯 Goal
- Evaluate the feasibility and ROI of replacing Babylon.js with a bespoke WebGL renderer for Edge Craft.
- Document technical, productivity, and business trade-offs to inform engine roadmap decisions.

## 📌 Status
- **State**: ✅ Complete
- **Created**: 2025-10-20

## 📈 Progress
- Audited current engine integration with Babylon.js subsystems and tooling.
- Assessed performance, maintenance, and opportunity cost implications of a WebGL rewrite.
- Synthesized feedback from multiple analyses (gpt-5-high, gemini, claude, gpt-o1) into unified verdict.

## 🛠️ Results / Plan
- Recommendation: remain on Babylon.js, invest in targeted optimizations, and avoid engine rewrite.
- Plan: follow outlined optimization path (profiling, instancing, shadow/post-process tuning, asset pipeline).
- No further PRP action required; future work tracked in optimization backlogs.

## ✅ Definition of Done
- [x] Comparison matrix produced covering engine integration, productivity, performance, and maintenance.
- [x] Opportunity cost and migration timeline risks articulated with quantified estimates.
- [x] Consensus recommendation documented and approved by engineering leadership.
- [x] Follow-up optimization plan provided with actionable steps.

## 📋 Definition of Ready
- [x] Current Edge Craft rendering architecture reviewed.
- [x] Known performance hotspots and optimization history collected.
- [x] Stakeholder questions enumerated (engine vs gameplay priorities).
- [x] Benchmark data and code references gathered for analysis.

---

## 📚 Comparison
- **[gpt-5-high] Engine Surface Already Leveraged**
  - Scene bootstrap, renderer lifecycle, and camera orchestration are Babylon-driven (`src/engine/core/Engine.ts`, `src/engine/core/Scene.ts`, `src/engine/camera/RTSCamera.ts`).
  - Rendering subsystems depend on Babylon-specific features: optimized pipeline hooks (`src/engine/rendering/RenderPipeline.ts:13-158`), cascaded shadows (`src/engine/rendering/CascadedShadowSystem.ts:31-158`), blob shadows, instancing, custom shader injection, GPU particles, and post-processing (`src/engine/rendering/PostProcessingPipeline.ts`, `src/engine/rendering/GPUParticleSystem.ts`).
  - Asset flow relies on Babylon loaders and material classes (`src/engine/assets/AssetLoader.ts:6-188`, `src/engine/rendering/MaterialCache.ts`, `src/engine/rendering/PBRMaterialSystem.ts`), including glTF import, thin instancing, and automatic fallbacks.
- **[gpt-5-high] Productivity & Tooling**
  - Strong TypeScript typings and runtime helpers shorten iteration; internal extensions sit on top of Babylon's modules (`src/types/babylon-extensions.d.ts`).
  - Existing optimization utilities (material sharing, culling, LOD) call Babylon APIs rather than reimplementing draw-call management (`src/engine/rendering/DrawCallOptimizer.ts`, `src/engine/rendering/CullingStrategy.ts`).
  - Debug/inspection tooling (Playground snippets, inspector, GUI editor) stays available for designers and engineers without extra integration cost.
- **[gpt-5-high] Performance & Control**
  - Babylon exposes low-level knobs—manual render targets, hardware scaling, shader hot-swaps—while abstracting browser quirks; see `RenderPipeline.applySceneOptimizations()` for direct engine tweaks (`src/engine/rendering/RenderPipeline.ts:139-158`).
  - Dropping to raw WebGL would mean rebuilding buffer/command orchestration, shader compilation pipelines, batching strategies, and compatibility fallbacks that Babylon already optimizes across browsers/GPUs.
- **[gpt-5-high] Maintenance & Risk Profile**
  - Babylon delivers ongoing WebGL/WebGPU patches, XR features, and performance fixes "for free." A custom renderer transfers that burden to the Edge Craft team, stretching bandwidth during the GUI rewrite and increasing regression surface.
  - Replacing Babylon would invalidate sizeable portions of the current engine, forcing rewrites for shadows, particles, loaders, post FX, and quality presets before any gameplay/UI work could proceed.
- **[gemini-2.5-pro] Deep Framework Integration vs. Abstraction Cost**
  - The codebase analysis reveals that Babylon.js is not merely a rendering library but the foundational framework for the entire `EdgeCraftEngine`. Core modules like `Engine.ts` and `Scene.ts` are direct wrappers around Babylon.js classes.
  - Advanced rendering features are deeply integrated: `CascadedShadowSystem.ts` relies on `BABYLON.CascadedShadowGenerator`, `PostProcessingPipeline.ts` uses `BABYLON.DefaultRenderingPipeline`, and `GPUParticleSystem.ts` leverages `BABYLON.GPUParticleSystem`.
  - This deep integration means the "abstraction cost" is already paid and heavily leveraged. A switch to WebGL would require a ground-up rewrite of the entire rendering pipeline, a task of significant complexity and duration.
- **[gemini-2.5-pro] Feature Completeness vs. Development Overhead**
  - The project currently benefits from a rich feature set provided by Babylon.js out-of-the-box, including advanced shadow mapping, post-processing effects, and high-performance particle systems.
  - Re-implementing these features in vanilla WebGL would be a massive undertaking. For example, creating a custom, stable, and performant cascaded shadow mapping system is a non-trivial graphics programming challenge.
  - The development overhead of creating and maintaining a bespoke WebGL engine would divert resources from core gameplay and feature development.
- **[gemini-2.5-pro] Performance: Optimization Potential vs. Practical Reality**
  - While a hyper-optimized, custom WebGL solution could theoretically outperform a general-purpose engine like Babylon.js, the existing codebase already employs sophisticated performance optimization techniques available within Babylon, such as `scene.freezeActiveMeshes()`, hardware scaling, and various culling strategies (`RenderPipeline.ts`).
  - A custom WebGL engine would not automatically be faster. Achieving superior performance would require a dedicated and sustained engineering effort in low-level graphics optimization, a cost that is likely to outweigh the potential gains for this project.
- **[gemini-2.5-pro] Ecosystem and Tooling vs. Building from Scratch**
  - The project benefits from the mature Babylon.js ecosystem, including its extensive documentation, community support, and powerful debugging tools like the Inspector and Playground.
  - A move to WebGL would mean abandoning this ecosystem and forcing the team to build its own debugging and inspection tools, significantly slowing down development and bug-fixing processes.
- **[gemini-2.5-pro] Long-Term Maintenance and Future-Proofing**
  - Babylon.js is actively maintained by Microsoft and a large open-source community, ensuring ongoing bug fixes, performance improvements, and adaptation to new web standards like WebGPU.
  - By relying on Babylon.js, the project benefits from this continuous development "for free." A proprietary WebGL engine would place the entire burden of maintenance, including handling browser-specific quirks and future API changes, squarely on the internal development team.

- **[gemini-2.5-pro] Scene Graph & Engine Core (`Engine.ts`, `Scene.ts`)**
  - **Current:** The project leverages `BABYLON.Engine` and `BABYLON.Scene` for fundamental operations: render loop, resource management, and the core scene graph hierarchy.
  - **WebGL Replacement Cost:** **Extremely High.** This would involve creating a scene graph from scratch, including node management, parent-child relationships, and world/local matrix computations. A custom render loop, state management, and handling of the WebGL context (loss and restoration) would also be required. This is the foundational work of any 3D engine.

- **[gemini-2.5-pro] Asset Loading (`AssetLoader.ts`, `glTF`)**
  - **Current:** `BABYLON.SceneLoader.ImportMeshAsync` is used to load complex glTF models, and `BABYLON.Texture` handles various image formats.
  - **WebGL Replacement Cost:** **Very High.** The glTF format is a complex specification. Writing a custom parser to handle its JSON structure, binary buffers, accessors, materials, and animations is a significant project in itself. Most standalone WebGL applications use a library *just for this part*. The team would also need to write loaders for different texture formats and handle their GPU upload and sampling.

- **[gemini-2.5-pro] Advanced Shadows (`CascadedShadowSystem.ts`)**
  - **Current:** `BABYLON.CascadedShadowGenerator` provides high-quality, dynamic shadows over large distances, a critical feature for an RTS game.
  - **WebGL Replacement Cost:** **Very High.** Implementing CSM in WebGL is an advanced graphics technique. It requires: 1) Splitting the camera frustum into multiple sub-frustums. 2) Rendering the scene from the light's perspective for each frustum into separate depth maps (textures). 3) In the main render pass, sampling the correct depth map based on fragment distance and performing the shadow comparison. The lack of readily available "basic" tutorials for this indicates its complexity.

- **[gemini-2.5-pro] Post-Processing (`PostProcessingPipeline.ts`)**
  - **Current:** `BABYLON.DefaultRenderingPipeline` is used for a chain of effects: FXAA, Bloom, Color Grading, Tone Mapping, etc.
  - **WebGL Replacement Cost:** **High.** While a single post-processing effect is manageable, building a flexible, multi-pass pipeline is complex. It requires robust management of Framebuffer Objects (FBOs), render textures (ping-ponging between them for multi-pass effects), and custom shaders for each effect. The current system leverages a pre-built, optimized Babylon.js pipeline.

- **[gemini-2.5-pro] Particle Effects (`GPUParticleSystem.ts`)**
  - **Current:** `BABYLON.GPUParticleSystem` offloads particle simulation to the GPU for high performance.
  - **WebGL Replacement Cost:** **High.** This is another advanced technique. It would require using either WebGL2's Transform Feedback or a texture-based simulation (writing particle positions/velocities to textures). Both methods involve writing complex custom shaders for simulation and rendering, and careful management of GPU buffer/texture state between frames.

- **[gemini-2.5-pro] Performance Optimizations (`RenderPipeline.ts`)**
  - **Current:** The project uses Babylon.js's built-in tools for culling, material sharing, and critically, `scene.freezeActiveMeshes()` and thin instancing for massive performance gains.
  - **WebGL Replacement Cost:** **High.** These aren't single features but systems. A custom culling system (frustum and potentially occlusion) would be needed. A batching/instancing system to reduce draw calls would have to be built from the ground up. The performance gains from `freezeActiveMeshes` come from deep engine optimizations that would be very difficult to replicate.

- **[claude-sonnet] Quantified Performance Optimizations Already Achieved**
  - Material sharing: 70% reduction in unique materials (`src/engine/rendering/MaterialCache.ts:1-212`)
  - Draw call reduction: 80%+ reduction through mesh merging (`src/engine/rendering/DrawCallOptimizer.ts:1-286`)
  - freezeActiveMeshes: 20-40% FPS improvement documented in code (`src/engine/rendering/RenderPipeline.ts:163-180`)
  - Thin instancing for units fully implemented and working

- **[claude-sonnet] Current Babylon Integration Points**
  - Engine initialization and lifecycle (`src/engine/core/Engine.ts:26-206`)
  - Scene management and callbacks (`src/engine/core/Scene.ts:19-99`)
  - RTS camera with UniversalCamera (`src/engine/camera/RTSCamera.ts:20-133`)
  - Material caching system (`src/engine/rendering/MaterialCache.ts:22-212`)
  - Draw call optimizer with mesh merging (`src/engine/rendering/DrawCallOptimizer.ts:22-286`)
  - Cascaded shadow system (`src/engine/rendering/CascadedShadowSystem.ts:30-299`)
  - Post-processing pipeline (`src/engine/rendering/PostProcessingPipeline.ts:83-369`)
  - GPU particle system (`src/engine/rendering/GPUParticleSystem.ts:126-466`)
  - Asset loader with glTF support (`src/engine/assets/AssetLoader.ts:34-191`)

- **[gpt-o1] Total Duration:** 6-12+ months with 1-2 senior graphics engineers
- **[gpt-o1] Scene Graph & Engine Core:** 2-3 weeks (render loop, resource management, context loss handling)
- **[gpt-o1] CSM Shadows:** 4-6 weeks (cascades, stabilization, PCF, bias tuning, fit-to-frustum)
- **[gpt-o1] Post-Processing Pipeline:** 3-5 weeks (FXAA, bloom mip-chain, tone mapping, LUTs, CA, vignette)
- **[gpt-o1] GPU Particle System:** 4-8 weeks (Transform Feedback/texture-based simulation, emitters, curves, spawning)
- **[gpt-o1] Asset Pipeline:** 3-6 weeks with third-party libs (glTF + DRACO + KTX2); 6-10 weeks from scratch
- **[gpt-o1] Scene Graph & Culling:** 3-6 weeks (hierarchical transforms, BVH/cell culling, bounds)
- **[gpt-o1] Material & Shader System:** 3-6 weeks (UBOs, caching, variants, defines)
- **[gpt-o1] Lighting & PBR:** 6-10 weeks (baseline PBR implementation)
- **[gpt-o1] Instancing System:** 2-3 weeks (per-instance attributes, culling)
- **[gpt-o1] Picking, Input, Controls:** 2-4 weeks (ray casting, camera, debug tools)
- **[gpt-o1] Parity QA & Performance Tuning:** 6-12 weeks across browsers/GPUs
- **[gpt-o1] Ongoing Maintenance:** Significant continuous burden

**[gpt-o1] Current Bottlenecks**
- RTS performance dominated by: draw calls, overdraw, shadows, particles, asset size
- Engine overhead is small slice of frame time once using instancing, frozen meshes, trimmed post-processing
- GPU costs (shadows, particles, overdraw, memory bandwidth) are the real limiters

**[gpt-o1] Potential Gains with Custom WebGL**
- Slightly lower CPU overhead (0.5-2ms/frame) from tailored scene traversal and specialized draw path
- Tighter render target reuse, fewer FBO binds in post-processing

**[gpt-o1] Reality**
- WebGL lacks MultiDrawIndirect/bindless to radically reduce CPU submission
- Current codebase already uses thin instancing, frozen meshes, material sharing: engine overhead likely not primary bottleneck
- **Net Result:** Without highly specialized renderer, expect little-to-modest improvement. Risk and time-to-regress large relative to expected win

## [babylonjs-docs] What Babylon Provides

**[babylonjs-docs] Abstraction Value**
- High-level API abstracting WebGL complexity, allowing focus on 3D experiences vs low-level graphics operations
- Extensive built-in features: scene management, asset loading, advanced materials (PBR, Standard), post-processing, shadows, particles, GUI
- XR support (WebXR), node-based editors (Node Material Editor, Node Geometry Editor), Inspector/Playground for debugging
- Large and active community with extensive documentation, examples, extensions
- Modular architecture with component-based behaviors and plugins
- Event-driven system with observables for handling interactions

**[babylonjs-docs] What Would Be Lost**
- WebGPU backend path and ongoing performance improvements
- Battle-tested glTF pipeline (DRACO, KTX2 compression support), PBR/material ecosystem
- Cross-browser workarounds and compatibility fixes maintained by Microsoft and community
- Professional tooling ecosystem (Spector.js integration, visual editors, playground)
- Continuous maintenance for browser/driver quirks becomes team burden
- Future web standards support (WebGPU, new XR features) requires team implementation

## [gpt-o1] Risk Analysis

**[gpt-o1] Technical Risks**
- Quality regressions: shadow acne/peter-panning, bloom/tone mapping differences, particle blending artifacts, asset incompatibilities
- Reimplementing edge cases: device loss recovery, cross-GPU quirks, precision issues, mobile compatibility, ANGLE translation layer issues
- Integration complexity: replacing interconnected systems simultaneously while maintaining stability
- Loss of institutional knowledge about graphics programming edge cases

**[gpt-o1] Schedule Risks**
- 6-12+ month timeline blocks all feature development
- High probability of delays from unforeseen complexity
- Team bandwidth stretched during concurrent GUI rewrite
- Regression testing and QA across devices/browsers massive effort

**[gpt-o1] Opportunity Cost**
- No new gameplay features, UI improvements, or content for 6-12 months
- Team expertise remains in graphics programming vs game development and content creation
- Market window could close while rebuilding infrastructure
- Competitors ship features while you rebuild engine

## Verdict
- **[gpt-5-high]** Babylon.js is providing concrete value today: it powers the entire render stack, trims implementation cost via tooling, and still grants performance control where needed.
- **[gpt-5-high]** Moving to raw WebGL now would stall the UI roadmap while the team rebuilds rendering fundamentals already delivered by Babylon.
- **[gpt-5-high]** Stay on Babylon.js, continue optimizing targeted hotspots, and focus engineering effort on HUD migration and gameplay tooling instead of reinventing the engine.
- **[gemini-2.5-pro]** The cost of migrating from Babylon.js to vanilla WebGL would be extraordinarily high, with a questionable return on investment. The project is deeply and effectively leveraging the Babylon.js framework, and a rewrite would involve discarding a massive amount of working, feature-rich code.
- **[gemini-2.5-pro]** The theoretical performance benefits of a custom WebGL engine are unlikely to be realized in practice without a substantial and prolonged investment in low-level graphics engineering. The current implementation already demonstrates a strong focus on performance using Babylon.js's optimization capabilities.
- **[gemini-2.5-pro]** The productivity and maintenance advantages of staying with Babylon.js are overwhelming. The team can continue to benefit from a mature ecosystem, powerful tooling, and ongoing updates, allowing them to focus on delivering value to their users rather than on engine development. It is strongly recommended to continue building upon the existing Babylon.js foundation.
- **[claude-sonnet]** Current codebase achieves 70% material reduction, 80% draw call reduction, 20-40% FPS improvement from freezeActiveMeshes, plus thin instancing—all Babylon features. Migration would invalidate this work and require 6-12 months to regain parity before any improvements possible.
- **[gpt-o1]** Do not migrate to vanilla WebGL. Cost extraordinarily high (6-12+ months, 1-2 senior engineers) with questionable ROI. Current bottlenecks are GPU-bound (shadows, particles, overdraw), not engine overhead. **Stay on Babylon.js and invest in targeted optimizations.**

## [gpt-o1] Recommended Path Forward

**[gpt-o1] Do not migrate to vanilla WebGL.** Instead, invest in targeted optimizations within Babylon:

1. **Profiling & Bottleneck Mapping** (Small: 1-2 days)
   - Use Spector.js + Babylon metrics (draw calls, active meshes, frame time, GPU timing queries)
   - Record CPU vs GPU breakdown on worst-case scenes (largest map + thousands of units, max particles, CSM on)
   - Identify real bottlenecks vs theoretical concerns

2. **Draw Call & Instancing Improvements** (Medium: 1-3 days)
   - Standardize thin instancing for units with per-instance buffers (colors, team flags, animation phase)
   - Batch materials, use texture atlases/texture arrays to reduce binds
   - Pre-bake LODs; swap via current Dynamic LOD gate

3. **Shadow Optimization** (Medium: 1-3 days)
   - Tune cascade count/size per quality tier
   - Expand blob shadow usage for crowds (already partially implemented)
   - Keep CSM only for high-priority objects (current policy)
   - Adjust bias and stabilizeCascades for cache-friendly behavior

4. **Post-Processing Optimization** (Small-Medium: 1-2 days)
   - Replace unneeded DefaultRenderingPipeline portions with minimal PostProcess chain
   - Reuse single HDR target, minimize FBO switches
   - Adaptive effect toggling based on frame time (disable CA/vignette on busy frames)

5. **Particle Optimization** (Medium: 2-3 days)
   - Limit blend overdraw with narrower quads and lower alpha
   - Use soft-kill in shader to avoid long tails
   - Cap concurrent effects adaptively by frame time
   - Consider half-res particle rendering for weather/storms

6. **Asset Pipeline Enhancement** (Medium: 2-5 days)
   - Use KTX2/Basis compressed textures for reduced memory and bandwidth
   - DRACO/meshopt for glTF compression
   - Pre-merge static meshes offline when legal/art permits
   - Bake LODs and lightmaps where usable

7. **Scene/Culling Improvements** (Small-Medium: 1-2 days)
   - Keep freezeActiveMeshes for static sets (already implemented)
   - Push more objects into "static" metadata and bake transforms
   - Implement/verify hierarchical or cell-based CPU culling for units
   - Use Babylon's bounding info per-cell

8. **Abstraction Seam** (Optional, Small-Medium: 1-3 days)
   - Keep IEngineCore, but avoid leaking Babylon types in new APIs
   - Pass handles/plain data where possible
   - Only for new modules to avoid churn

**[gpt-o1] Effort:** Each item 1-8 hours to 1-3 days; **total a few weeks of incremental, low-risk work** vs 6-12 months for migration.

**[gpt-o1] Only consider migration if:**
- After exhausting Babylon optimizations, you're consistently CPU-bound on engine layer by >2ms on target hardware, verified across maps
- You need techniques Babylon fundamentally cannot support (exotic shadow clipmaps, custom tile/clustered forward with texture arrays, specialized bindless-like emulation)
- Babylon's WebGPU path does not meet your needs and is a blocker
