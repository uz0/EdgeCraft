# EdgeCraft Asset Setup Guide - Phase 1 MVP

**Status**: Infrastructure complete, assets pending download
**Time Required**: 30-60 minutes
**Difficulty**: Moderate (requires Blender installation)

This guide walks you through downloading and setting up the legal CC0 assets for EdgeCraft.

---

## 🎯 What You'll Accomplish

By the end of this guide, you'll have:
- ✅ **9 terrain textures** (grass, dirt, rock with PBR maps)
- ✅ **3 doodad models** (tree, bush, rock in GLB format)
- ✅ **Fully validated assets** (legal compliance 100%)
- ✅ **Working 3P Sentinel map** (~45-80% visual coverage)

---

## 📋 Prerequisites

### Required Tools:
1. **curl** (download textures)
   - macOS/Linux: Pre-installed
   - Windows: Use Git Bash or WSL

2. **Python 3.8+** (FBX → GLB conversion)
   ```bash
   python3 --version  # Should be 3.8 or higher
   ```

3. **Blender 3.0+** (model conversion)
   - Download: https://www.blender.org/download/
   - Install to default location
   - macOS: `/Applications/Blender.app`
   - Windows: `C:\Program Files\Blender Foundation\Blender 3.6\`
   - Linux: `/usr/bin/blender` or `/snap/bin/blender`

### Recommended:
- **20-30 MB free disk space** (for assets)
- **Stable internet connection** (downloads ~25 MB)
- **20-40 minutes** for full setup

---

## 🚀 Quick Start (Automated)

If you have all prerequisites installed:

```bash
# Complete automated setup (download + convert + validate)
npm run assets:setup
```

**Expected flow:**
1. Downloads 9 textures from Polyhaven (~12-18 MB)
2. Downloads Quaternius model pack (~21 MB)
3. Launches interactive model selector
4. Converts 3 FBX models to GLB
5. Validates all assets
6. Reports success/failure

**If successful**: Skip to [Testing](#-testing) section.
**If errors**: Follow manual steps below.

---

## 📥 Step 1: Download Textures (Automated)

Run the texture download script:

```bash
npm run assets:download
```

**What it does:**
- Downloads 3 Polyhaven texture sets (CC0)
- Each set: diffuse, normal, roughness (2K JPG)
- Saves to: `public/assets/textures/terrain/`

**Expected output:**
```
====================================
EdgeCraft Asset Downloader - Phase 1
====================================

[1/5] Creating asset directories...
✅ Directories created

[2/5] Downloading terrain textures from Polyhaven (CC0)...

  → Downloading Sparse Grass...
    - Diffuse map...
    - Normal map...
    - Roughness map...
  ✅ Sparse Grass complete (3 files)

  → Downloading Dirt Floor...
  ✅ Dirt Floor complete (3 files)

  → Downloading Rock Surface...
  ✅ Rock Surface complete (3 files)

✅ All textures downloaded (9 files total)
```

**Troubleshooting:**
- **curl errors**: Check internet connection
- **Permission denied**: Run `chmod +x scripts/download-assets-phase1.sh`
- **Missing directory**: Script creates it automatically

**Verify textures:**
```bash
ls -lh public/assets/textures/terrain/
# Should show 9 .jpg files (~1-2 MB each)
```

---

## 🌳 Step 2: Download & Convert Models

### Option A: Interactive Conversion (Recommended)

```bash
npm run assets:convert
```

**Interactive flow:**
1. Script finds all FBX models in Quaternius pack
2. Lists available models (trees, bushes, rocks, etc.)
3. You select 3 models (tree, bush, rock)
4. Blender converts each to GLB (~30 seconds per model)
5. Saves to: `public/assets/models/doodads/`

**Example interaction:**
```
==================================================
EdgeCraft FBX → GLB Converter (Interactive)
==================================================

✅ Found Blender: /Applications/Blender.app/Contents/MacOS/Blender

