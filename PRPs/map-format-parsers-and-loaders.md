# PRP: Map Format Parsers and Loaders

**Status**: 📋 Planned
**Created**: 2025-01-20
**Updated**: 2025-01-20

---

## 🎯 Goal / Description

**PRIMARY GOAL**: Extract complete game map archives (W3X, W3M, SC2Map) into structured JSON with typed interfaces and extracted assets (textures, models), enabling subsequent terrain and unit rendering without re-parsing compression layers.

**Business Value**:
- Single-pass extraction pipeline: MPQ → Decompression → Parsing → JSON + Assets
- Validated, typed data ready for Babylon.js rendering
- No need to revisit compression after initial extraction
- Foundation for rendering terrain geometry, textures, and units

**Success Definition**:
Render basic terrain (geometry + textures) and place units (with placeholder models if needed) for all three formats:
- **W3X** (Warcraft 3: The Frozen Throne)
- **W3M** (Warcraft 3: Reforged)
- **SC2Map** (StarCraft 2)

**Out of Scope**:
- Full feature parity (fog, weather, advanced effects)
- Trigger/script execution
- Campaign (W3N) support
- Audio/video extraction
- Locked/protected maps

---

## 📋 Definition of Ready (DoR)

**Prerequisites to START work:**

- [x] Babylon.js integrated and working
- [x] TypeScript configured (strict mode)
- [x] Build system operational (Vite)
- [x] Test framework ready (Jest + Playwright)
- [ ] Research completed on file format specifications
- [ ] Test maps acquired for all 3 formats (W3X, W3M, SC2Map)
- [ ] Legal compliance verified for test maps (no copyrighted content)
- [ ] Asset extraction strategy defined (textures, models)
- [ ] JSON schema designed for output format
- [ ] Dependencies identified (MPQ extraction, compression libs)

---

## ✅ Definition of Done (DoD)

**Deliverables to COMPLETE work:**

### Phase 1: MPQ Archive Extraction
- [ ] MPQ header parser (signature, version, offset tables)
- [ ] Hash table reader (file name hashing, collision handling)
- [ ] Block table reader (file offsets, sizes, flags)
- [ ] File extraction by name/index
- [ ] File list generation (enumerate all files in archive)
- [ ] Error handling for corrupted archives

### Phase 2: Decompression Pipeline
- [ ] Zlib decompression (RFC 1950/1951)
- [ ] Bzip2 decompression (Huffman coding)
- [ ] LZMA decompression (LZMA SDK integration)
- [ ] ADPCM audio decompression (for sound files)
- [ ] Sparse file decompression
- [ ] Multi-compression support (single file, multiple algorithms)
- [ ] Decompression validation (checksum verification)

### Phase 3: W3X/W3M Format Parsers
- [ ] **war3map.w3i** - Map Info (name, author, players, dimensions, tileset)
- [ ] **war3map.w3e** - Terrain (heightmap, textures, cliffs, water, pathing)
- [ ] **war3map.doo** - Doodads (trees, rocks, decorations with variations)
- [ ] **war3mapUnits.doo** - Units (placement, owner, type, rotation, custom properties)
- [ ] **war3map.w3c** - Cameras (optional, for cinematics)
- [ ] Version detection (classic v800 vs Reforged v1000+)
- [ ] Texture ID → File Path mapping (TerrainArt/Terrain.slk)
- [ ] Cliff texture mapping (TerrainArt/CliffTypes.slk)
- [ ] Unit/Doodad type → Model path mapping

### Phase 4: SC2Map Format Parsers
- [ ] **DocumentInfo** - Map metadata (XML parsing)
- [ ] **ComponentList.SC2Components** - Component registry (XML parsing)
- [ ] **t3Terrain.xml** - Terrain configuration
- [ ] **t3HeightMap.xxx** - Terrain height data
- [ ] **t3TextureMasks** - Texture blending masks
- [ ] **objects** - Unit/doodad placements
- [ ] Texture ID → DDS file path mapping
- [ ] Unit/Doodad type → M3 model path mapping

### Phase 5: Asset Extraction & Validation
- [ ] Texture extraction (BLP for W3, DDS for SC2)
- [ ] Model extraction (MDX/MDL for W3, M3 for SC2)
- [ ] Asset path resolution (relative → absolute)
- [ ] File integrity verification (magic numbers, headers)
- [ ] Asset inventory (JSON manifest of extracted files)
- [ ] Fallback strategy for missing assets

### Phase 6: JSON Output & TypeScript Types
- [ ] `RawMapData` interface fully populated
- [ ] `MapInfo` with all metadata fields
- [ ] `TerrainData` with heightmap, textures, water, cliffs
- [ ] `UnitPlacement[]` with positions, types, owners
- [ ] `DoodadPlacement[]` with positions, variations, scales
- [ ] JSON serialization of all parsed data
- [ ] TypeScript type validation (Zod or io-ts)

### Phase 7: Rendering Validation
- [ ] **W3X**: Render terrain geometry from heightmap
- [ ] **W3X**: Apply at least 2 terrain textures
- [ ] **W3X**: Place at least 5 units (placeholder models OK)
- [ ] **W3M**: Render terrain geometry (Reforged format)
- [ ] **W3M**: Apply at least 2 terrain textures
- [ ] **W3M**: Place at least 5 units (placeholder models OK)
- [ ] **SC2Map**: Render terrain geometry from heightmap
- [ ] **SC2Map**: Apply at least 2 terrain textures
- [ ] **SC2Map**: Place at least 5 units (placeholder models OK)

### Phase 8: Testing & Quality
- [ ] Unit tests for each parser (>80% coverage)
- [ ] Integration tests with real maps (1 W3X, 1 W3M, 1 SC2Map)
- [ ] Performance benchmarks (<2s total extraction per map)
- [ ] Error logging and diagnostics
- [ ] No TypeScript errors
- [ ] No ESLint warnings

---

## 🏗️ Implementation Breakdown

### Architecture: 4-Layer Pipeline

```
┌──────────────────────────────────────────────────────────────┐
│ Layer 1: ARCHIVE EXTRACTION (MPQ/CASC)                      │
│ Input:  .w3x / .w3m / .SC2Map file                          │
│ Output: Map<filename, compressedBuffer>                      │
│ Tools:  @wowserhq/stormjs, custom MPQ parser                │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ Layer 2: DECOMPRESSION                                       │
│ Input:  Map<filename, compressedBuffer>                      │
│ Output: Map<filename, rawBuffer>                             │
│ Tools:  pako (Zlib), seek-bzip (Bzip2), lzma-native (LZMA)  │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ Layer 3: FORMAT PARSING                                      │
│ Input:  Map<filename, rawBuffer>                             │
│ Output: RawMapData (TypeScript interfaces)                   │
│ Tools:  Custom binary parsers, xml2js (SC2 XML)             │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ Layer 4: ASSET EXTRACTION & VALIDATION                       │
│ Input:  RawMapData + asset buffers                           │
│ Output: JSON + /extracted/textures/, /extracted/models/      │
│ Tools:  File system APIs, asset validators                   │
└──────────────────────────────────────────────────────────────┘
```

### Module Structure

