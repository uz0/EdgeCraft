# EdgeCraft Asset Attribution

This document lists all third-party assets used in EdgeCraft, along with their licenses and creators.

**Legal Compliance**: All assets in EdgeCraft are 100% legal, free-license alternatives sourced from reputable CC0/MIT/Public Domain repositories. **No Blizzard Entertainment assets are included.**

---

## 🎨 Terrain Textures (57 files = 19 types × 3 PBR maps)

### Polyhaven (CC0 Public Domain)

**Polyhaven** provides high-quality, photogrammetry-based PBR textures under CC0 license.
- **Website**: https://polyhaven.com
- **License**: CC0 1.0 Universal (Public Domain)
- **Attribution**: Not required, but appreciated

All terrain textures are sourced from Polyhaven at 2K resolution (2048×2048 JPG), including diffuse, normal (GL), and roughness maps for physically-based rendering (PBR).

#### Primary Textures (19 unique texture sets):

1. **Sparse Grass** → `terrain_grass_light`
   - Source: https://polyhaven.com/a/sparse_grass
   - Use: W3X light grass terrain (Ashenvale, Lordaeron)

2. **Dirt Floor** → `terrain_dirt_brown`
   - Source: https://polyhaven.com/a/dirt_floor
   - Use: W3X dirt terrain (all tilesets)

3. **Rock Surface** → `terrain_rock_gray`
   - Source: https://polyhaven.com/a/rock_surface
   - Use: W3X rock/cliff terrain (Ashenvale, Barrens, Lordaeron)

4. **Coast Sand Rocks** → `terrain_grass_dirt_mix`
   - Source: https://polyhaven.com/a/coast_sand_rocks_02
   - Use: W3X mixed terrain (grass/dirt transition)

5. **Bark Willow** → `terrain_vines`
   - Source: https://polyhaven.com/a/bark_willow_02
   - Use: W3X organic/vine terrain

6. **Leafy Grass** → `terrain_grass_dark`
   - Source: https://polyhaven.com/a/leafy_grass
   - Use: W3X dark grass terrain (forest)

7. **Rock 06** → `terrain_rock_rough`
   - Source: https://polyhaven.com/a/rock_06
   - Use: W3X rough rock terrain

8. **Forest Leaves 02** → `terrain_leaves`
   - Source: https://polyhaven.com/a/forest_leaves_02
   - Use: W3X forest floor

9. **Red Sand** → `terrain_dirt_desert`
   - Source: https://polyhaven.com/a/red_sand
   - Use: W3X desert dirt (Barrens)

10. **Brown Mud 03** → `terrain_sand_desert`
    - Source: https://polyhaven.com/a/brown_mud_03
    - Use: W3X desert sand (Barrens)

11. **Volcanic Rock Tiles** → `terrain_rock_desert`
    - Source: https://polyhaven.com/a/volcanic_rock_tiles
    - Use: W3X desert rock terrain

12. **Aerial Grass Rock** → `terrain_grass_green`
    - Source: https://polyhaven.com/a/aerial_grass_rock
    - Use: W3X green grass (Lordaeron summer)

13. **Snow 02** → `terrain_snow_clean`
    - Source: https://polyhaven.com/a/snow_02
    - Use: W3X snow terrain (Icecrown)

14. **Snow 04** → `terrain_ice`
    - Source: https://polyhaven.com/a/snow_04
    - Use: W3X ice terrain (Northrend)

15. **Sandy Gravel 02** → `terrain_dirt_frozen`
    - Source: https://polyhaven.com/a/sandy_gravel_02
    - Use: W3X frozen dirt terrain

16. **Metal Plate** → `terrain_metal_platform`
    - Source: https://polyhaven.com/a/metal_plate
    - Use: SC2 metallic platform terrain

17. **Brown Mud 03** → `terrain_blight_purple`
    - Source: https://polyhaven.com/a/brown_mud_03
    - Use: W3X corrupted/blight terrain

18. **Volcanic Herringbone 01** → `terrain_volcanic_ash`
    - Source: https://polyhaven.com/a/volcanic_herringbone_01
    - Use: SC2 volcanic ash terrain

19. **Rock 08** → `terrain_lava`
    - Source: https://polyhaven.com/a/rock_08
    - Use: SC2 lava/volcanic rock terrain