Found 150 FBX models:

  [ 1] Tree_Oak.fbx                          (1.2 MB)
  [ 2] Tree_Pine.fbx                         (1.1 MB)
  [ 3] Bush_Round.fbx                        (0.8 MB)
  [ 4] Bush_Berry.fbx                        (0.7 MB)
  [ 5] Rock_Large.fbx                        (0.9 MB)
  ...

Phase 1 MVP needs 3 models:
  1. A tree (oak/generic)
  2. A bush/shrub
  3. A rock/boulder

Select #1 for 'tree_oak_01.glb' (or 0 to skip): 1
  ✅ Tree_Oak.fbx → tree_oak_01.glb

Select #2 for 'bush_round_01.glb' (or 0 to skip): 3
  ✅ Bush_Round.fbx → bush_round_01.glb

Select #3 for 'rock_large_01.glb' (or 0 to skip): 5
  ✅ Rock_Large.fbx → rock_large_01.glb

[1/3] Converting tree_oak_01.glb...
(This may take 10-30 seconds...)
✅ Success!

[2/3] Converting bush_round_01.glb...
✅ Success!

[3/3] Converting rock_large_01.glb...
✅ Success!

==================================================
Conversion Summary: 3/3 models converted
==================================================
✅ All models ready!

Next steps:
  1. Verify assets: npm run assets:validate
  2. Test in browser: npm run dev
```

### Option B: Manual Conversion (Fallback)

If the script fails or you prefer manual control:

1. **Download Quaternius Pack:**
   - Visit: https://quaternius.com/packs/ultimatenature.html
   - Click "Download" (free, 21 MB ZIP)
   - Extract to: `public/assets/.downloads/quaternius-ultimate-nature/`

2. **Find Models:**
   - Navigate to extracted `fbx/` folder
   - Locate: `Tree.fbx`, `Bush.fbx`, `Rock.fbx` (or similar)

3. **Convert in Blender:**
   - Open Blender
   - File → Import → FBX
   - Select `Tree.fbx`
   - File → Export → glTF 2.0 (.glb)
   - Save as: `public/assets/models/doodads/tree_oak_01.glb`
   - Repeat for bush and rock

**Verify models:**
```bash
ls -lh public/assets/models/doodads/
# Should show 3 .glb files (~100-500 KB each)
```

---

## ✅ Step 3: Validate Assets

Run the validation script to ensure everything is correct:

```bash
npm run assets:validate
```

**Expected output (success):**
```
============================================================
EdgeCraft Asset Validator - Phase 1 MVP
============================================================

[1/3] Validating Textures...

  ✅ terrain_grass_light [diffuse]
  ✅ terrain_grass_light_normal [normal]
  ✅ terrain_grass_light_roughness [roughness]
  ✅ terrain_dirt_brown [diffuse]
  ✅ terrain_dirt_brown_normal [normal]
  ✅ terrain_dirt_brown_roughness [roughness]
  ✅ terrain_rock_gray [diffuse]
  ✅ terrain_rock_gray_normal [normal]
  ✅ terrain_rock_gray_roughness [roughness]

ℹ️  Textures: 9/9 found, 0 missing

[2/3] Validating 3D Models...

  ✅ doodad_tree_oak_01 [tree]
  ✅ doodad_bush_round_01 [bush]
  ✅ doodad_rock_large_01 [rock]
  ⚠️  doodad_plant_generic_01 [plant] (optional - will use fallback)
  ⚠️  doodad_box_placeholder [placeholder] (generated at runtime)
  ⚠️  doodad_marker_small [marker] (generated at runtime)

ℹ️  Models: 3/6 found, 3 missing (3 are optional)

[3/3] Validating Licenses...

  CC0 1.0:  9 assets
  MIT:      0 assets
  Other:    0 assets

✅ All licenses are CC0 or MIT (legal compliance: 100%)

============================================================
VALIDATION SUMMARY
============================================================

Total Assets:   15
Found:          12 (80.0%)
Missing:        3 (20.0%) - All optional placeholders

✅ 🎉 All required assets valid! Ready for production.

