# EdgeCraft Asset Attribution

This document lists all third-party assets used in EdgeCraft, along with their licenses and creators.

**Legal Compliance**: All assets in EdgeCraft are 100% legal, free-license alternatives sourced from reputable CC0/MIT/Public Domain repositories. **No Blizzard Entertainment assets are included.**

---

## 🎨 Terrain Textures (57 files)

### Polyhaven (CC0 Public Domain)

**Polyhaven** provides high-quality, photogrammetry-based PBR textures under CC0 license.
- **Website**: https://polyhaven.com
- **License**: CC0 1.0 Universal (Public Domain)
- **Attribution**: Not required, but appreciated

#### Primary Assets Used:

1. **Sparse Grass** → `terrain_grass_light`
   - Source: https://polyhaven.com/a/sparse_grass
   - Files: Diffuse, Normal (GL), Roughness
   - Use: W3X light grass terrain (Ashenvale, Lordaeron)

2. **Dirt Floor** → `terrain_dirt_brown`
   - Source: https://polyhaven.com/a/dirt_floor
   - Files: Diffuse, Normal (GL), Roughness
   - Use: W3X dirt terrain (all tilesets)

3. **Rock Surface** → `terrain_rock_gray`
   - Source: https://polyhaven.com/a/rock_surface
   - Files: Diffuse, Normal (GL), Roughness
   - Use: W3X rock/cliff terrain (Ashenvale, Barrens, Lordaeron)

4. **Coast Sand Rocks** → `terrain_grass_dirt_mix`
   - Source: https://polyhaven.com/a/coast_sand_rocks_02
   - Files: Diffuse, Normal (GL), Roughness
   - Use: W3X mixed terrain (grass/dirt transition)

5. **Bark Willow** → `terrain_vines`
   - Source: https://polyhaven.com/a/bark_willow_02
   - Files: Diffuse, Normal (GL), Roughness
   - Use: W3X organic/vine terrain

6. **Rock 06** → `terrain_rock_rough`
   - Source: https://polyhaven.com/a/rock_06
   - Files: Diffuse, Normal (GL), Roughness
   - Use: W3X rough rock terrain

7. **Forest Leaves 02** → `terrain_leaves`
   - Source: https://polyhaven.com/a/forest_leaves_02
   - Files: Diffuse, Normal (GL), Roughness
   - Use: W3X forest floor

8. **Aerial Grass Rock** → `terrain_grass_green`
   - Source: https://polyhaven.com/a/aerial_grass_rock
   - Files: Diffuse, Normal (GL), Roughness
   - Use: W3X green grass (Lordaeron summer)

9. **Brown Mud 03** → `terrain_sand_desert`
   - Source: https://polyhaven.com/a/brown_mud_03
   - Files: Diffuse, Normal (GL), Roughness
   - Use: W3X desert sand (Barrens)

10. **Snow 02** → `terrain_snow_clean`
    - Source: https://polyhaven.com/a/snow_02
    - Files: Diffuse, Normal (GL), Roughness
    - Use: W3X snow terrain (Icecrown)

11. **Metal Plate** → `terrain_metal_platform`
    - Source: https://polyhaven.com/a/metal_plate
    - Files: Diffuse, Normal (GL), Roughness
    - Use: SC2 metallic platform terrain

#### Derived/Duplicated Textures (Phase 2 Alpha Quality):

The following textures reuse existing assets for coverage. They can be replaced with unique textures in Phase 3:

- `terrain_grass_dark` ← reuses `terrain_grass_light`
- `terrain_ice` ← reuses `terrain_rock_gray`
- `terrain_dirt_desert` ← reuses `terrain_dirt_brown`
- `terrain_dirt_frozen` ← reuses `terrain_dirt_brown`
- `terrain_rock_desert` ← reuses `terrain_rock_gray`
- `terrain_blight_purple` ← reuses `terrain_dirt_brown`
- `terrain_volcanic_ash` ← reuses `terrain_rock_gray`
- `terrain_lava` ← reuses `terrain_rock_gray`

**Total Terrain Texture Assets**: 19 terrain types (57 files with PBR maps)

---

## 🌳 3D Models - Doodads (33 files)

### EdgeCraft Procedural Models (CC0 Public Domain)

All doodad models are procedurally generated using EdgeCraft's custom glTF 2.0 generator.
- **Generator**: `scripts/generate-all-doodads.py`
- **License**: CC0 1.0 Universal (Public Domain)
- **Author**: EdgeCraft Project
- **Format**: GLB (glTF 2.0 Binary)
- **Triangles**: 5-50 per model (optimized for performance)
- **Materials**: PBR metallic-roughness