```
src/formats/
├── mpq/
│   ├── MPQParser.ts              # MPQ archive extraction
│   ├── StormJSAdapter.ts         # WASM StormLib wrapper
│   └── types.ts                  # MPQ header/table types
│
├── compression/
│   ├── ZlibDecompressor.ts       # RFC 1950/1951
│   ├── Bzip2Decompressor.ts      # Huffman coding
│   ├── LZMADecompressor.ts       # LZMA SDK
│   ├── ADPCMDecompressor.ts      # Audio compression
│   ├── SparseDecompressor.ts     # Sparse files
│   └── types.ts                  # Decompressor interfaces
│
├── maps/
│   ├── types.ts                  # RawMapData, MapInfo, etc.
│   │
│   ├── w3x/
│   │   ├── W3XMapLoader.ts       # Main W3X/W3M orchestrator
│   │   ├── W3IParser.ts          # Map info (war3map.w3i)
│   │   ├── W3EParser.ts          # Terrain (war3map.w3e)
│   │   ├── W3DParser.ts          # Doodads (war3map.doo)
│   │   ├── W3UParser.ts          # Units (war3mapUnits.doo)
│   │   ├── W3CParser.ts          # Cameras (war3map.w3c)
│   │   ├── SLKParser.ts          # Terrain.slk, CliffTypes.slk
│   │   └── types.ts              # W3X-specific types
│   │
│   ├── sc2/
│   │   ├── SC2MapLoader.ts       # Main SC2Map orchestrator
│   │   ├── SC2Parser.ts          # XML parsers (DocumentInfo, etc.)
│   │   ├── SC2TerrainParser.ts   # t3Terrain, heightmap, textures
│   │   ├── SC2UnitsParser.ts     # Objects/units parsing
│   │   └── types.ts              # SC2-specific types
│   │
│   └── MapLoaderRegistry.ts      # Auto-detect format, route to loader
│
└── assets/
    ├── TextureExtractor.ts       # BLP/DDS extraction
    ├── ModelExtractor.ts         # MDX/M3 extraction
    ├── AssetValidator.ts         # Magic number checks
    └── AssetManifest.ts          # Generate JSON inventory
```

### Key Binary Parsing Patterns

**Example: W3E Terrain Header**
```typescript
interface W3EHeader {
  magic: string;           // 'W3E!' (4 bytes)
  version: number;         // 11 (4 bytes, little-endian)
  tileset: string;         // 'A' (1 byte ASCII)
  customTileset: boolean;  // 0x00 or 0x01 (1 byte)
  groundTiles: number;     // Tile count (4 bytes)
  cliffTiles: number;      // Cliff count (4 bytes)
  mapWidth: number;        // Width in tiles (4 bytes)
  mapHeight: number;       // Height in tiles (4 bytes)
  centerOffsetX: number;   // Offset (4 bytes float)
  centerOffsetY: number;   // Offset (4 bytes float)
}

function parseW3EHeader(buffer: ArrayBuffer): W3EHeader {
  const view = new DataView(buffer);
  let offset = 0;

  const magic = String.fromCharCode(
    view.getUint8(offset++),
    view.getUint8(offset++),
    view.getUint8(offset++),
    view.getUint8(offset++)
  );
  if (magic !== 'W3E!') throw new Error(`Invalid W3E magic: ${magic}`);

  return {
    magic,
    version: view.getUint32(offset, true), offset += 4,
    tileset: String.fromCharCode(view.getUint8(offset++)),
    customTileset: view.getUint8(offset++) === 1,
    groundTiles: view.getUint32(offset, true), offset += 4,
    cliffTiles: view.getUint32(offset, true), offset += 4,
    mapWidth: view.getUint32(offset, true), offset += 4,
    mapHeight: view.getUint32(offset, true), offset += 4,
    centerOffsetX: view.getFloat32(offset, true), offset += 4,
    centerOffsetY: view.getFloat32(offset, true), offset += 4,
  };
}
```

**Example: Terrain Tile Parsing**
```typescript
interface TerrainTile {
  height: number;          // Ground height (2 bytes, signed)
  waterLevel: number;      // Water height (2 bytes, signed)
  flags: number;           // Tile flags (1 byte)
  groundTexture: number;   // Texture ID (4 bits)
  groundVariation: number; // Variation (4 bits)
  cliffTexture: number;    // Cliff texture (4 bits)
  cliffVariation: number;  // Cliff variation (4 bits)
  layerHeight: number;     // Layer height (4 bits)
}

function parseTerrain(buffer: ArrayBuffer, width: number, height: number): TerrainTile[] {
  const view = new DataView(buffer);
  const tiles: TerrainTile[] = [];
  let offset = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const groundHeight = view.getInt16(offset, true); offset += 2;
      const waterLevel = view.getInt16(offset, true); offset += 2;
      const flags = view.getUint8(offset++);

      const textureByte = view.getUint8(offset++);
      const groundTexture = textureByte & 0x0F;        // Lower 4 bits
      const groundVariation = (textureByte >> 4) & 0x0F; // Upper 4 bits

      const cliffByte = view.getUint8(offset++);
      const cliffTexture = cliffByte & 0x0F;
      const cliffVariation = (cliffByte >> 4) & 0x0F;

      const layerHeight = view.getUint8(offset++) & 0x0F;

      tiles.push({
        height: groundHeight,
        waterLevel,
        flags,
        groundTexture,
        groundVariation,
        cliffTexture,
        cliffVariation,
        layerHeight,
      });
    }
  }

  return tiles;
}
```

### Texture Mapping Strategy

**W3X/W3M: TerrainArt/Terrain.slk Parsing**
```typescript
// Terrain.slk is a tab-delimited text file inside War3.mpq
// Format: ID \t TextureFile \t TileSize \t ...
interface TerrainTextureMapping {
  [tileId: string]: {
    diffuse: string;    // e.g., "Ldrt" → "TerrainArt/Lordaeron/Ldrt.blp"
    normal?: string;
    scale: number;
  };
}

async function loadTerrainMappings(mpq: MPQArchive): Promise<TerrainTextureMapping> {
  const slkData = await mpq.extractFile('TerrainArt/Terrain.slk');
  const rows = parseSLK(slkData); // Tab-delimited parser

  const mappings: TerrainTextureMapping = {};
  for (const row of rows) {
    mappings[row.tileID] = {
      diffuse: `TerrainArt/${row.tileset}/${row.tileID}.blp`,
      scale: parseFloat(row.tileSize) || 128.0,
    };
  }
  return mappings;
}
```

**SC2: t3Terrain.xml Parsing**
```xml
<!-- t3Terrain.xml inside SC2Map archive -->
<Terrain>
  <TextureSet id="0" path="Assets/Textures/terrain_dirt.dds" />
  <TextureSet id="1" path="Assets/Textures/terrain_grass.dds" />
  <Layer texture="0" />
  <Layer texture="1" />
</Terrain>
```

```typescript
interface SC2TextureMapping {
  [textureId: number]: {
    path: string;      // DDS file path
    normalPath?: string;
  };
}

async function loadSC2Textures(xml: string): Promise<SC2TextureMapping> {
  const parsed = await parseXML(xml); // Use xml2js
  const mappings: SC2TextureMapping = {};

  for (const texSet of parsed.Terrain.TextureSet) {
    mappings[parseInt(texSet.$.id)] = {
      path: texSet.$.path,
      normalPath: texSet.$.normalPath,
    };
  }
  return mappings;
}
```

### Unit/Doodad Model Mapping

**W3X: UnitData.slk / DoodadData.slk**
```typescript
interface UnitModelMapping {
  [unitTypeId: string]: {
    model: string;      // e.g., "hfoo" → "Units/Human/Footman/Footman.mdx"
    scale: number;
    animations: string[];
  };
}

async function loadUnitModels(mpq: MPQArchive): Promise<UnitModelMapping> {
  const unitData = await mpq.extractFile('Units/UnitData.slk');
  const rows = parseSLK(unitData);

  const mappings: UnitModelMapping = {};
  for (const row of rows) {
    mappings[row.unitID] = {
      model: row.file,
      scale: parseFloat(row.scale) || 1.0,
      animations: row.animNames.split(','),
    };
  }
  return mappings;
}
```

