# Validate Assets for Copyright Compliance

## Command Purpose
Scan all assets in the project to ensure no copyrighted content from Blizzard games is present. This is critical for legal compliance.

## Validation Process

1. **Scan Asset Directories**
   - Check `/src/assets/`
   - Check `/public/assets/`
   - Check any imported models or textures

2. **Validation Checks**
   - Compare file hashes against known copyrighted assets
   - Check file metadata for copyright strings
   - Verify all assets have proper attribution in `assets/LICENSES.md`
   - Ensure no Blizzard trademarks in filenames

3. **File Types to Check**
   - Images: .png, .jpg, .tga, .blp
   - Models: .mdx, .mdl, .m3, .gltf, .glb
   - Audio: .mp3, .ogg, .wav
   - Archives: .mpq, .casc

4. **Report Generation**
   Generate a validation report with:
   - Total assets scanned
   - Any violations found
   - Missing attribution
   - Recommended replacements

## Implementation Steps

1. Read all asset files recursively
2. Compute SHA-256 hashes
3. Check against blacklist of known copyrighted content
4. Extract and check metadata
5. Verify attribution file completeness
6. Generate detailed report

## Expected Output
```
Asset Validation Report
======================
Assets Scanned: 247
✅ No copyrighted content detected
✅ All assets have proper attribution
⚠️ 3 assets missing license information:
   - /assets/textures/grass_01.png
   - /assets/models/tree_02.gltf
   - /assets/audio/battle_01.ogg

Recommendation: Add license info for flagged assets
```

Always run this before commits and builds to ensure legal compliance.