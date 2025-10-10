# Phase 5: File Format Support

**Status**: Ready for Implementation
**Duration**: 3 weeks (15 working days)
**PRPs**: 29 total (5.1 - 5.29)

---

## Quick Links

- **[Complete Technical Research](./FORMATS_RESEARCH.md)** - 12,000+ lines of detailed specifications
- **[PRP Breakdown](./PRP_BREAKDOWN.md)** - Week-by-week implementation plan
- **[Format Overview](./5.0-format-support-overview.md)** - Original phase overview

---

## What This Phase Delivers

### Map Loading Support
- ✅ **95%** of Warcraft 3 (W3M/W3X) maps
- ✅ **95%** of StarCraft 2 (SC2Map) maps via CASC
- ✅ **95%** of StarCraft 1 (SCM/SCX) maps

### Format Parsers
- **MPQ Archive Parser** - Full support (compression, encryption)
- **CASC Archive Parser** - Complete SC2 support
- **W3X Map Parser** - Terrain, units, doodads, triggers
- **SC2Map Parser** - All map components
- **CHK Parser** - StarCraft 1 maps (all chunks)

### Conversion System
- **.edgestory Format** - glTF 2.0 based, copyright-free
- **Asset Replacement** - 100+ unit/building mappings
- **Terrain Converter** - 98% accuracy
- **Gameplay Converter** - Units, triggers, scripts
- **Copyright Validator** - Zero copyrighted assets in output

---

## Implementation Timeline

### Week 1: Core Infrastructure + MPQ
**Days 1-5** | PRPs 5.1 - 5.6

| PRP | Component | Effort | Key Deliverable |
|-----|-----------|--------|-----------------|
| 5.1 | Binary Utils | 4h | Type-safe binary reading |
| 5.2 | Crypto Utils | 4h | MPQ encryption/hashing |
| 5.3 | MPQ Header | 4h | Parse all MPQ versions |
| 5.4 | MPQ Tables | 8h | Hash/block table decryption |
| 5.5 | MPQ Compression | 12h | zlib, bzip2, LZMA, PKWARE |
| 5.6 | MPQ Extraction | 12h | Complete file extraction |

**End of Week 1**: Extract any file from any W3X map

---

### Week 2: CASC + Map Parsers
**Days 6-12** | PRPs 5.7 - 5.17

| PRP | Component | Effort | Key Deliverable |
|-----|-----------|--------|-----------------|
| 5.7 | CASC Build Info | 4h | Parse .build.info |
| 5.8 | CASC Index | 8h | Index file parsing |
| 5.9 | CASC Encoding | 8h | Content key mapping |
| 5.10 | CASC Root | 8h | Path resolution |
| 5.11 | CASC Extraction | 12h | Complete CASC support |
| 5.12 | W3I Parser | 6h | Map info (W3X) |
| 5.13 | W3E Parser | 8h | Terrain data (W3X) |
| 5.14 | W3O Parser | 6h | Doodads (W3X) |
| 5.15 | W3U Parser | 6h | Units (W3X) |
| 5.16 | CHK Parser | 12h | StarCraft 1 maps |
| 5.17 | SC2Map Parser | 8h | StarCraft 2 maps |

**End of Week 2**: Parse all map formats completely

---

### Week 3: .edgestory + Converters
**Days 13-20** | PRPs 5.18 - 5.29

| PRP | Component | Effort | Key Deliverable |
|-----|-----------|--------|-----------------|
| 5.18 | EdgeStory Spec | 8h | Format definition |
| 5.19 | EdgeStory Builder | 8h | glTF base structure |
| 5.20 | Asset Replacement | 12h | Unit/building mappings |
| 5.21 | Terrain Converter | 12h | Heightmap → glTF |
| 5.22 | Gameplay Converter | 12h | Units, triggers → glTF |
| 5.23 | Script Transpiler | 12h | Basic JASS → TypeScript |
| 5.24 | W3X Converter | 8h | **Complete W3X conversion** |
| 5.25 | SC2 Converter | 8h | **Complete SC2 conversion** |
| 5.26 | SCM Converter | 6h | **Complete SC1 conversion** |
| 5.27 | Parser Tests | 12h | 95% code coverage |
| 5.28 | Integration Tests | 12h | End-to-end validation |
| 5.29 | Copyright Validator | 12h | Legal compliance |

**End of Week 3**: Convert any map to legal .edgestory format

---

## Technical Highlights

### MPQ Archive Format
- **Compression**: zlib, bzip2, LZMA, PKWARE DCL, Sparse
- **Encryption**: Custom MPQ cipher with file-specific keys
- **Structure**: Hash table (file lookup) + Block table (file data)
- **Versions**: v1, v2, v3, v4 support