**SC2: GameData XML**
```typescript
interface SC2UnitModelMapping {
  [unitTypeId: string]: {
    model: string;      // M3 model path
    scale: number;
  };
}

async function loadSC2UnitModels(gameData: string): Promise<SC2UnitModelMapping> {
  const parsed = await parseXML(gameData);
  const mappings: SC2UnitModelMapping = {};

  for (const unit of parsed.Catalog.CUnit) {
    mappings[unit.$.id] = {
      model: unit.Actor?.[0]?.Model || 'placeholder.m3',
      scale: parseFloat(unit.Scale?.[0] || '1.0'),
    };
  }
  return mappings;
}
```

---

## ⏱️ Timeline

**Target Completion**: 4 weeks (20 working days)

### Week 1: Foundation (Days 1-5)
- **Day 1-2**: MPQ extraction implementation + unit tests
- **Day 3-4**: Decompression pipeline (Zlib, Bzip2, LZMA) + unit tests
- **Day 5**: Integration tests with sample archives

### Week 2: W3X/W3M Parsers (Days 6-10)
- **Day 6**: W3I (map info) + W3E header parsing
- **Day 7**: W3E terrain tiles + heightmap generation
- **Day 8**: W3D (doodads) + W3U (units) parsing
- **Day 9**: TerrainArt/Terrain.slk texture mapping
- **Day 10**: Unit/Doodad model mapping + version detection

### Week 3: SC2Map Parsers (Days 11-15)
- **Day 11**: XML parsers (DocumentInfo, ComponentList)
- **Day 12**: t3Terrain.xml + heightmap parsing
- **Day 13**: t3TextureMasks + texture blending
- **Day 14**: Objects/units parsing
- **Day 15**: Model/texture path resolution

### Week 4: Integration & Validation (Days 16-20)
- **Day 16**: Asset extraction pipeline (textures, models)
- **Day 17**: JSON output + TypeScript type validation
- **Day 18**: Render validation (terrain geometry + textures for all 3 formats)
- **Day 19**: Unit placement rendering (placeholder models)
- **Day 20**: Final testing, documentation, DoD checklist

---

## 🧪 Quality Gates (AQA)

**Required checks before marking complete:**

### Code Quality
- [ ] TypeScript strict mode: 0 errors
- [ ] ESLint: 0 errors, 0 warnings
- [ ] Unit test coverage: >80% (target: 85%)
- [ ] All public APIs documented (JSDoc)
- [ ] No files >500 lines (split into modules)

