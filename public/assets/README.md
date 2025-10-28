# EdgeCraft Asset Library

**Status**: Phase 1 MVP - 3 terrain textures + 3 doodad models

This directory contains the legal, free-license assets for rendering Warcraft 3, StarCraft 2, and campaign maps.

---

## 📋 Phase 1 MVP Requirements

### Terrain Textures (3 total)

Download these from **Poly Haven** (all CC0, no login required):

1. **Grass** - sparse_grass
   - URL: https://polyhaven.com/a/sparse_grass
   - Download: 2K resolution, JPG format
   - Files needed:
     - `Sparse_Grass_diff_2k.jpg` → save as `grass_light.jpg`
     - `Sparse_Grass_nor_gl_2k.jpg` → save as `grass_light_normal.jpg`
     - `Sparse_Grass_rough_2k.jpg` → save as `grass_light_roughness.jpg`
   - Save to: `public/assets/textures/terrain/`

2. **Dirt** - dirt_floor
   - URL: https://polyhaven.com/a/dirt_floor
   - Download: 2K resolution, JPG format
   - Files needed:
     - `Dirt_Floor_diff_2k.jpg` → save as `dirt_brown.jpg`
     - `Dirt_Floor_nor_gl_2k.jpg` → save as `dirt_brown_normal.jpg`
     - `Dirt_Floor_rough_2k.jpg` → save as `dirt_brown_roughness.jpg`
   - Save to: `public/assets/textures/terrain/`

3. **Rock** - rock_surface
   - URL: https://polyhaven.com/a/rock_surface
   - Download: 2K resolution, JPG format
   - Files needed:
     - `Rock_Surface_diff_2k.jpg` → save as `rock_gray.jpg`
     - `Rock_Surface_nor_gl_2k.jpg` → save as `rock_gray_normal.jpg`
     - `Rock_Surface_rough_2k.jpg` → save as `rock_gray_roughness.jpg`
   - Save to: `public/assets/textures/terrain/`

### Doodad Models (3 total)

Download these from **Quaternius Ultimate Nature Pack** (CC0):

1. **Tree** - Oak tree model
   - URL: https://quaternius.com/packs/ultimatenature.html
   - Or: https://quaternius.itch.io/150-lowpoly-nature-models
   - Download: Ultimate Nature Pack (free, 21 MB ZIP)
   - Extract: Find tree model (e.g., `Tree.fbx` or `TreeOak.fbx`)
   - Convert: Use Blender to export as GLB
     - File → Import → FBX
     - File → Export → glTF 2.0 (.glb)
   - Save as: `tree_oak_01.glb` in `public/assets/models/doodads/`

2. **Bush** - Round shrub model
   - Same pack as above
   - Extract: Find bush/shrub model (e.g., `Bush.fbx` or `Shrub.fbx`)
   - Convert: Use Blender to export as GLB
   - Save as: `bush_round_01.glb` in `public/assets/models/doodads/`

3. **Rock** - Boulder model
   - Same pack as above
   - Extract: Find rock/boulder model (e.g., `Rock.fbx` or `Boulder.fbx`)
   - Convert: Use Blender to export as GLB
   - Save as: `rock_large_01.glb` in `public/assets/models/doodads/`

---

## 📂 Expected Directory Structure

After downloading all assets:

```
public/assets/
├── manifest.json
├── README.md
├── textures/
│   └── terrain/
│       ├── grass_light.jpg
│       ├── grass_light_normal.jpg
│       ├── grass_light_roughness.jpg
│       ├── dirt_brown.jpg
│       ├── dirt_brown_normal.jpg
│       ├── dirt_brown_roughness.jpg
│       ├── rock_gray.jpg
│       ├── rock_gray_normal.jpg
│       └── rock_gray_roughness.jpg
└── models/
    └── doodads/
        ├── tree_oak_01.glb
        ├── bush_round_01.glb
        └── rock_large_01.glb
```

---

## ✅ Verification

After downloading, verify the assets:

1. **Check file sizes**:
   - Textures: Each ~500KB-2MB (2K resolution JPGs)
   - Models: Each ~50KB-500KB (GLB format)

2. **Test in browser**:
   - Run `npm run dev`
   - Load a map (e.g., 3P Sentinel 01 v3.06.w3x)
   - Terrain should show grass/dirt/rock textures
   - Doodads should show tree/bush/rock models

3. **Check console**:
   - Should see `[AssetLoader] Manifest loaded`
   - Should see `[AssetLoader] Loaded texture: terrain_grass_light`
   - Should see `[AssetLoader] Loaded model: doodad_tree_oak_01`

---

## 📊 Expected Results

**3P Sentinel 01 v3.06.w3x** (our test map):
- **Terrain coverage**: ~80% (grass, dirt, rock are most common)
- **Doodad coverage**: ~45% (tree, bush, rock are top 3 types)
- **Before**: Solid green terrain + magenta boxes
- **After**: Textured terrain + 3D models

---

## 🚀 Quick Start Script (Linux/Mac)

```bash
# Create directories
mkdir -p public/assets/textures/terrain
mkdir -p public/assets/models/doodads

# Download textures (requires wget/curl)
cd public/assets/textures/terrain

# Grass (sparse_grass from Polyhaven)
# Download manually from: https://polyhaven.com/a/sparse_grass

# Dirt (dirt_floor from Polyhaven)
# Download manually from: https://polyhaven.com/a/dirt_floor

# Rock (rock_surface from Polyhaven)
# Download manually from: https://polyhaven.com/a/rock_surface

# Download models (requires manual download + Blender conversion)
# 1. Download from: https://quaternius.com/packs/ultimatenature.html
# 2. Extract ZIP
# 3. Convert FBX → GLB using Blender
# 4. Copy to public/assets/models/doodads/
```

---

## 📝 License Compliance

All assets in this library are:
- ✅ CC0 (Public Domain) or MIT licensed
- ✅ Free for commercial use
- ✅ No attribution required (but appreciated)
- ✅ Verified by EdgeCraft Legal Compliance Pipeline

**Attribution**: See `CREDITS.md` in project root.

---

## 🔄 Phase 2 & 3

Phase 1 covers ~45% of 3P Sentinel map. Future phases will add:
- **Phase 2**: Complete Ashenvale tileset (12 textures) + all 96 doodad types
- **Phase 3**: All tilesets (12+) + SC2/W3N support (300+ doodad types)

See `PRPs/phase2-rendering/2.12-legal-asset-library.md` for details.