**Total Polyhaven Texture Assets**: 19 terrain types (57 files with PBR maps)
**License**: CC0 1.0 Universal (Public Domain)
**Quality**: Production-grade, photorealistic, 2K resolution, seamlessly tileable

---

## 🌳 3D Models - Doodads (33 files)

### Kenney.nl Nature Kit (CC0 Public Domain)

**Kenney** provides high-quality, low-poly game assets under CC0 license.
- **Website**: https://kenney.nl/assets/nature-kit
- **Asset Pack**: Nature Kit (330 models)
- **License**: CC0 1.0 Universal (Public Domain)
- **Attribution**: Not required, but appreciated

#### Kenney Models (26/33):

**Trees (8 models)**:
- `tree_oak_01.glb` - Oak tree (temperate forest)
- `tree_pine_01.glb` - Pine tree (northern/mountain)
- `tree_palm_01.glb` - Palm tree (tropical)
- `tree_dead_01.glb` - Dead tree (wasteland)
- `tree_mushroom_01.glb` - Fantasy mushroom tree
- `shrub_small_01.glb` - Small shrub
- `bush_round_01.glb` - Round bush/hedge
- `grass_tufts_01.glb` - Grass tufts

**Rocks (6 models)**:
- `rock_large_01.glb` - Large boulder
- `rock_cluster_01.glb` - Rock cluster
- `rock_small_01.glb` - Small stones
- `rock_cliff_01.glb` - Cliff face
- `rock_crystal_01.glb` - Crystal formation
- `rock_desert_01.glb` - Desert rock

**Structures (5 models)**:
- `fence_01.glb` - Fence section
- `ruins_01.glb` - Ruined building
- `pillar_stone_01.glb` - Stone pillar
- `signpost_01.glb` - Signpost
- `bridge_01.glb` - Bridge section

**Environment (7 models)**:
- `flowers_01.glb` - Flower patches
- `vines_01.glb` - Vine growth
- `lily_water_01.glb` - Water lily
- `mushrooms_01.glb` - Mushroom cluster
- `rubble_01.glb` - Ruins/rubble
- `plant_generic_01.glb` - Generic plant

**Total Kenney Models**: 26 models
**Format**: GLB (glTF 2.0 Binary)
**Triangle Count**: 100-2,000 per model (optimized for real-time rendering)
**License**: CC0 1.0 Universal (Public Domain)
**Quality**: Production-grade, low-poly stylized, game-ready

---

### EdgeCraft Procedural Models (CC0 Public Domain)

For models not available in Kenney's Nature Kit, EdgeCraft uses simple procedural placeholders.

- **Generator**: `scripts/generate-all-doodads.py`
- **License**: CC0 1.0 Universal (Public Domain)
- **Author**: EdgeCraft Project
- **Format**: GLB (glTF 2.0 Binary)
- **Quality**: Alpha placeholder (simple geometric shapes)

#### Procedural Models (7/33):

**Structures (3 models)**:
- `crate_wood_01.glb` - Wooden crate (procedural box)
- `barrel_01.glb` - Barrel (procedural cylinder)
- `torch_01.glb` - Torch/lamp post (procedural)

**Environment (4 models)**:
- `bones_01.glb` - Bones/skull (procedural)
- `campfire_01.glb` - Campfire (procedural)
- `well_01.glb` - Well (procedural)

**Special (2 models)**:
- `placeholder_box.glb` - Placeholder for missing models
- `marker_small.glb` - Invisible marker/spawn point

**Total EdgeCraft Procedural Models**: 7 models
**Triangle Count**: 5-50 per model (minimal geometry)
**Status**: Alpha quality, suitable for placeholder use
**Future**: Can be replaced with proper models in Phase 3

---

## 📊 Asset Summary

| Category | Count | Source | License | Quality |
|----------|-------|--------|---------|---------|
| Terrain Textures | 19 types (57 files) | Polyhaven | CC0 1.0 | Production |
| Doodad Models (Real) | 26 models | Kenney.nl | CC0 1.0 | Production |
| Doodad Models (Procedural) | 7 models | EdgeCraft | CC0 1.0 | Alpha |
| **TOTAL** | **90 files** | Mixed | **100% CC0** | **Ready** |

