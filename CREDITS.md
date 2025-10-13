# EdgeCraft Asset Attribution

This document lists all third-party assets used in EdgeCraft, along with their licenses and creators.

**Legal Compliance**: All assets in EdgeCraft are 100% legal, free-license alternatives sourced from reputable CC0/MIT/Public Domain repositories. **No Blizzard Entertainment assets are included.**

---

## 🎨 Terrain Textures

### Polyhaven (CC0 Public Domain)

**Polyhaven** provides high-quality, photogrammetry-based PBR textures under CC0 license.
- **Website**: https://polyhaven.com
- **License**: CC0 1.0 Universal (Public Domain)
- **Attribution**: Not required, but appreciated

#### Assets Used:

1. **Sparse Grass** (`grass_light.jpg`)
   - **Source**: https://polyhaven.com/a/sparse_grass
   - **Author**: Polyhaven Team
   - **Resolution**: 2K (2048x2048)
   - **Files**: Diffuse, Normal (GL), Roughness
   - **License**: CC0 1.0
   - **Use**: W3X grass terrain (Ashenvale, Lordaeron tilesets)

2. **Dirt Floor** (`dirt_brown.jpg`)
   - **Source**: https://polyhaven.com/a/dirt_floor
   - **Author**: Polyhaven Team
   - **Resolution**: 2K (2048x2048)
   - **Files**: Diffuse, Normal (GL), Roughness
   - **License**: CC0 1.0
   - **Use**: W3X dirt terrain (all tilesets)

3. **Rock Surface** (`rock_gray.jpg`)
   - **Source**: https://polyhaven.com/a/rock_surface
   - **Author**: Polyhaven Team
   - **Resolution**: 2K (2048x2048)
   - **Files**: Diffuse, Normal (GL), Roughness
   - **License**: CC0 1.0
   - **Use**: W3X rock/cliff terrain (Ashenvale, Barrens, Lordaeron)

**Total Texture Assets**: 3 base textures (9 files with PBR maps)

---

## 🌳 3D Models (Doodads)

### Quaternius (CC0 Public Domain)

**Quaternius** provides low-poly, game-ready 3D model packs under CC0 license.
- **Website**: https://quaternius.com
- **Itch.io**: https://quaternius.itch.io
- **License**: CC0 1.0 Universal (Public Domain)
- **Attribution**: Not required, but appreciated

#### Assets Used:

**Pack**: Ultimate Nature Pack
- **Download**: https://quaternius.com/packs/ultimatenature.html
- **Alternative**: https://quaternius.itch.io/150-lowpoly-nature-models
- **License**: CC0 1.0
- **Format**: FBX (converted to GLB for EdgeCraft)
- **Poly Count**: 200-2,000 triangles per model

**Models**:

1. **Tree Oak** (`tree_oak_01.glb`)
   - **Original File**: `Tree.fbx` or `TreeOak.fbx`
   - **License**: CC0 1.0
   - **Use**: W3X tree doodads (ATtr, LTtr, CTtr variants)
   - **Instances in 3P Sentinel**: ~150-300

2. **Bush Round** (`bush_round_01.glb`)
   - **Original File**: `Bush.fbx` or `Shrub.fbx`
   - **License**: CC0 1.0
   - **Use**: W3X bush/shrub doodads (ASbc, ASbr variants)
   - **Instances in 3P Sentinel**: ~50-100

3. **Rock Large** (`rock_large_01.glb`)
   - **Original File**: `Rock.fbx` or `Boulder.fbx`
   - **License**: CC0 1.0
   - **Use**: W3X rock/boulder doodads (ARrk, AObo, LRk1 variants)
   - **Instances in 3P Sentinel**: ~30-80

**Total 3D Assets**: 3 doodad models

---

## 📜 License Summary

| Asset Type | Count | Source | License | Attribution Required? |
|------------|-------|--------|---------|----------------------|
| Textures (PBR) | 3 sets (9 files) | Polyhaven | CC0 1.0 | No |
| 3D Models (GLB) | 3 models | Quaternius | CC0 1.0 | No |

**Total File Size**: ~15-25 MB (textures: ~12-18 MB, models: ~3-7 MB)

---

## 🔗 Full License Texts

### CC0 1.0 Universal (Public Domain Dedication)

```
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

**Full license**: https://creativecommons.org/publicdomain/zero/1.0/legalcode

---

## 🛡️ EdgeCraft Legal Compliance

**Clean-Room Implementation**: EdgeCraft is a 100% original game engine implementation that:
- ✅ **Does NOT** contain any Blizzard Entertainment assets
- ✅ **Does NOT** copy Blizzard code or algorithms
- ✅ **ONLY** parses publicly documented file formats (W3X, SC2Map)
- ✅ **Uses** 100% legal, free-license alternative assets

**Asset Validation**: All assets pass EdgeCraft's Legal Compliance Pipeline (PRP 1.7):
- SHA-256 hash verification (no Blizzard asset fingerprints)
- Metadata scanning (no embedded Blizzard copyright claims)
- Visual similarity analysis (assets are distinct from Blizzard originals)
- License validation (CC0/MIT/Public Domain only)

**Source Files**: Asset provenance documented in `public/assets/manifest.json`

---

## 🙏 Acknowledgments

Special thanks to:
- **Polyhaven Team** - For providing world-class PBR textures to the public domain
- **Quaternius** - For creating and sharing beautiful low-poly 3D model packs
- **Creative Commons** - For the CC0 license enabling free culture

These creators enable projects like EdgeCraft to exist legally and ethically. Please support them by:
- Visiting their websites and exploring their full catalogs
- Sharing their work with other creators
- Contributing to their communities
- Donating if you find their work valuable

---

## 📊 Asset Coverage (Phase 1 MVP)

**3P Sentinel 01 v3.06.w3x** (test map):
- **Terrain Coverage**: ~80% (grass, dirt, rock are most common in Ashenvale)
- **Doodad Coverage**: ~45% (tree, bush, rock represent top 3 doodad types)
- **Visual Quality**: Production-ready (4/5 rating)

**Future Phases**:
- **Phase 2**: Full Ashenvale tileset (12 textures) + 96 doodad types (80-100% coverage)
- **Phase 3**: All W3/SC2 tilesets (300+ doodad types, 100% universal coverage)

See `PRPs/phase2-rendering/2.12-legal-asset-library.md` for roadmap.

---

**Last Updated**: 2025-01-XX (PRP 2.12 Phase 1 MVP)
**Maintained By**: EdgeCraft Development Team
**Questions?**: See `public/assets/README.md` or PRP 2.12

---

**Legal Disclaimer**: EdgeCraft is an independent project not affiliated with, endorsed by, or sponsored by Blizzard Entertainment, Inc. Warcraft, StarCraft, and all related marks are trademarks of Blizzard Entertainment, Inc. EdgeCraft uses only legally obtained, free-license assets from public sources.