### Functional Validation
- [ ] **W3X Map**: Parse [MeltedCrown.w3x](https://example.com) successfully
- [ ] **W3M Map**: Parse [ReforgedCampaign.w3m](https://example.com) successfully
- [ ] **SC2Map**: Parse [LostTemple.SC2Map](https://example.com) successfully
- [ ] All 3 formats render terrain geometry (no errors)
- [ ] All 3 formats display at least 2 textures correctly
- [ ] All 3 formats place at least 5 units (visible in scene)

### Performance Benchmarks
- [ ] MPQ extraction: <500ms per archive (avg)
- [ ] Decompression: <1s per map (total)
- [ ] Parsing: <500ms per map (total)
- [ ] Asset extraction: <1s per map (total)
- [ ] **Total pipeline: <3s per map** (from .w3x to JSON + assets)

### Error Handling
- [ ] Corrupted archive detection (magic number validation)
- [ ] Missing file handling (fallback to defaults)
- [ ] Invalid format version warnings
- [ ] Decompression errors logged with context
- [ ] Graceful degradation (render with partial data if needed)

---

## 📖 User Stories

### US-1: Map Preview Generation
**As a** player
**I want** to load any W3X/W3M/SC2Map file
**So that** I can preview the terrain and unit placements before playing

**Acceptance Criteria:**
- [ ] Drag-and-drop .w3x file → terrain renders in <3s
- [ ] Terrain textures display correctly (no placeholder textures)
- [ ] Units appear at correct positions (even with placeholder models)
- [ ] Map metadata shown (name, author, dimensions)

### US-2: Asset Extraction for Modding
**As a** modder
**I want** to extract all textures and models from a map
**So that** I can reuse assets in my custom maps (legally compliant)

**Acceptance Criteria:**
- [ ] CLI command: `npm run extract-assets <map.w3x>` → `/extracted/` folder
- [ ] JSON manifest lists all extracted files
- [ ] Textures converted to web-friendly formats (BLP→PNG, DDS→PNG)
- [ ] Models remain in original format (MDX, M3) for later parsing

### US-3: Cross-Format Compatibility
**As a** developer
**I want** unified `RawMapData` output for all formats
**So that** rendering engine doesn't need format-specific logic

**Acceptance Criteria:**
- [ ] W3X, W3M, SC2Map all output same `RawMapData` interface
- [ ] Renderer receives `TerrainData` with standard heightmap format
- [ ] Unit/Doodad arrays follow same `UnitPlacement` interface
- [ ] Format differences abstracted away (e.g., texture path normalization)

---

## 🔬 Research / Related Materials

### Primary Specifications

**W3X/W3M Format:**
- [WC3MapSpecification](https://github.com/ChiefOfGxBxL/WC3MapSpecification) - Living document of .w3x structure
- [W3X Files Format](https://867380699.github.io/blog/2019/05/09/W3X_Files_Format) - Chinese blog with detailed binary layouts
- [WC3MapTranslator](https://github.com/ChiefOfGxBxL/WC3MapTranslator) - TypeScript reference implementation
- [HiveWE Wiki](https://github.com/stijnherfst/HiveWE/wiki/war3map.w3e-Terrain) - war3map.w3e specification

**SC2Map Format:**
- [SC2Mapster Wiki](https://sc2mapster.fandom.com/wiki/MPQ) - MPQ/CASC documentation
- [ComponentList.SC2Components](https://github.com/FabianPonce/CortexToolkit/blob/master/ComponentList.SC2Components) - XML structure examples
- [S2Editor Guides](https://s2editor-guides.readthedocs.io/) - Terrain, texture, unit documentation

**MPQ Archive Format:**
- [MPQ Format Specification](http://www.zezula.net/en/mpq/mpqformat.html) - Ladislav Zezula's authoritative spec
- [StormLib](https://github.com/ladislav-zezula/StormLib) - C++ reference implementation
- [MPQ Wiki](https://wowdev.wiki/MPQ) - WoW developers' reverse-engineering notes

**Model Formats:**
- [mdx-m3-viewer](https://github.com/flowtsohg/mdx-m3-viewer) - WebGL viewer for MDX/M3 (reference parser)
- [war3-model](https://github.com/4eb0da/war3-model) - TypeScript MDX/MDL converter
- [MDX File Format](https://wiki.hiveworkshop.com/index.php/MDX_File_Format) - Binary structure documentation

### Dependencies

**NPM Packages:**
```json
{
  "@wowserhq/stormjs": "^1.0.0",        // WASM MPQ extraction
  "pako": "^2.1.0",                     // Zlib decompression
  "seek-bzip": "^2.0.0",                // Bzip2 decompression
  "lzma-native": "^8.0.6",              // LZMA decompression (Node.js only)
  "xml2js": "^0.6.0",                   // SC2 XML parsing
  "wc3maptranslator": "^2.7.0"          // Reference parser (study only)
}
```

**Asset Processing:**
```json
{
  "blp2png": "^1.0.0",                  // BLP texture conversion (if needed)
  "dds-parser": "^0.2.0"                // DDS validation
}
```

### High-Level Design Decisions

**ADR-1: Use StormJS for MPQ Extraction**
- **Decision**: Use `@wowserhq/stormjs` (WASM-compiled StormLib) instead of pure JS implementation
- **Rationale**: StormLib is battle-tested, supports all MPQ versions, handles CASC (SC2), faster than JS
- **Trade-off**: WASM dependency, but acceptable for Node.js + modern browsers

**ADR-2: Binary Parsing Without Dependencies**
- **Decision**: Write custom binary parsers using `DataView` instead of using `wc3maptranslator` directly
- **Rationale**: Learning exercise, no external bugs, full control, TypeScript-first design
- **Trade-off**: More code, but better understanding and maintainability

**ADR-3: Asset Extraction to File System**
- **Decision**: Extract textures/models to `/public/extracted/` during parsing
- **Rationale**: Babylon.js needs URLs to load textures/models, in-memory blobs harder to manage
- **Trade-off**: Disk I/O overhead, but simplifies rendering pipeline

**ADR-4: Unified RawMapData Interface**
- **Decision**: All loaders output same `RawMapData` structure (defined in `src/formats/maps/types.ts`)
- **Rationale**: Renderer format-agnostic, easier testing, future formats (SCM, etc.) slot in easily
- **Trade-off**: Some format-specific data lost, but acceptable for rendering use case

### Code References

**Existing Code:**
- `src/formats/mpq/MPQParser.ts` - MPQ archive extraction (exists)
- `src/formats/compression/` - Decompression algorithms (exists)
- `src/formats/maps/types.ts` - TypeScript interfaces (exists)
- `src/formats/maps/w3x/` - W3X parsers (partial implementation exists)
- `src/formats/maps/sc2/` - SC2 parsers (partial implementation exists)

**New Code to Write:**
- `src/formats/maps/w3x/SLKParser.ts` - Terrain.slk / UnitData.slk parser
- `src/formats/maps/w3x/W3CParser.ts` - Camera parser (optional)
- `src/formats/maps/sc2/SC2TerrainParser.ts` - Heightmap + texture masks
- `src/formats/maps/sc2/SC2UnitsParser.ts` - Object placements
- `src/formats/assets/TextureExtractor.ts` - BLP/DDS extraction
- `src/formats/assets/ModelExtractor.ts` - MDX/M3 extraction
- `src/formats/assets/AssetManifest.ts` - JSON inventory generator

---

## 📊 Progress Tracking

| Date       | Role           | Change Made                          | Status   |
|------------|----------------|--------------------------------------|----------|
| 2025-01-20 | System Analyst | Initial PRP creation                 | Planned  |
| TBD        | Developer      | MPQ parser implementation            | Pending  |
| TBD        | Developer      | Decompression pipeline               | Pending  |
| TBD        | Developer      | W3X parsers (W3I, W3E, W3D, W3U)    | Pending  |
| TBD        | Developer      | SC2 parsers (XML, terrain, units)    | Pending  |
| TBD        | Developer      | Asset extraction pipeline            | Pending  |
| TBD        | AQA            | Unit tests + integration tests       | Pending  |
| TBD        | Developer      | Rendering validation (all 3 formats) | Pending  |

**Current Blockers**: None (DoR incomplete, research needed)

**Next Steps**:
1. Complete DoR checklist (acquire test maps, finalize JSON schema)
2. Transition to 🔬 Research phase (detailed format spec review)
3. Begin Week 1: MPQ + Decompression implementation

---

## 📊 Success Metrics

**How do we measure success?**

### Parsing Metrics
- **Format Coverage**: 3/3 formats supported (W3X, W3M, SC2Map) ✅ 100%
- **Compression Support**: 5/5 algorithms (Zlib, Bzip2, LZMA, ADPCM, Sparse) ✅ 100%
- **Parser Accuracy**: >95% of files in test maps parsed without errors
- **Asset Extraction**: 100% of referenced textures/models extracted

### Rendering Metrics
- **Terrain Rendering**: 3/3 formats render geometry correctly
- **Texture Rendering**: ≥2 textures visible per map
- **Unit Placement**: ≥5 units placed correctly per map
- **Visual Fidelity**: Terrain matches original game visually (manual QA)

### Performance Metrics
- **Pipeline Speed**: <3s total (extraction → JSON + assets)
- **Memory Usage**: <500MB peak per map
- **Test Coverage**: >80% unit tests (target: 85%)

### Quality Metrics
- **TypeScript Errors**: 0 (strict mode)
- **ESLint Warnings**: 0
- **File Size**: No file >500 lines
- **Documentation**: 100% of public APIs documented (JSDoc)

---

## 🧪 Testing Evidence

**Unit Tests** (Target: 85% coverage)
```
src/formats/mpq/MPQParser.unit.ts         - MPQ extraction
src/formats/compression/*.unit.ts         - All decompressors
src/formats/maps/w3x/W3EParser.unit.ts    - Terrain parsing
src/formats/maps/w3x/W3UParser.unit.ts    - Unit parsing
src/formats/maps/sc2/SC2TerrainParser.unit.ts - SC2 terrain
tests/*.test.ts                           - E2E map loading
```

**Integration Tests** (Real Maps)
- **W3X**: `public/maps/test/MeltedCrown.w3x` (1v1, classic)
- **W3M**: `public/maps/test/ReforgedCampaign.w3m` (Reforged)
- **SC2Map**: `public/maps/test/LostTemple.SC2Map` (ladder map)

**Manual QA Checklist**
- [ ] W3X terrain matches WC3 in-game appearance
- [ ] W3M terrain matches Reforged in-game appearance
- [ ] SC2Map terrain matches SC2 in-game appearance
- [ ] Units placed at correct coordinates (verified in editor)
- [ ] Texture IDs resolved to correct file paths
- [ ] No visual artifacts (missing textures, Z-fighting)

---

## 📈 Review & Approval

**System Analyst Sign-Off:**
- [ ] DoR complete and validated
- [ ] DoD comprehensive and measurable
- [ ] User stories cover all requirements
- [ ] Success metrics defined
- Date: TBD

**AQA Sign-Off:**
- [ ] Quality gates defined
- [ ] Test strategy approved
- [ ] Performance benchmarks realistic
- Date: TBD

**Developer Sign-Off:**
- [ ] Architecture reviewed
- [ ] Technical feasibility confirmed
- [ ] Dependencies available
- [ ] Timeline realistic
- Date: TBD

---

## 🚪 Exit Criteria

**What signals work is DONE?**

### Code Complete
- [x] All DoD items checked (100% complete)
- [x] All unit tests passing (>80% coverage)
- [x] All integration tests passing (3 maps)
- [x] All ESLint/TypeScript checks passing

### Rendering Validated
- [x] W3X: Terrain geometry + textures + units rendered
- [x] W3M: Terrain geometry + textures + units rendered
- [x] SC2Map: Terrain geometry + textures + units rendered
- [x] Visual QA passed (manual comparison to original games)

### Documentation Complete
- [x] All public APIs documented (JSDoc)
- [x] README.md updated with usage examples
- [x] PRP Progress Tracking table up-to-date
- [x] Testing Evidence section complete

### Performance Validated
- [x] All benchmarks met (<3s pipeline, <500MB memory)
- [x] No memory leaks (tested with 10+ map loads)

### Final Approval
- [x] Code review approved (peer review)
- [x] AQA sign-off (quality gates passed)
- [x] System Analyst sign-off (requirements met)
- [x] PRP status updated to ✅ Complete

---

## 🔄 Migration Notes

**Changes from Previous PRP:**
1. **Scope Narrowed**: Removed W3N (campaign) support - focus on single maps only
2. **Goal Clarified**: "Extract to JSON + assets for rendering" (not just "parse formats")
3. **Rendering Validation Added**: DoD now includes rendering terrain + units for all 3 formats
4. **Asset Extraction Emphasized**: New Phase 5 for texture/model extraction
5. **Research Expanded**: Added 15+ new specification links, model format docs
6. **Timeline Realistic**: 4 weeks instead of vague "2 weeks" (based on scope)
7. **Success Metrics Quantified**: Specific rendering targets (≥2 textures, ≥5 units)
8. **W3U Parser Blocker Removed**: Starting fresh with correct binary parsing approach

**Retained from Previous PRP:**
- MPQ + decompression foundation (working code exists)
- TypeScript types in `src/formats/maps/types.ts`
- Unit test framework (Jest)
- Integration test maps (W3X, W3M, SC2Map samples)

---

## 📝 Notes

### Important Considerations

1. **Version Detection**: W3X format has multiple versions (v800 classic, v1000+ Reforged). Must detect version from header and adjust parsing logic.

2. **Missing Assets**: Not all maps include custom textures/models. Fall back to default paths (e.g., `Units/Human/Footman/Footman.mdx`).

3. **SLK Parsing Complexity**: Terrain.slk uses tab-delimited format with row/column addressing. Consider using CSV parser with custom delimiter.

4. **SC2 Protected Maps**: Some SC2Map files published to Battle.net have encrypted/missing files (Triggers, ComponentList). Log warning and skip these.

5. **BLP Texture Format**: Warcraft 3 uses BLP (proprietary format). May need conversion to PNG/DDS for WebGL. Consider using `blp2png` or native JS decoder.

6. **MDX Model Format**: Warcraft 3 models (MDX) require separate parser (not in scope for this PRP). Use placeholder cubes for units initially.

7. **M3 Model Format**: StarCraft 2 models (M3) also require separate parser. Use placeholder models initially.

8. **CASC vs MPQ**: StarCraft 2 switched from MPQ to CASC in 2015. Older SC2Map files may use MPQ. StormJS handles both.

9. **Legal Compliance**: Extracted assets must be validated for licenses. Do not redistribute Blizzard copyrighted textures/models.

10. **Performance**: Decompression is CPU-intensive. Consider Web Workers for parallel decompression (future optimization).

### Related PRPs

- **PRP: Bootstrap Development Environment** (✅ Complete) - Build system, TypeScript, testing framework
- **PRP: Map Preview and Basic Rendering** (🟡 Next) - Babylon.js terrain rendering using parsed data

---

## 🔍 Technical Specifications (Detailed Binary Formats)

### W3X Map File Structure

**512-Byte Header:**
```typescript
interface W3XHeader {
  magic: string;         // 'HM3W' (4 bytes)
  unknown: number;       // 4 bytes (purpose unknown)
  mapName: string;       // Variable length, null-terminated
  flags: number;         // 4 bytes (bitwise flags)
  maxPlayers: number;    // 4 bytes
  // Padding to 512 bytes
}
```

**Map Flags (32-bit bitfield):**
```typescript
enum MapFlags {
  HIDE_MINIMAP        = 0x0001,  // Hide minimap on preview
  MODIFY_PRIORITIES   = 0x0002,  // Modify ally priorities
  MELEE_MAP           = 0x0004,  // Melee map
  LARGE_PLAYABLE      = 0x0008,  // Large playable area
  MASKED_VISIBLE      = 0x0010,  // Partially visible masked regions
  FIXED_PLAYERS       = 0x0020,  // Fixed player parameters
  CUSTOM_TEAMS        = 0x0040,  // Custom teams enabled
  CUSTOM_TECH_TREE    = 0x0080,  // Custom technology tree
  CUSTOM_ABILITIES    = 0x0100,  // Custom abilities
  CUSTOM_UPGRADES     = 0x0200,  // Custom upgrades
  PROPERTIES_OPENED   = 0x0400,  // Map properties opened once
  WAVES_CLIFF_SHORES  = 0x0800,  // Show waves on cliff shores
  WAVES_ROLLING       = 0x1000,  // Show waves on gradual shores
}
```

### war3map.w3e Terrain Format

**Terrain Header:**
```typescript
interface W3EHeader {
  magic: string;           // 'W3E!' (4 bytes)
  version: number;         // 11 (4 bytes, little-endian)
  tileset: string;         // 'A', 'L', etc. (1 byte ASCII)
  customTileset: boolean;  // 0x00 or 0x01 (1 byte)
  groundTiles: number;     // Tile count (4 bytes)
  cliffTiles: number;      // Cliff count (4 bytes)
  mapWidth: number;        // Width in tiles (4 bytes)
  mapHeight: number;       // Height in tiles (4 bytes)
  centerOffsetX: number;   // Offset (4 bytes float)
  centerOffsetY: number;   // Offset (4 bytes float)
}
```

**Terrain Tile (7 bytes per tile):**
```typescript
interface W3ETile {
  // Bytes 0-1: Ground height (little-endian int16)
  height: number;          // -16384 to +16383, 8192 = sea level

  // Byte 2: Water height + boundary flag (int16, upper 2 bits = boundary)
  waterLevel: number;      // Water depth/height
  boundaryFlag: number;    // Edge detection (bits 15-14)

  // Byte 4: Flags (4 bits) + Texture ID (4 bits)
  flags: number;           // 0x1=ramp, 0x2=corruption, 0x4=water, 0x8=boundary
  groundTexture: number;   // Texture ID (0-15)

  // Byte 5: Texture variation (4 bits) + Water type (4 bits)
  groundVariation: number; // Texture variation (0-15)
  waterType: number;       // Water depth type

  // Byte 6: Cliff texture (4 bits) + Layer height (4 bits)
  cliffTexture: number;    // Cliff material ID
  layerHeight: number;     // Height layer (0-15)
}

// Binary parsing:
function parseW3ETile(view: DataView, offset: number): W3ETile {
  const height = view.getInt16(offset, true);         // Offset 0-1
  const waterLevel = view.getInt16(offset + 2, true); // Offset 2-3
  const boundaryFlag = (waterLevel >> 14) & 0x03;

  const flags = view.getUint8(offset + 4) & 0x0F;
  const groundTexture = (view.getUint8(offset + 4) >> 4) & 0x0F;

  const waterType = view.getUint8(offset + 5) & 0x0F;
  const groundVariation = (view.getUint8(offset + 5) >> 4) & 0x0F;

  const cliffTexture = view.getUint8(offset + 6) & 0x0F;
  const layerHeight = (view.getUint8(offset + 6) >> 4) & 0x0F;

  return {
    height,
    waterLevel: waterLevel & 0x3FFF, // Mask out boundary bits
    boundaryFlag,
    flags,
    groundTexture,
    groundVariation,
    waterType,
    cliffTexture,
    layerHeight,
  };
}
```

**Height Constants:**
- Minimum height: `-16384` (0xC000)
- Maximum height: `+16383` (0x3FFF)
- Ground zero: `8192` (0x2000)
- Water level default: `512` (0x0200)

**File Size:** `7 bytes × width × height` (after header)

### war3map.doo Doodad Format

**Doodad Header:**
```typescript
interface W3DHeader {
  magic: string;         // 'W3do' (4 bytes)
  version: number;       // ≥8 = TFT (4 bytes)
  subversion: number;    // 0x0000000B (4 bytes)
  doodadCount: number;   // Number of doodads (4 bytes)
}
```

**Doodad Entry (Variable Length):**
```typescript
interface Doodad {
  id: string;            // 4-byte ID (e.g., 'LTlt' = large tree)
  variation: number;     // Variation index (4 bytes)
  position: {
    x: number;           // Float (4 bytes)
    y: number;           // Float (4 bytes)
    z: number;           // Float (4 bytes)
  };
  rotation: number;      // Radians (4 bytes float)
  scale: {
    x: number;           // Float (4 bytes)
    y: number;           // Float (4 bytes)
    z: number;           // Float (4 bytes)
  };
  skinId?: string;       // 4 bytes (Reforged v1.32+, check w3i version!)
  flags: number;         // 1 byte (bitfield)
  life: number;          // 1 byte (0x64 = 100%)
  itemTable: number;     // 4 bytes (-1 = none)
  itemSetCount: number;  // 4 bytes
  itemSets?: ItemSet[];  // Variable length
  editorId: number;      // 4 bytes (World Editor ID)
}

interface ItemSet {
  itemsInSet: number;    // 4 bytes
  items: Array<{
    id: string;          // 4 bytes
    dropChance: number;  // 4 bytes (percentage)
  }>;
}
```

**Doodad Flags (1 byte bitfield):**
```typescript
enum DoodadFlags {
  OUTSIDE_PLAYABLE  = 0x01,  // Outside playable area
  EXCLUDE_SCRIPT    = 0x02,  // Excluded from script
  RETAIN_Z          = 0x04,  // Retain Z when moving
}
```

**Special Doodads (Terrain Doodads):**
```typescript
interface SpecialDoodad {
  id: string;            // 4 bytes
  variation: number;     // 4 bytes (unused, typically 0)
  x: number;             // 4 bytes (integer grid cells, not float!)
  y: number;             // 4 bytes (integer grid cells, not float!)
}

// Special doodads header
interface SpecialDoodadHeader {
  version: number;       // Always 0x00000000 (4 bytes)
  count: number;         // Number of special doodads (4 bytes)
}
```

**Binary Parsing Example:**
```typescript
function parseDoodad(view: DataView, offset: number, isReforged: boolean): Doodad {
  let pos = offset;

  const id = String.fromCharCode(
    view.getUint8(pos++), view.getUint8(pos++),
    view.getUint8(pos++), view.getUint8(pos++)
  );

  const variation = view.getUint32(pos, true); pos += 4;
  const x = view.getFloat32(pos, true); pos += 4;
  const y = view.getFloat32(pos, true); pos += 4;
  const z = view.getFloat32(pos, true); pos += 4;
  const rotation = view.getFloat32(pos, true); pos += 4;
  const scaleX = view.getFloat32(pos, true); pos += 4;
  const scaleY = view.getFloat32(pos, true); pos += 4;
  const scaleZ = view.getFloat32(pos, true); pos += 4;

  let skinId: string | undefined;
  if (isReforged) {
    skinId = String.fromCharCode(
      view.getUint8(pos++), view.getUint8(pos++),
      view.getUint8(pos++), view.getUint8(pos++)
    );
  }

  const flags = view.getUint8(pos++);
  const life = view.getUint8(pos++);
  const itemTable = view.getInt32(pos, true); pos += 4;
  const itemSetCount = view.getUint32(pos, true); pos += 4;

  // Parse item sets if present
  const itemSets: ItemSet[] = [];
  for (let i = 0; i < itemSetCount; i++) {
    const itemsInSet = view.getUint32(pos, true); pos += 4;
    const items: Array<{ id: string; dropChance: number }> = [];

    for (let j = 0; j < itemsInSet; j++) {
      const itemId = String.fromCharCode(
        view.getUint8(pos++), view.getUint8(pos++),
        view.getUint8(pos++), view.getUint8(pos++)
      );
      const dropChance = view.getUint32(pos, true); pos += 4;
      items.push({ id: itemId, dropChance });
    }

    itemSets.push({ itemsInSet, items });
  }

  const editorId = view.getUint32(pos, true); pos += 4;

  return {
    id,
    variation,
    position: { x, y, z },
    rotation,
    scale: { x: scaleX, y: scaleY, z: scaleZ },
    skinId,
    flags,
    life,
    itemTable,
    itemSetCount,
    itemSets: itemSetCount > 0 ? itemSets : undefined,
    editorId,
  };
}
```

### war3mapUnits.doo Unit Format

**CRITICAL**: As of Reforged v1.32, units have a `skinId` field that was added WITHOUT incrementing the version number. You MUST check `war3map.w3i` game version to know if skinId exists!

**Unit Header:**
```typescript
interface UnitHeader {
  magic: string;         // 'W3do' (4 bytes) - same as doodads!
  version: number;       // Version (4 bytes)
  subversion: number;    // Subversion (4 bytes)
  unitCount: number;     // Number of units (4 bytes)
}
```

**Unit Entry (Variable Length):**
```typescript
interface Unit {
  id: string;            // 4 bytes (e.g., 'hfoo' = human footman)
  variation: number;     // 4 bytes (unused for units, typically 0)
  position: {
    x: number;           // Float (4 bytes)
    y: number;           // Float (4 bytes)
    z: number;           // Float (4 bytes)
  };
  rotation: number;      // Radians (4 bytes float)
  scale: {
    x: number;           // Float (4 bytes)
    y: number;           // Float (4 bytes)
    z: number;           // Float (4 bytes)
  };
  skinId?: string;       // 4 bytes (ONLY if w3i version ≥ 1.32!)
  flags: number;         // 1 byte
  owner: number;         // 4 bytes (player ID)
  unknown1: number;      // 2 bytes
  unknown2: number;      // 2 bytes
  health: number;        // 4 bytes (-1 = default)
  mana: number;          // 4 bytes (-1 = default)
  itemTable: number;     // 4 bytes (-1 = none)
  itemSets?: ItemSet[];  // Variable length
  gold: number;          // 4 bytes
  targetAcquisition: number; // 4 bytes
  heroLevel: number;     // 4 bytes
  heroStrength: number;  // 4 bytes
  heroAgility: number;   // 4 bytes
  heroIntelligence: number; // 4 bytes
  itemsInInventory: number; // 4 bytes
  inventoryItems?: Array<{
    slot: number;        // 4 bytes
    id: string;          // 4 bytes
  }>;
  modifiedAbilities: number; // 4 bytes
  abilities?: Array<{
    id: string;          // 4 bytes
    active: boolean;     // 4 bytes (0 = inactive, 1 = active)
    level: number;       // 4 bytes
  }>;
  randomFlag: number;    // 4 bytes
  customColor: number;   // 4 bytes (0-23, or 0xFFFFFFFF = no color)
  waygate: number;       // 4 bytes
  editorId: number;      // 4 bytes
}
```

**Version Detection Strategy:**
```typescript
// Read war3map.w3i to get game version
function isReforgedMap(w3iData: MapInfo): boolean {
  // Check if map was saved with Reforged (version ≥ 1.32)
  return w3iData.gameVersion >= 32; // Version format: major*10 + minor
}

// Use version to parse units correctly
const isReforged = isReforgedMap(mapInfo);
const unit = parseUnit(buffer, offset, isReforged);
```

### BLP Texture Format

**BLP Header (108+ bytes):**
```typescript
interface BLPHeader {
  magic: string;         // 'BLP1' (4 bytes)
  compression: number;   // 0x00 = palette, 0x01 = JPEG (4 bytes)
  alphaBits: number;     // 0x00000008 = has alpha, 0x00000000 = no alpha (4 bytes)
  width: number;         // Image width (4 bytes)
  height: number;        // Image height (4 bytes)
  alphaType: number;     // Alpha channel type (4 bytes, values 3-5)
  hasMipmaps: number;    // Always 0x00000001 (4 bytes)
  mipmapOffsets: number[]; // 16 × 4 bytes (offset for each mipmap level)
  mipmapSizes: number[];   // 16 × 4 bytes (size of each mipmap level)
}
```

**Palette BLP:**
```typescript
// After header: 256 BGRA colors (1024 bytes)
interface BLPPalette {
  colors: Array<{
    b: number;           // Blue (1 byte)
    g: number;           // Green (1 byte)
    r: number;           // Red (1 byte)
    a: number;           // Alpha (1 byte, 0 = transparent)
  }>;
  // Followed by: pixel indices (1 byte per pixel)
  // Followed by: alpha indices (1 byte per pixel) if alphaBits > 0
}
```

**JPEG BLP:**
```typescript
// After header: JPEG header bytes
// Followed by: compressed JPEG data at mipmapOffsets[0]
// Can be extracted and saved as .jpg directly
```

### Data Type Reference

| Type | Size | Encoding | Range |
|------|------|----------|-------|
| `int8` | 1 byte | Signed | -128 to 127 |
| `uint8` | 1 byte | Unsigned | 0 to 255 |
| `int16` | 2 bytes | Little-endian signed | -32768 to 32767 |
| `uint16` | 2 bytes | Little-endian unsigned | 0 to 65535 |
| `int32` | 4 bytes | Little-endian signed | -2147483648 to 2147483647 |
| `uint32` | 4 bytes | Little-endian unsigned | 0 to 4294967295 |
| `float` | 4 bytes | IEEE 754 little-endian | ±3.4e±38 |
| `char[4]` | 4 bytes | ASCII characters | - |
| `string` | Variable | UTF-8, null-terminated | - |
| `boolean` | 4 bytes | Integer (0 = false, else true) | - |

### SC2Map Format Notes

**ComponentList.SC2Components (XML):**
```xml
<ComponentList>
  <Component Type="info" />  <!-- DocumentInfo -->
  <Component Type="gada" />  <!-- GameData -->
  <Component Type="text" />  <!-- GameText -->
  <Component Type="mapi" />  <!-- MapInfo -->
  <Component Type="trig" />  <!-- Triggers -->
  <Component Type="terr" />  <!-- Terrain -->
  <Component Type="plob" />  <!-- Objects -->
  <Component Type="regi" />  <!-- Regions -->
  <Component Type="attr" />  <!-- Attributes -->
</ComponentList>
```

**t3Terrain XML:**
```xml
<Terrain>
  <TextureSet id="0" path="Assets/Textures/terrain_dirt.dds" />
  <TextureSet id="1" path="Assets/Textures/terrain_grass.dds" />
  <Layer texture="0" />
  <Layer texture="1" />
</Terrain>
```

**Important**: SC2Map uses **DDS textures** (DirectDraw Surface) instead of BLP. DDS parsing requires different approach (DXT compression).

### war3map.w3i Map Info Format

**File Header (Frozen Throne v25):**
```typescript
interface W3IHeader {
  version: number;           // File version (4 bytes) - 25 for TFT
  saveCount: number;         // Number of times saved (4 bytes)
  editorVersion: number;     // Editor version (4 bytes)
  name: string;              // Map name (null-terminated string)
  author: string;            // Author name (null-terminated)
  description: string;       // Map description (null-terminated)
  recommendedPlayers: string; // e.g., "1-8 players" (null-terminated)
  cameraBounds: number[];    // 8 floats (left, right, bottom, top, etc.)
  cameraBoundsComplements: number[]; // 4 ints
  playableWidth: number;     // Map width (4 bytes)
  playableHeight: number;    // Map height (4 bytes)
  flags: number;             // Map flags (4 bytes, see MapFlags enum)
  groundType: string;        // 1 char ('A'=Ashenvale, 'L'=Lordaeron, etc.)
  loadingScreenModel: number; // Loading screen index (4 bytes)
  loadingScreenText: string;  // Custom loading text (null-terminated)
  loadingScreenTitle: string; // Loading screen title (null-terminated)
  loadingScreenSubtitle: string; // Subtitle (null-terminated)
  gameDataSet: number;        // 0=default, 1=custom (4 bytes)
  prologueScreenPath: string; // Prologue screen (null-terminated)
  prologueScreenText: string; // Prologue text (null-terminated)
  prologueScreenTitle: string; // Prologue title (null-terminated)
  prologueScreenSubtitle: string; // Prologue subtitle (null-terminated)
  fogStyle: number;           // Fog type (4 bytes)
  fogStartZ: number;          // Fog start height (4 bytes float)
  fogEndZ: number;            // Fog end height (4 bytes float)
  fogDensity: number;         // Fog density (4 bytes float)
  fogColor: {                 // Fog color (4 bytes)
    r: number;                // Red (1 byte)
    g: number;                // Green (1 byte)
    b: number;                // Blue (1 byte)
    a: number;                // Alpha (1 byte)
  };
  globalWeather: string;      // Weather ID (4 bytes, e.g., 'RAhr')
  soundEnvironment: string;   // Sound environment (null-terminated)
  lightEnvironment: string;   // Light tileset (1 char)
  waterTintColor: {           // Water tint (4 bytes)
    r: number;
    g: number;
    b: number;
    a: number;
  };
  gameVersion: number;        // Critical for Reforged detection! (4 bytes)
  playerCount: number;        // Number of players (4 bytes)
  players: PlayerData[];      // Player array
  forceCount: number;         // Number of forces/teams (4 bytes)
  forces: ForceData[];        // Force array
}
```

**Player Data Structure:**
```typescript
interface PlayerData {
  internalNumber: number;    // Player slot (4 bytes)
  type: number;              // 1=human, 2=computer, 3=neutral, 4=rescuable (4 bytes)
  race: number;              // 1=human, 2=orc, 3=undead, 4=night elf (4 bytes)
  fixedStartPosition: number; // 0=no, 1=yes (4 bytes)
  name: string;              // Player name (null-terminated)
  startX: number;            // Start location X (4 bytes float)
  startY: number;            // Start location Y (4 bytes float)
  allyLowPriorities: number; // Ally low priority flags (4 bytes)
  allyHighPriorities: number; // Ally high priority flags (4 bytes)
}
```

**Force Data Structure:**
```typescript
interface ForceData {
  flags: number;             // Force flags (4 bytes)
  playerMask: number;        // Bitfield of players in this force (4 bytes)
  name: string;              // Force name (null-terminated)
}
```

**Critical for Version Detection:**
The `gameVersion` field tells you if this is a Reforged map:
- Classic: `gameVersion < 32` (format: major*10 + minor, e.g., 1.31 = 31)
- Reforged: `gameVersion >= 32` (v1.32+)

### war3map.wtg Trigger Format

**Trigger File Header:**
```typescript
interface WTGHeader {
  magic: string;             // 'WTG!' (4 bytes)
  version: number;           // 7 for TFT (4 bytes)
  categoryCount: number;     // Number of trigger categories (4 bytes)
  variableCount: number;     // Number of global variables (4 bytes)
  triggerCount: number;      // Number of triggers (4 bytes)
}
```

**Trigger Category:**
```typescript
interface TriggerCategory {
  id: number;                // Category index (4 bytes)
  name: string;              // Category name (null-terminated)
  isComment: number;         // 0=normal, 1=comment (4 bytes)
}
```

**Global Variable:**
```typescript
interface GlobalVariable {
  name: string;              // Variable name (null-terminated)
  type: string;              // Variable type (null-terminated, e.g., 'integer')
  unknown: number;           // Always 1? (4 bytes)
  isArray: number;           // 0=single, 1=array (4 bytes)
  arraySizeOrInitialized: number; // Array size or init flag (4 bytes)
  initialValue: string;      // Initial value (null-terminated)
}
```

**Trigger Structure:**
```typescript
interface Trigger {
  name: string;              // Trigger name (null-terminated)
  description: string;       // Description (null-terminated)
  isComment: number;         // 0=normal, 1=comment (4 bytes)
  enabled: number;           // 0=disabled, 1=enabled (4 bytes)
  isCustom: number;          // 0=GUI, 1=custom text (4 bytes)
  initiallyOn: number;       // 0=off, 1=on (4 bytes)
  runOnInit: number;         // 0=no, 1=run on initialization (4 bytes)
  category: number;          // Category index (4 bytes)
  ecaCount: number;          // Event/Condition/Action count (4 bytes)
  ecas: ECAFunction[];       // ECA functions array
}
```

**ECA Function (Event/Condition/Action):**
```typescript
interface ECAFunction {
  type: number;              // 0=event, 1=condition, 2=action (4 bytes)
  childId: number;           // Group ID if nested (4 bytes, -1=none)
  name: string;              // Function name (null-terminated)
  enabled: number;           // 0=disabled, 1=enabled (4 bytes)
  parameterCount: number;    // Number of parameters (4 bytes)
  parameters: Parameter[];   // Parameter array
}
```

**Parameter Structure (Recursive):**
```typescript
interface Parameter {
  type: number;              // 0=preset, 1=variable, 2=function, 3=string (4 bytes)
  value: string;             // Parameter value (null-terminated)
  hasSubParameters: number;  // 0=no, 1=yes (4 bytes)
  subParameterType?: number; // If has sub (4 bytes)
  subParameter?: Parameter;  // Recursive structure
  unknown?: number;          // Array flag? (4 bytes)
}
```

### war3map.wts Trigger Strings Format

**Plain Text Format:**
```
// Header
ï»¿

// Entries
STRING 1
{
Map title text here
}

STRING 2
// Comment (starts with //)
{
Unit name
}

STRING 123
{
Multi-line
description
text
}
```

**Reference Format:**
- In any file (w3i, w3u, wtg, etc.), strings starting with `TRIGSTR_` are replaced at runtime
- Format: `TRIGSTR_###` where `###` is the string number from WTS file
- Example: `TRIGSTR_001` → looks up STRING 1 in war3map.wts

### war3map.w3r Regions Format

**Regions Header:**
```typescript
interface W3RHeader {
  version: number;           // 5 (4 bytes)
  regionCount: number;       // Number of regions (4 bytes)
}
```

**Region Structure:**
```typescript
interface Region {
  left: number;              // Left boundary (4 bytes float)
  bottom: number;            // Bottom boundary (4 bytes float)
  right: number;             // Right boundary (4 bytes float)
  top: number;               // Top boundary (4 bytes float)
  name: string;              // Region name (null-terminated)
  creationNumber: number;    // Region ID (4 bytes)
  weatherEffect: string;     // Weather ID (4 bytes, e.g., 'RAhr')
  ambientSound: string;      // Sound name (null-terminated)
  color: {
    r: number;               // Red (1 byte)
    g: number;               // Green (1 byte)
    b: number;               // Blue (1 byte)
  };
  terminator: number;        // End marker (1 byte, always 0xFF)
}
```

### war3map.w3c Cameras Format

**Cameras Header:**
```typescript
interface W3CHeader {
  version: number;           // 0 (4 bytes)
  cameraCount: number;       // Number of cameras (4 bytes)
}
```

**Camera Structure:**
```typescript
interface Camera {
  targetX: number;           // Target X position (4 bytes float)
  targetY: number;           // Target Y position (4 bytes float)
  zOffset: number;           // Height offset (4 bytes float)
  rotation: number;          // Rotation angle (4 bytes float)
  angleOfAttack: number;     // Pitch angle (4 bytes float)
  distance: number;          // Distance from target (4 bytes float)
  roll: number;              // Roll angle (4 bytes float)
  fieldOfView: number;       // FOV angle (4 bytes float)
  farClipping: number;       // Far clipping plane (4 bytes float)
  unknown: number;           // Unknown (4 bytes float, always 100.0?)
  name: string;              // Camera name (null-terminated)
}
```

### war3map.w3s Sounds Format

**Sounds Header:**
```typescript
interface W3SHeader {
  version: number;           // 1 (4 bytes)
  soundCount: number;        // Number of sounds (4 bytes)
}
```

**Sound Structure:**
```typescript
interface Sound {
  name: string;              // Sound ID (null-terminated)
  filePath: string;          // Sound file path (null-terminated)
  eaxEffect: string;         // EAX effect (null-terminated)
  flags: number;             // Sound flags (4 bytes)
  fadeInRate: number;        // Fade in rate (4 bytes)
  fadeOutRate: number;       // Fade out rate (4 bytes)
  volume: number;            // Volume (4 bytes, -1=default)
  pitch: number;             // Pitch (4 bytes float)
  unknown1: number;          // Unknown (4 bytes float)
  channel: number;           // Sound channel (4 bytes)
  minDistance: number;       // Min distance (4 bytes float)
  maxDistance: number;       // Max distance (4 bytes float)
  cutoffDistance: number;    // Cutoff distance (4 bytes float)
  unknown2: number;          // Unknown (4 bytes float)
  unknown3: number;          // Unknown (4 bytes float)
  unknown4: number;          // Unknown (4 bytes, -1?)
  unknown5: number;          // Unknown (4 bytes, -1?)
  unknown6: number;          // Unknown (4 bytes, -1?)
}
```

### Object Editor Files (w3u/w3t/w3a/w3b/w3d/w3h/w3q)

**Common Structure for All Object Files:**
```typescript
interface ObjectEditorFile {
  version: number;           // 1 or 2 (4 bytes)
  originalTable: ObjectTable; // Original objects modified
  customTable: ObjectTable;   // Custom objects created
}

interface ObjectTable {
  objectCount: number;       // Number of objects (4 bytes)
  objects: ObjectModification[];
}

interface ObjectModification {
  originalId: string;        // Base object ID (4 bytes)
  customId: string;          // New object ID (4 bytes)
  modificationCount: number; // Number of modifications (4 bytes)
  modifications: Modification[];
}

interface Modification {
  modificationId: string;    // Modification ID (4 bytes, e.g., 'unam')
  variableType: number;      // 0=int, 1=real, 2=unreal, 3=string (4 bytes)
  level?: number;            // Level/variation (4 bytes, optional)
  dataPointer?: number;      // Data pointer (4 bytes, optional)
  value: number | string;    // Value (type-dependent)
  endOfModification: number; // End marker (4 bytes, for version 2)
}
```

**Modification Value Types:**
- `0` (int): 4-byte integer
- `1` (real): 4-byte float
- `2` (unreal): 4-byte float (different interpretation)
- `3` (string): null-terminated string

**File-Specific Prefixes:**
- `w3u` - Units (e.g., 'hfoo' = human footman)
- `w3t` - Items (e.g., 'ankh' = ankh of reincarnation)
- `w3a` - Abilities (e.g., 'AHhb' = holy bolt)
- `w3b` - Destructibles (e.g., 'LTlt' = large tree)
- `w3d` - Doodads (e.g., 'ATtr' = ashenvale tree)
- `w3h` - Buffs/Effects (e.g., 'Basl' = sleep buff)
- `w3q` - Upgrades (e.g., 'Rhme' = melee weapons upgrade)

---

**Status**: 📋 Planned → Ready for 🔬 Research phase after DoR completion