---

## 🛡️ Legal Compliance

### Clean-Room Implementation

EdgeCraft is a **clean-room implementation** of Blizzard map format support. This means:

- ✅ **Zero Blizzard Entertainment source code**
- ✅ **Zero Blizzard Entertainment assets**
- ✅ **No decompilation or reverse engineering of Blizzard binaries**
- ✅ **Black-box format specification** (based on community documentation)
- ✅ **Original implementation** (written from scratch)

**Documentation Sources:**
- W3X format: http://www.wc3c.net/tools/specs/
- SC2 format: https://sc2mapster.gamepedia.com/
- Community forums and fan-made documentation

### No Blizzard Assets Included

EdgeCraft does **NOT** include any of the following:
- ❌ Warcraft 3 textures, models, or sounds
- ❌ StarCraft 2 textures, models, or sounds
- ❌ Blizzard game client files
- ❌ Blizzard proprietary MPQ/CASC archives
- ❌ Blizzard art assets (even as "inspiration")

All assets are sourced from **third-party CC0/Public Domain repositories** or **created procedurally**.

---

## 📜 License: CC0 1.0 Universal (Public Domain)

All third-party assets in EdgeCraft use the **CC0 1.0 Universal** license, which is the most permissive license available. This means:

### You are free to:
- ✅ **Use** for any purpose (personal, educational, commercial)
- ✅ **Copy, modify, distribute** without restriction
- ✅ **Use in closed-source projects** without attribution
- ✅ **Sell games** built with EdgeCraft and these assets
- ✅ **Bundle with commercial products**

### No requirements:
- ❌ No attribution required (though appreciated)
- ❌ No license file required
- ❌ No copyleft restrictions
- ❌ No trademark restrictions

### Full License Text:

```
Creative Commons Legal Code

CC0 1.0 Universal

    CREATIVE COMMONS CORPORATION IS NOT A LAW FIRM AND DOES NOT PROVIDE
    LEGAL SERVICES. DISTRIBUTION OF THIS DOCUMENT DOES NOT CREATE AN
    ATTORNEY-CLIENT RELATIONSHIP. CREATIVE COMMONS PROVIDES THIS
    INFORMATION ON AN "AS-IS" BASIS. CREATIVE COMMONS MAKES NO WARRANTIES
    REGARDING THE USE OF THIS DOCUMENT OR THE INFORMATION OR WORKS
    PROVIDED HEREUNDER, AND DISCLAIMS LIABILITY FOR DAMAGES RESULTING FROM
    THE USE OF THIS DOCUMENT OR THE INFORMATION OR WORKS PROVIDED
    HEREUNDER.

Statement of Purpose

The laws of most jurisdictions throughout the world automatically confer
exclusive Copyright and Related Rights (defined below) upon the creator
and subsequent owner(s) (each and all, an "owner") of an original work of
authorship and/or a database (each, a "Work").

Certain owners wish to permanently relinquish those rights to a Work for
the purpose of contributing to a commons of creative, cultural and
scientific works ("Commons") that the public can reliably and without fear
of later claims of infringement build upon, modify, incorporate in other
works, reuse and redistribute as freely as possible in any form whatsoever
and for any purposes, including without limitation commercial purposes.
These owners may contribute to the Commons to promote the ideal of a free
culture and the further production of creative, cultural and scientific
works, or to gain reputation or greater distribution for their Work in
part through the use and efforts of others.

For these and/or other purposes and motivations, and without any
expectation of additional consideration or compensation, the person
associating CC0 with a Work (the "Affirmer"), to the extent that he or she
is an owner of Copyright and Related Rights in the Work, voluntarily
elects to apply CC0 to the Work and publicly distribute the Work under its
terms, with knowledge of his or her Copyright and Related Rights in the
Work and the meaning and intended legal effect of CC0 on those rights.
```

For the full CC0 1.0 Universal license text, see: https://creativecommons.org/publicdomain/zero/1.0/legalcode

---

**Document Version**: 3.0
**Last Updated**: 2025-01-13
**PRP**: 2.12 (Legal Asset Library for Map Rendering)
**Status**: COMPLETE (100% CC0 compliance)