### CASC Archive Format
- **Design**: Content-addressable storage (files identified by hash)
- **Components**: Build info, Index files, Encoding file, Root file, Data files
- **Pipeline**: Path → Content Key → Encoding Key → Index Entry → Data
- **Optimization**: CDN support, HTTP range requests

### .edgestory Format
- **Base**: glTF 2.0 (royalty-free, widely supported)
- **Extensions**:
  - `EDGE_map_info` - Map metadata, players, legal info
  - `EDGE_terrain` - Heightmap, textures, water, doodads
  - `EDGE_gameplay` - Units, buildings, triggers, regions
  - `EDGE_scripting` - Transpiled TypeScript, events
- **Container**: ZIP archive with manifest.json + binary buffers
- **Legal**: CC0/MIT assets only, license attribution

### Asset Replacement System
- **Coverage**: 100+ Warcraft 3 units, 50+ StarCraft units
- **Mapping**: `originalTypeId` → `edgeTypeId` + glTF model
- **Placeholders**: Generic models for unmapped types
- **Validation**: SHA-256 hash checking, metadata scanning

---

## Performance Targets

| Operation | Target | Constraint |
|-----------|--------|------------|
| MPQ File Extraction | <50ms | 1MB file |
| CASC Initialization | <500ms | Full storage |
| CASC File Extraction | <100ms | 1MB file |
| W3X Full Parse | <2s | Typical 128x128 map |
| SC2Map Full Parse | <3s | Typical 256x256 map |
| SCM/SCX Parse | <500ms | Typical 128x128 map |
| W3X → .edgestory | <10s | Full conversion |
| SC2Map → .edgestory | <15s | Full conversion |
| SCM/SCX → .edgestory | <5s | Full conversion |
| Memory Usage | <512MB | During conversion |

---

## Success Metrics (DoD)

### Functionality
- ✅ 95% map load success rate (W3X, SC2Map, SCM/SCX)
- ✅ 98% conversion accuracy (terrain, units, gameplay)
- ✅ 100% unit placement accuracy
- ✅ 95% trigger conversion success

### Code Quality
- ✅ 95% test coverage (parsers)
- ✅ 80% test coverage (converters)
- ✅ TypeScript strict mode compliance
- ✅ All tests passing in CI/CD

### Legal Compliance
- ✅ 0% copyrighted assets in output
- ✅ 100% asset license attribution
- ✅ Copyright validator catches all test violations
- ✅ Complete asset source documentation

### Performance
- ✅ All performance targets met (see table above)
- ✅ No memory leaks (tested over 1 hour)
- ✅ Streaming for large files (>10MB)

---

## Dependencies

### NPM Packages
```json
{
  "dependencies": {
    "pako": "^2.1.0",              // zlib
    "bzip2": "^0.1.0",             // bzip2
    "lzma": "^2.3.2",              // LZMA
    "explode-js": "^1.0.0",        // PKWARE DCL
    "jszip": "^3.10.1",            // .edgestory packaging
    "@gltf-transform/core": "^3.7.0",    // glTF manipulation
    "@gltf-transform/extensions": "^3.7.0",
    "basis-universal": "^1.16.4"   // Basis texture compression
  }
}
```

### External References
- **StormLib**: MPQ reference implementation
- **CascLib**: CASC reference implementation
- **WC3MapTranslator**: W3X format reference
- **glTF 2.0 Spec**: glTF format specification

---

## File Structure

After Phase 5 implementation:

```
src/formats/
├── utils/
│   ├── BinaryReader.ts          # PRP 5.1
│   └── MPQCrypto.ts             # PRP 5.2
├── mpq/
│   ├── MPQHeaderParser.ts       # PRP 5.3
│   ├── MPQTableParser.ts        # PRP 5.4
│   ├── MPQDecompression.ts      # PRP 5.5
│   └── MPQExtractor.ts          # PRP 5.6
├── casc/
│   ├── CASCBuildInfo.ts         # PRP 5.7
│   ├── CASCIndexParser.ts       # PRP 5.8
│   ├── CASCEncodingParser.ts    # PRP 5.9
│   ├── CASCRootParser.ts        # PRP 5.10
│   └── CASCExtractor.ts         # PRP 5.11
├── w3x/
│   ├── W3IParser.ts             # PRP 5.12
│   ├── W3EParser.ts             # PRP 5.13
│   ├── W3OParser.ts             # PRP 5.14
│   └── W3UParser.ts             # PRP 5.15
├── scm/
│   └── CHKParser.ts             # PRP 5.16
├── sc2/
│   └── SC2MapParser.ts          # PRP 5.17
├── edgestory/
│   ├── types.ts                 # PRP 5.18
│   ├── schema.json              # PRP 5.18
│   ├── EdgeStoryBuilder.ts      # PRP 5.19
│   └── converters/
│       ├── TerrainConverter.ts  # PRP 5.21
│       ├── GameplayConverter.ts # PRP 5.22
│       ├── W3XConverter.ts      # PRP 5.24
│       ├── SC2Converter.ts      # PRP 5.25
│       └── SCMConverter.ts      # PRP 5.26
└── jass/
    ├── JASSLexer.ts             # PRP 5.23
    ├── JASSParser.ts            # PRP 5.23
    └── JASSTranspiler.ts        # PRP 5.23

src/assets/
└── AssetReplacementSystem.ts    # PRP 5.20

src/legal/
└── CopyrightValidator.ts        # PRP 5.29

data/
└── asset-mappings.json          # PRP 5.20

tests/formats/
├── mpq/                         # PRP 5.27
├── casc/                        # PRP 5.27
├── w3x/                         # PRP 5.27
├── scm/                         # PRP 5.27
├── sc2/                         # PRP 5.27
└── edgestory/                   # PRP 5.27

tests/integration/               # PRP 5.28
└── conversion/
```

---

## CLI Tools

After Phase 5, you'll have:

### Convert Maps
```bash
# Convert Warcraft 3 map
npm run convert -- input.w3x output.edgestory

# Convert StarCraft 2 map
npm run convert -- input.sc2map output.edgestory

# Convert StarCraft 1 map
npm run convert -- input.scm output.edgestory
```

### Extract Files
```bash
# Extract from MPQ
npm run extract-mpq -- archive.mpq file.txt

# Extract from CASC
npm run extract-casc -- /path/to/sc2 "maps/map.sc2map"
```

### Validate Copyright
```bash
# Validate .edgestory file
npm run validate-copyright -- output.edgestory
```

---

## Known Limitations

### Phase 5 Scope
- **JASS Transpilation**: Basic only (simple functions, variables)
  - Full implementation in Phase 6
- **Trigger Conversion**: 95% success rate (some complex triggers unsupported)
- **Asset Coverage**: 100+ units mapped, placeholders for others
- **SC2 Triggers**: Basic support only (Galaxy scripting minimal)

### Technical Constraints
- **MPQ v4**: Support planned, not guaranteed (rare format)
- **CASC CDN**: HTTP range requests may fail on some CDNs
- **Memory**: Large maps (>256x256) may exceed 512MB target

### Legal Constraints
- **Blizzard Assets**: NEVER included in output
- **Third-party Assets**: Must have clear license (CC0/MIT preferred)
- **Asset Database**: Community contributions needed for full coverage

---

## Future Enhancements (Post Phase 5)

### Phase 6: Enhanced Scripting
- Full JASS transpilation (complex triggers, arrays, hashtables)
- Galaxy script support (StarCraft 2)
- Custom script debugging
- Script optimization

### Phase 7: Advanced Conversion
- Particle effects conversion
- Animation conversion
- Sound effect mapping
- Music conversion

### Phase 8: Editor Integration
- In-browser map editor
- Real-time .edgestory editing
- Asset replacement UI
- Visual trigger editor

---

## Support & Resources

### Documentation
- [FORMATS_RESEARCH.md](./FORMATS_RESEARCH.md) - Complete technical specs
- [PRP_BREAKDOWN.md](./PRP_BREAKDOWN.md) - Detailed implementation plan
- [EDGESTORY_SPEC.md](./EDGESTORY_SPEC.md) - (Created in PRP 5.18)

### References
- **MPQ Format**: http://www.zezula.net/en/mpq/mpqformat.html
- **CASC Format**: https://wowdev.wiki/CASC
- **W3X Format**: https://github.com/ChiefOfGxBxL/WC3MapSpecification
- **CHK Format**: https://www.starcraftai.com/wiki/CHK_Format
- **glTF 2.0**: https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html

### Community
- **Staredit Network**: https://staredit.net/ (SC1 maps)
- **Hive Workshop**: https://www.hiveworkshop.com/ (W3 maps)
- **SC2Mapster**: https://www.sc2mapster.com/ (SC2 maps)

---

**Phase Status**: Ready to Begin
**Next Action**: Review research documents, start PRP 5.1
**Questions**: Refer to [FORMATS_RESEARCH.md](./FORMATS_RESEARCH.md) Section 11
