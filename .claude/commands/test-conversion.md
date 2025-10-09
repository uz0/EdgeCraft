# Test Map Format Conversion

## Feature file: $ARGUMENTS

Test the conversion of a map file from Warcraft 3 or StarCraft format to Edge Craft's .edgestory format.

## Process

1. **Load Map File**
   - Parse the specified map file (.w3x, .w3m, .scm, .scx, or .SC2Map)
   - Extract all components (terrain, units, scripts, triggers)

2. **Validate Parsing**
   - Ensure all required sections are present
   - Check for parsing errors or unsupported features
   - Log any warnings about compatibility

3. **Asset Replacement**
   - Map all original assets to Edge Craft equivalents
   - Generate list of missing replacements
   - Use placeholder assets where necessary

4. **Convert to EdgeStory Format**
   - Transform terrain data to heightmap + texture layers
   - Convert units to entity definitions
   - Transpile scripts to TypeScript
   - Package into .edgestory format

5. **Verification**
   - Load the converted map
   - Render test scene
   - Compare with original for accuracy
   - Check performance metrics

## Test Scenarios
- Small melee map (2 players)
- Large campaign map (complex triggers)
- Custom map with many doodads
- Map with custom units/abilities

## Output Format
```
Map Conversion Test Results
==========================
Source: LostTemple.w3x
Output: LostTemple.edgestory

✅ Terrain: 100% converted
✅ Units: 47/50 converted (3 custom units need mapping)
✅ Scripts: Successfully transpiled to TypeScript
⚠️ Triggers: 2 complex triggers may need manual review
✅ Performance: Loads in 3.2s, renders at 60 FPS

Missing Asset Mappings:
- units/custom/DragonKnight.mdx -> Needs replacement
- units/custom/SiegeEngine.mdx -> Needs replacement
- abilities/custom/Firestorm.mdx -> Needs replacement

Conversion successful with warnings.
File saved to: output/LostTemple.edgestory
```

## Usage
```bash
/test-conversion maps/LostTemple.w3x
/test-conversion maps/BigGameHunters.scm
```

This command helps validate our format conversion pipeline and identify gaps in asset coverage.