Next steps:
  1. Test in browser: npm run dev
  2. Load map: "3P Sentinel 01 v3.06.w3x"
```

**Troubleshooting:**
- **Textures missing**: Re-run `npm run assets:download`
- **Models missing**: Re-run `npm run assets:convert`
- **License errors**: Check `CREDITS.md` for attribution
- **File size warnings**: Textures >5MB or models >2MB (compression recommended)

---

## 🧪 Step 4: Testing

### Test 1: Start Dev Server

```bash
npm run dev
```

**Expected:** Dev server starts at http://localhost:5173

### Test 2: Load Test Map

1. Navigate to http://localhost:5173
2. Click "Map Gallery" or "Load Map"
3. Select: **"3P Sentinel 01 v3.06.w3x"**
4. Wait for map to load (~2-5 seconds)

### Test 3: Verify Rendering

**✅ SUCCESS indicators:**

**Terrain:**
- NOT solid green
- Shows grass/dirt/rock textures
- Textures tile seamlessly (no visible seams)
- Normal maps create lighting depth

**Doodads:**
- NOT magenta boxes
- Shows 3D tree/bush/rock models
- Models instanced correctly (many copies)
- ~150-300 trees, ~50-100 bushes, ~30-80 rocks

**Performance:**
- 60 FPS maintained
- No console errors
- Smooth camera movement

**Console Logs (expected):**
```
[AssetLoader] Manifest loaded: {textures: 9, models: 6}
[AssetLoader] Loaded texture: terrain_grass_light from /assets/textures/terrain/grass_light.jpg
[TerrainRenderer] Mapped texture ID: Ashenvale → terrain_grass_light
[DoodadRenderer] Mapped doodad ID: ATtr → doodad_tree_oak_01
[DoodadRenderer] Loaded doodad type: ATtr (mapped to doodad_tree_oak_01)
```

**❌ FAILURE indicators:**
- Solid green terrain → Textures not loading
- Magenta boxes → Models not loading
- Black screen → Camera positioning issue (pre-existing bug)
- Low FPS (<30) → Too many doodads or unoptimized models

### Test 4: Visual Comparison

Take screenshots and compare to expected results:

**Before (no assets):**
- Terrain: Solid green (#4D994D)
- Doodads: Magenta boxes (#FF00FF) or brown cubes

**After (with assets):**
- Terrain: Grass/dirt/rock textures with lighting
- Doodads: 3D tree/bush/rock models

**Coverage (3P Sentinel 01):**
- Terrain: ~80% (grass, dirt, rock cover most of Ashenvale)
- Doodads: ~45% (tree, bush, rock are top 3 types)
- Remaining: Placeholder magenta boxes (Phase 2 will add more models)

---

## 📊 Acceptance Criteria

Check all items before declaring success:

**Phase 1 MVP DoD:**
- [ ] ✅ 3 terrain texture sets downloaded (9 JPG files, ~12-18 MB)
- [ ] ✅ 3 doodad models converted (3 GLB files, ~1-3 MB)
- [ ] ✅ `npm run assets:validate` passes (12/15 assets, 3 optional missing)
- [ ] ✅ Dev server runs without errors
- [ ] ✅ 3P Sentinel map loads successfully
- [ ] ✅ Terrain shows textures (not solid green)
- [ ] ✅ Doodads show 3D models (not all magenta boxes)
- [ ] ✅ 60 FPS maintained
- [ ] ✅ Console logs show asset loading
- [ ] ✅ Legal compliance: 100% CC0 (check `CREDITS.md`)

**Optional (Phase 2):**
- [ ] All 96 doodad types covered
- [ ] All tilesets (Ashenvale, Barrens, Lordaeron, etc.)
- [ ] SC2 terrain support
- [ ] Unit models

---

## 🐛 Troubleshooting

### Issue: "Blender not found"

**Solution:**
1. Install Blender: https://www.blender.org/download/
2. Or specify path:
   ```bash
   BLENDER=/path/to/blender python3 scripts/convert-fbx-to-glb.py
   ```

### Issue: "Textures not loading in browser"

**Symptoms:** Terrain is solid green, console shows 404 errors

**Solutions:**
1. Check file paths:
   ```bash
   ls public/assets/textures/terrain/grass_light.jpg
   # Should exist
   ```

2. Check manifest paths (should start with `/assets/`):
   ```bash
   grep "path" public/assets/manifest.json | head -5
   # Should show: "path": "/assets/textures/terrain/..."
   ```

3. Clear browser cache (Cmd+Shift+R / Ctrl+Shift+R)

4. Restart dev server

### Issue: "Models not loading in browser"

**Symptoms:** Doodads are magenta boxes, console shows 404 errors

**Solutions:**
1. Check file existence:
   ```bash
   ls public/assets/models/doodads/tree_oak_01.glb
   # Should exist
   ```

2. Check GLB format (should be binary):
   ```bash
   file public/assets/models/doodads/tree_oak_01.glb
   # Should show: "glTF binary data"
   ```

3. Re-convert models with Blender

4. Check console for specific error messages

### Issue: "FPS drops to <30"

**Causes:**
- Too many doodads (>1000 instances)
- Unoptimized models (>2000 triangles)
- Large textures (>2048x2048)

**Solutions:**
1. Check model poly count:
   - Import GLB into Blender
   - Check triangle count (should be <1000 for Phase 1)

2. Reduce texture resolution:
   - Download 1K versions from Polyhaven instead of 2K

3. Enable LOD (already implemented in DoodadRenderer)

### Issue: "Legal compliance warnings"

**Symptoms:** Validator shows "Invalid license" or "Other: X assets"

**Solutions:**
1. Check `CREDITS.md` - all assets must be CC0 or MIT
2. Re-download assets from official sources
3. Do NOT use Blizzard assets or fan-made derivatives

---

## 📚 Additional Resources

- **Polyhaven Textures**: https://polyhaven.com/textures
- **Quaternius Models**: https://quaternius.com/packs/
- **Blender Download**: https://www.blender.org/download/
- **GLB Validator**: https://gltf-viewer.donmccurdy.com/
- **PRP 2.12 Full Spec**: `PRPs/phase2-rendering/2.12-legal-asset-library.md`
- **Asset Attribution**: `CREDITS.md`

---

## 🎯 Next Steps (Phase 2)

After Phase 1 works:

1. **Expand Terrain Textures** (12 total):
   - Add snow, water, sand, blight variants
   - Download from Polyhaven (CC0)

2. **Expand Doodad Library** (30+ models):
   - Add structures (crates, barrels, fences)
   - Add environment (flowers, vines, mushrooms)
   - Source from Quaternius or Poly Pizza

3. **Add Unit Models** (8 basic types):
   - Worker, warrior, archer, cavalry
   - Download from Mixamo or create simple placeholders

4. **Implement Asset Compression**:
   - Convert textures to KTX2 (GPU compressed)
   - Use Draco compression for GLB models

5. **Create Asset Editor**:
   - In-browser asset preview
   - Drag-and-drop asset replacement
   - Real-time asset hot-reloading

See `PRPs/phase2-rendering/2.12-legal-asset-library.md` for full Phase 2/3 roadmap.

---

## ✅ Completion Checklist

Before marking PRP 2.12 Phase 1 complete:

- [ ] All prerequisites installed (curl, Python, Blender)
- [ ] Textures downloaded (9 files, ~12-18 MB)
- [ ] Models converted (3 files, ~1-3 MB)
- [ ] Validation passes (12/15 assets)
- [ ] 3P Sentinel map renders correctly
- [ ] 60 FPS maintained
- [ ] Console shows asset loading
- [ ] No 404 errors
- [ ] CREDITS.md reviewed
- [ ] Legal compliance: 100% CC0

**Estimated Time:** 30-60 minutes
**Difficulty:** Moderate
**Result:** Fully functional Phase 1 asset library

---

**Good luck! If you encounter issues not covered here, check the PRP or create a GitHub issue.**