#### Trees (8 models):
1. `tree_oak_01` - Oak tree (temperate forest)
2. `tree_pine_01` - Pine tree (northern/mountain)
3. `tree_palm_01` - Palm tree (tropical)
4. `tree_dead_01` - Dead tree (wasteland)
5. `tree_mushroom_01` - Mushroom tree (fantasy)
6. `shrub_small_01` - Small shrub
7. `bush_round_01` - Round bush/hedge
8. `grass_tufts_01` - Grass tufts

#### Rocks (6 models):
9. `rock_large_01` - Large boulder
10. `rock_cluster_01` - Rock cluster
11. `rock_small_01` - Small stones
12. `rock_cliff_01` - Cliff face
13. `rock_crystal_01` - Crystal formation (fantasy)
14. `rock_desert_01` - Desert rock

#### Structures (8 models):
15. `crate_wood_01` - Wooden crate
16. `barrel_01` - Barrel
17. `fence_01` - Fence section
18. `ruins_01` - Ruined building
19. `pillar_stone_01` - Stone pillar
20. `torch_01` - Torch/lamp post
21. `signpost_01` - Signpost
22. `bridge_01` - Bridge section

#### Environment (8 models):
23. `flowers_01` - Flower patches
24. `vines_01` - Vine growth
25. `lily_water_01` - Water lily
26. `mushrooms_01` - Mushrooms
27. `bones_01` - Bones/skull
28. `campfire_01` - Campfire
29. `well_01` - Well
30. `rubble_01` - Ruins/rubble

#### Special (3 models):
31. `placeholder_box` - Magenta fallback for missing models
32. `marker_small` - Yellow marker for invisible objects
33. `plant_generic_01` - Generic plant/vegetation

**Total 3D Model Assets**: 33 doodad models (trees, rocks, structures, environment)

---

## 📊 Asset Summary

| Category | Count | Total Size | License |
|----------|-------|-----------|---------|
| Terrain Textures | 57 files (19 types) | ~100 MB | CC0 1.0 |
| Doodad Models | 33 files | ~50 KB | CC0 1.0 |
| **TOTAL** | **90 assets** | **~100 MB** | **100% CC0** |

---

## 📜 CC0 1.0 Universal License

All assets are released under **CC0 1.0 Universal (Public Domain)**. This means:

✅ **You can:**
- Use commercially
- Modify and remix
- Distribute
- Use without attribution (though appreciated)

❌ **No trademark/patent rights** are granted.

**Full License**: https://creativecommons.org/publicdomain/zero/1.0/

---

## 🔒 Legal Compliance

### Clean-Room Implementation

EdgeCraft implements support for Blizzard file formats (W3X, SC2, W3N, MDX, M3) through **clean-room reverse engineering**:

1. **No Decompilation**: File format specifications were derived from:
   - Community-maintained documentation (w3x.co, SC2Mapster)
   - Hex editor analysis of map files
   - Black-box functional testing

2. **No Blizzard Code**: Zero lines of Blizzard Entertainment source code were used.

3. **No Blizzard Assets**: All textures, models, and sounds are original or CC0/MIT licensed.

### Copyright Notices

- **Blizzard Entertainment**: Warcraft III, StarCraft II, and related trademarks are property of Blizzard Entertainment, Inc. EdgeCraft is NOT affiliated with, endorsed by, or sponsored by Blizzard Entertainment.

- **Polyhaven**: Textures sourced from Polyhaven are in the Public Domain (CC0 1.0). No attribution required, but credit given.

### Asset Validation

All assets are automatically validated by CI/CD:
- **SHA-256 hashing**: Prevents accidental inclusion of copyrighted files
- **License verification**: Ensures all assets are CC0/MIT/Public Domain
- **Visual similarity checks**: (Future) Prevents Blizzard lookalikes

**Validation Script**: `scripts/validate-assets.cjs`

---

## 🙏 Acknowledgments

- **Polyhaven Community** - For providing world-class CC0 textures
- **glTF Working Group** - For the glTF 2.0 specification
- **Babylon.js Team** - For the 3D rendering engine
- **Open Source Community** - For tools, libraries, and documentation

---

**Last Updated**: 2025-01-13
**EdgeCraft Version**: PRP 2.12 (Full Implementation)
