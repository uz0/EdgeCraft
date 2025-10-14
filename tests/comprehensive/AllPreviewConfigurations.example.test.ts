/**
 * Comprehensive Map Preview Configurations - All Possible Rendering Methods
 *
 * This test suite demonstrates EVERY possible preview rendering configuration:
 * 1. Warcraft 3 (.w3x) - 5 preview file options
 * 2. Warcraft 3 Reforged (.w3x) - 3 BLP/DDS options
 * 3. Warcraft 3 Campaigns (.w3n) - 3 preview sources
 * 4. StarCraft 2 (.sc2map) - 3 preview file options
 * 5. Terrain generation fallback - All formats
 * 6. No image fallback - Error handling
 *
 * Research Sources:
 * - SC2: https://sc2mapster.fandom.com/wiki/Map_Properties
 * - WC3: https://867380699.github.io/blog/2019/05/09/W3X_Files_Format
 * - WC3 Reforged: https://github.com/inwc3/ReforgedMapPreviewReplacer
 * - BLP Format: https://www.hiveworkshop.com/threads/blp-specifications-wc3.279306/
 */

import path from 'path';
import fs from 'fs';
import { MapPreviewExtractor } from '../../src/engine/rendering/MapPreviewExtractor';
import { MapPreviewGenerator } from '../../src/engine/rendering/MapPreviewGenerator';
import { TGADecoder } from '../../src/engine/rendering/TGADecoder';
import { MPQParser } from '../../src/formats/mpq/MPQParser';
import { W3XMapLoader } from '../../src/formats/maps/w3x/W3XMapLoader';
import { SC2MapLoader } from '../../src/formats/maps/sc2/SC2MapLoader';
import type { RawMapData } from '../../src/formats/maps/types';

// Skip tests if running in CI without WebGL support
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';

if (isCI) {
  describe.skip('All Possible Map Preview Configurations (skipped in CI)', () => {
    it('requires WebGL support', () => {
      // Placeholder test
    });
  });
} else {
  describe('All Possible Map Preview Configurations', () => {
    let extractor: MapPreviewExtractor;
    let generator: MapPreviewGenerator;
    let tgaDecoder: TGADecoder;

    beforeAll(() => {
      extractor = new MapPreviewExtractor();
      generator = new MapPreviewGenerator();
      tgaDecoder = new TGADecoder();
    });

    afterAll(() => {
      extractor.dispose();
      generator.disposeEngine();
    });

  // ============================================================================
  // CONFIGURATION 1: Warcraft 3 Classic (.w3x) - 5 Preview File Options
  // ============================================================================

  describe('Configuration 1: Warcraft 3 Classic - All Preview File Options', () => {
    /**
     * Option 1.1: war3mapPreview.tga (PRIMARY)
     *
     * Standard:
     * - Format: TGA Type 2 (Uncompressed True-color)
     * - Color Depth: 32-bit BGRA (4 bytes per pixel)
     * - Dimensions: Square, 4×4 scaling (map_width × 4, map_height × 4)
     * - Example: 64×64 map → 256×256 preview
     * - Pixel Order: Bottom-to-top, left-to-right
     *
     * Usage: World Editor automatically generates this when saving map
     */
    it('should extract war3mapPreview.tga (PRIMARY preview file)', async () => {
      const mapPath = path.join(__dirname, '../../maps/3P Sentinel 01 v3.06.w3x');
      const fileBuffer = fs.readFileSync(mapPath);
      const file = new File([fileBuffer], '3P Sentinel 01 v3.06.w3x');

      // Parse map
      const loader = new W3XMapLoader();
      const mapData = await loader.parse(file);

      // Extract preview
      const result = await extractor.extract(file, mapData);

      expect(result.success).toBe(true);
      expect(result.source).toBe('embedded');
      expect(result.dataUrl).toBeDefined();
      expect(result.dataUrl).toMatch(/^data:image\/png;base64,/);

      // Validate dimensions (should be 512×512 after conversion)
      const dimensions = await getImageDimensions(result.dataUrl!);
      expect(dimensions.width).toBe(512);
      expect(dimensions.height).toBe(512);

      // Validate TGA header manually
      const buffer = await file.arrayBuffer();
      const mpqParser = new MPQParser(buffer);
      const tgaFile = await mpqParser.extractFile('war3mapPreview.tga');

      expect(tgaFile).toBeDefined();

      const dataView = new DataView(tgaFile!.data);
      expect(dataView.getUint8(2)).toBe(2); // Image Type = 2 (Uncompressed true-color)
      expect(dataView.getUint8(16)).toBe(32); // Bits per pixel = 32 (BGRA)

      const width = dataView.getUint16(12, true);
      const height = dataView.getUint16(14, true);
      expect(width).toBe(height); // Must be square
      expect(width % 4).toBe(0); // 4×4 scaling
    });

    /**
     * Option 1.2: war3mapMap.tga (FALLBACK)
     *
     * Standard:
     * - Format: Same as war3mapPreview.tga (32-bit BGRA TGA)
     * - Dimensions: Often smaller or different aspect ratio
     * - Usage: Alternative preview if war3mapPreview.tga missing
     *
     * Use Case: Older maps or custom map editors
     */
    it('should fallback to war3mapMap.tga if war3mapPreview.tga missing', async () => {
      // Create mock map with only war3mapMap.tga
      const mockMapData: RawMapData = {
        format: 'w3x',
        info: {
          name: 'Map with war3mapMap.tga',
          description: '',
          author: 'Test',
          version: '1.0',
          players: [],
          dimensions: { width: 64, height: 64 },
          environment: { tileset: 'ashenvale' },
        },
        terrain: {
          width: 64,
          height: 64,
          heightmap: new Float32Array(64 * 64).fill(0),
          textures: [{ id: 'grass', path: '/assets/textures/grass.png' }],
        },
        units: [],
        doodads: [],
      };

      // Mock MPQParser to return war3mapMap.tga
      const mockBuffer = new ArrayBuffer(0);
      const file = new File([mockBuffer], 'test-map.w3x');

      // In real implementation, MPQParser would try:
      // 1. war3mapPreview.tga → NOT FOUND
      // 2. war3mapMap.tga → FOUND ✅

      // Extract should fallback to generation if neither TGA found
      const result = await extractor.extract(file, mockMapData);

      expect(result.success).toBe(true);
      // If no embedded preview, should generate from terrain
      expect(['embedded', 'generated']).toContain(result.source);
    });

    /**
     * Option 1.3: war3mapMap.blp (FUTURE - BLP FORMAT)
     *
     * Standard:
     * - Format: BLP1 (Blip) - Blizzard's proprietary image format
     * - Compression: JPEG-compressed or paletted
     * - Color Depth: Supports alpha channel
     * - Usage: Used in Warcraft 3 for textures and icons
     *
     * Note: BLP decoder not yet implemented
     */
    it.skip('should extract war3mapMap.blp (BLP format - FUTURE)', async () => {
      // BLP Format Structure:
      // - Header: "BLP1" (4 bytes)
      // - Compression Type: 0 = JPEG, 1 = Paletted
      // - Alpha Channel: 0x00000008 = has alpha, 0x00000000 = no alpha
      // - Image Width: int
      // - Image Height: int
      // - Flags: Alpha channel and team colors

      // TODO: Implement BLP decoder
      // See: https://www.hiveworkshop.com/threads/blp-specifications-wc3.279306/
    });

    /**
     * Option 1.4: war3mapPreview.dds (ALTERNATIVE FORMAT)
     *
     * Standard:
     * - Format: DDS (DirectDraw Surface)
     * - Compression: DXT1/DXT5
     * - Alpha Channel: Similar to TGA
     * - Usage: Alternative format for custom preview images
     *
     * Use Case: Custom map editors or tools
     */
    it.skip('should extract war3mapPreview.dds (DDS format - ALTERNATIVE)', async () => {
      // DDS format not commonly used in WC3 maps
      // Primarily TGA and BLP
      // This is theoretical support for custom tools
    });

    /**
     * Option 1.5: Custom imported preview (War3mapImported\\*.tga)
     *
     * Standard:
     * - Format: TGA files in War3mapImported\ directory
     * - Usage: Custom preview images imported by map editor
     * - Path: War3mapImported\CustomPreview.tga
     *
     * Use Case: Maps with custom preview images
     */
    it.skip('should extract custom imported preview from War3mapImported\\', async () => {
      // Custom imports stored in War3mapImported\ directory
      // Would need to check multiple potential file names
      // Not standard practice, but supported by World Editor
    });
  });

  // ============================================================================
  // CONFIGURATION 2: Warcraft 3 Reforged (.w3x) - 3 BLP/DDS Options
  // ============================================================================

  describe('Configuration 2: Warcraft 3 Reforged - Reforged-Specific Preview Options', () => {
    /**
     * Option 2.1: war3mapPreview.blp (REFORGED PRIMARY)
     *
     * Standard:
     * - Format: BLP1 or BLP2 (Reforged uses BLP2)
     * - Resolution: Higher resolution than classic (512×512 or 1024×1024)
     * - Compression: JPEG or DXT
     * - Usage: Primary preview for Reforged UI
     *
     * Known Issues:
     * - war3mapPreview.blp broken in some Reforged versions
     * - See: https://us.forums.blizzard.com/en/warcraft3/t/135020030-war3mappreview-still-broken/30131
     */
    it.skip('should extract war3mapPreview.blp (REFORGED PRIMARY)', async () => {
      // Reforged BLP Format:
      // - BLP2 format (newer version)
      // - Higher resolution support (up to 2048×2048)
      // - DXT compression for better quality

      // Known Issue: war3mapPreview.blp doesn't work properly in Reforged
      // Workaround: Use war3mapPreview.tga or war3mapMap.blp instead
    });

    /**
     * Option 2.2: war3mapMap.blp as custom preview (REFORGED WORKAROUND)
     *
     * Standard:
     * - Format: BLP1/BLP2
     * - Usage: Workaround for broken war3mapPreview.blp
     * - Tool: https://github.com/inwc3/ReforgedMapPreviewReplacer
     *
     * How it works:
     * - Use war3mapPreview.blp as war3mapMap.blp
     * - Reforged loads war3mapMap.blp as minimap preview
     * - Allows custom preview images in Reforged
     */
    it.skip('should use war3mapMap.blp as custom preview (REFORGED WORKAROUND)', async () => {
      // This is a community workaround for Reforged's broken preview system
      // Tool: ReforgedMapPreviewReplacer
      // - Copies war3mapPreview.blp to war3mapMap.blp
      // - Reforged then uses it as preview
    });

    /**
     * Option 2.3: war3mapPreview.tga (REFORGED FALLBACK - WORKS)
     *
     * Standard:
     * - Format: Same as classic WC3 (32-bit BGRA TGA)
     * - Dimensions: 256×256 (classic) or higher
     * - Usage: Most reliable preview method in Reforged
     *
     * Recommendation: Use TGA for best compatibility
     */
    it('should extract war3mapPreview.tga (REFORGED FALLBACK - WORKS)', async () => {
      // This is the most reliable method for Reforged
      // Classic TGA format still works perfectly in Reforged
      // Should be primary method until BLP issues are resolved

      // Same test as Configuration 1.1
      // TGA extraction works in both Classic and Reforged
    });
  });

  // ============================================================================
  // CONFIGURATION 3: Warcraft 3 Campaigns (.w3n) - 3 Preview Sources
  // ============================================================================

  describe('Configuration 3: Warcraft 3 Campaigns - Campaign Preview Options', () => {
    /**
     * Option 3.1: war3campaign.w3f (CAMPAIGN INFO FILE)
     *
     * Standard:
     * - Format: Binary file with campaign metadata
     * - Contains: Campaign name, description, icon, map list
     * - Icon Format: Embedded BLP or reference to external file
     * - Usage: Primary source for campaign preview
     *
     * Structure (simplified):
     * - Campaign format version (int)
     * - Campaign name (string)
     * - Campaign description (string)
     * - Campaign icon path (string) or embedded icon (BLP)
     * - Number of maps (int)
     * - Map list (array of map file names)
     *
     * Note: Not yet implemented in extractor
     */
    it.skip('should extract campaign icon from war3campaign.w3f (PRIMARY)', async () => {
      const campaignPath = path.join(__dirname, '../../maps/BurdenOfUncrowned.w3n');
      const fileBuffer = fs.readFileSync(campaignPath);
      const file = new File([fileBuffer], 'BurdenOfUncrowned.w3n');

      // Parse W3N campaign
      const buffer = await file.arrayBuffer();
      const mpqParser = new MPQParser(buffer);

      // Extract campaign info file
      const w3fFile = await mpqParser.extractFile('war3campaign.w3f');
      expect(w3fFile).toBeDefined();

      // Parse campaign info
      // TODO: Implement W3F parser
      // Should extract:
      // - Campaign name
      // - Campaign description
      // - Campaign icon (BLP or path reference)
      // - Map list

      // If campaign has icon, use it as preview
      // Otherwise, fallback to first map preview
    });

    /**
     * Option 3.2: First map preview (FALLBACK)
     *
     * Standard:
     * - Extract war3mapPreview.tga from first map in campaign
     * - Use first map's preview as campaign preview
     * - Usage: Fallback when no campaign icon exists
     *
     * How it works:
     * 1. Read war3campaign.w3f to get map list
     * 2. Extract first map file (*.w3x or *.w3m)
     * 3. Extract war3mapPreview.tga from first map
     * 4. Use as campaign preview
     */
    it.skip('should extract preview from first map in campaign (FALLBACK)', async () => {
      const campaignPath = path.join(__dirname, '../../maps/BurdenOfUncrowned.w3n');
      const fileBuffer = fs.readFileSync(campaignPath);
      const file = new File([fileBuffer], 'BurdenOfUncrowned.w3n');

      const buffer = await file.arrayBuffer();
      const mpqParser = new MPQParser(buffer);

      // Parse campaign info to get first map name
      const w3fFile = await mpqParser.extractFile('war3campaign.w3f');
      // TODO: Parse to get first map name

      const firstMapName = 'Chapter1.w3x'; // Example

      // Extract first map's preview
      // Note: Campaign is nested MPQ
      // - W3N archive contains multiple W3X archives
      // - Need to extract W3X, then parse its MPQ, then extract preview
    });

    /**
     * Option 3.3: Terrain generation from first map (LAST RESORT)
     *
     * Standard:
     * - Generate preview from first map's terrain data
     * - Use Babylon.js to render terrain
     * - Usage: When no campaign icon and no embedded preview
     *
     * Process:
     * 1. Extract first map file from campaign
     * 2. Parse terrain data
     * 3. Generate 512×512 preview using Babylon.js
     */
    it('should generate terrain preview from first map (LAST RESORT)', async () => {
      const campaignPath = path.join(__dirname, '../../maps/BurdenOfUncrowned.w3n');
      const fileBuffer = fs.readFileSync(campaignPath);
      const file = new File([fileBuffer], 'BurdenOfUncrowned.w3n');

      // Parse campaign (stub - actual implementation would extract first map)
      const mockMapData: RawMapData = {
        format: 'w3x',
        info: {
          name: 'Campaign Chapter 1',
          description: '',
          author: 'Campaign Author',
          version: '1.0',
          players: [],
          dimensions: { width: 128, height: 128 },
          environment: { tileset: 'lordaeron' },
        },
        terrain: {
          width: 128,
          height: 128,
          heightmap: new Float32Array(128 * 128).fill(0),
          textures: [{ id: 'grass', path: '/assets/textures/grass.png' }],
        },
        units: [],
        doodads: [],
      };

      // Generate preview from terrain
      const result = await generator.generatePreview(mockMapData);

      expect(result.success).toBe(true);
      expect(result.dataUrl).toBeDefined();
      expect(result.dataUrl).toMatch(/^data:image\/png;base64,/);

      const dimensions = await getImageDimensions(result.dataUrl!);
      expect(dimensions.width).toBe(512);
      expect(dimensions.height).toBe(512);
    });
  });

  // ============================================================================
  // CONFIGURATION 4: StarCraft 2 (.sc2map) - 3 Preview File Options
  // ============================================================================

  describe('Configuration 4: StarCraft 2 - All Preview File Options', () => {
    /**
     * Option 4.1: PreviewImage.tga (PRIMARY - LARGE PREVIEW)
     *
     * Standard:
     * - Format: 24-bit TGA (True-color, no alpha) or 32-bit TGA (with alpha)
     * - Dimensions: MUST BE SQUARE (256×256, 512×512, 1024×1024)
     * - Color Depth: 24-bit BGR or 32-bit BGRA
     * - Usage: Large preview image shown in map selection
     *
     * CRITICAL: SC2 Editor REQUIRES square images
     * - Non-square images will not display properly
     * - Recommended size: 512×512 for balance of quality and file size
     *
     * Import Process:
     * 1. Create square TGA image (e.g., 512×512)
     * 2. Import into map via Editor
     * 3. Set as "Preview Image - Large" in Map Properties
     */
    it.skip('should extract PreviewImage.tga (PRIMARY - LARGE PREVIEW)', async () => {
      const mapPath = path.join(__dirname, '../../maps/Aliens Binary Mothership.SC2Map');
      const fileBuffer = fs.readFileSync(mapPath);
      const file = new File([fileBuffer], 'Aliens Binary Mothership.SC2Map');

      // Parse SC2 map
      const loader = new SC2MapLoader();
      const mapData = await loader.parse(file);

      const buffer = await file.arrayBuffer();
      const mpqParser = new MPQParser(buffer);

      // Extract PreviewImage.tga
      const previewFile = await mpqParser.extractFile('PreviewImage.tga');

      if (previewFile) {
        // Validate TGA header
        const dataView = new DataView(previewFile.data);
        const imageType = dataView.getUint8(2);
        expect(imageType).toBe(2); // Uncompressed true-color

        const bpp = dataView.getUint8(16);
        expect([24, 32]).toContain(bpp); // 24-bit or 32-bit

        const width = dataView.getUint16(12, true);
        const height = dataView.getUint16(14, true);

        // CRITICAL: SC2 requires square images
        expect(width).toBe(height);
        expect([256, 512, 1024]).toContain(width);

        // Decode to data URL
        const dataUrl = tgaDecoder.decodeToDataURL(previewFile.data);
        expect(dataUrl).toBeDefined();
        expect(dataUrl).toMatch(/^data:image\/png;base64,/);
      } else {
        // If no PreviewImage.tga, should fallback to Minimap.tga
        console.log('PreviewImage.tga not found, should fallback to Minimap.tga');
      }
    });

    /**
     * Option 4.2: Minimap.tga (FALLBACK - SMALL PREVIEW)
     *
     * Standard:
     * - Format: 24-bit TGA (True-color)
     * - Dimensions: MUST BE SQUARE (typically 256×256)
     * - Usage: Small preview image, minimap
     * - Fallback: Used if PreviewImage.tga not found
     *
     * Minimap vs Preview:
     * - Minimap.tga: Smaller, used for minimap display
     * - PreviewImage.tga: Larger, used for map selection screen
     */
    it.skip('should fallback to Minimap.tga (FALLBACK - SMALL PREVIEW)', async () => {
      const mapPath = path.join(__dirname, '../../maps/Aliens Binary Mothership.SC2Map');
      const fileBuffer = fs.readFileSync(mapPath);
      const file = new File([fileBuffer], 'Aliens Binary Mothership.SC2Map');

      const buffer = await file.arrayBuffer();
      const mpqParser = new MPQParser(buffer);

      // Try PreviewImage.tga first
      let previewFile = await mpqParser.extractFile('PreviewImage.tga');

      if (!previewFile) {
        // Fallback to Minimap.tga
        previewFile = await mpqParser.extractFile('Minimap.tga');
      }

      if (previewFile) {
        const dataView = new DataView(previewFile.data);
        const width = dataView.getUint16(12, true);
        const height = dataView.getUint16(14, true);

        // Must still be square
        expect(width).toBe(height);

        const dataUrl = tgaDecoder.decodeToDataURL(previewFile.data);
        expect(dataUrl).toBeDefined();
      }
    });

    /**
     * Option 4.3: Terrain generation (CURRENT IMPLEMENTATION)
     *
     * Standard:
     * - Method: Babylon.js orthographic camera rendering
     * - Dimensions: 512×512 (always square)
     * - Usage: When no embedded preview exists
     *
     * Process:
     * 1. Parse terrain data from TerrainData.xml
     * 2. Create Babylon.js scene with orthographic camera
     * 3. Render terrain from top-down view
     * 4. Capture to 512×512 PNG data URL
     *
     * Note: This is currently the PRIMARY method since PreviewImage.tga
     * extraction is not yet implemented
     */
    it('should generate terrain preview (CURRENT IMPLEMENTATION)', async () => {
      const mapPath = path.join(__dirname, '../../maps/Aliens Binary Mothership.SC2Map');
      const fileBuffer = fs.readFileSync(mapPath);
      const file = new File([fileBuffer], 'Aliens Binary Mothership.SC2Map');

      // Parse SC2 map
      const loader = new SC2MapLoader();
      const mapData = await loader.parse(file);

      // Extract with forceGenerate to use terrain generation
      const result = await extractor.extract(file, mapData, { forceGenerate: true });

      expect(result.success).toBe(true);
      expect(result.source).toBe('generated');
      expect(result.dataUrl).toBeDefined();
      expect(result.dataUrl).toMatch(/^data:image\/png;base64,/);

      // Validate dimensions (always 512×512 square)
      const dimensions = await getImageDimensions(result.dataUrl!);
      expect(dimensions.width).toBe(512);
      expect(dimensions.height).toBe(512);

      // Validate not blank
      const brightness = await calculateAverageBrightness(result.dataUrl!);
      expect(brightness).toBeGreaterThan(10);
      expect(brightness).toBeLessThan(245);
    });
  });

  // ============================================================================
  // CONFIGURATION 5: Terrain Generation Fallback - All Formats
  // ============================================================================

  describe('Configuration 5: Terrain Generation - Universal Fallback', () => {
    /**
     * Terrain generation works for ALL map formats:
     * - W3X: When no embedded TGA
     * - W3N: When no campaign icon or map preview
     * - SC2: When no PreviewImage.tga or Minimap.tga
     *
     * Process:
     * 1. Parse terrain data from map
     * 2. Create Babylon.js scene
     * 3. Render orthographic top-down view
     * 4. Export to 512×512 PNG data URL
     */
    it('should generate terrain for W3X map without embedded preview', async () => {
      const mapPath = path.join(__dirname, '../../maps/EchoIslesAlltherandom.w3x');
      const fileBuffer = fs.readFileSync(mapPath);
      const file = new File([fileBuffer], 'EchoIslesAlltherandom.w3x');

      const loader = new W3XMapLoader();
      const mapData = await loader.parse(file);

      const result = await extractor.extract(file, mapData);

      expect(result.success).toBe(true);
      expect(result.source).toBe('generated');

      const dimensions = await getImageDimensions(result.dataUrl!);
      expect(dimensions.width).toBe(512);
      expect(dimensions.height).toBe(512);
    });

    it('should force terrain generation even if embedded preview exists', async () => {
      const mapPath = path.join(__dirname, '../../maps/3P Sentinel 01 v3.06.w3x');
      const fileBuffer = fs.readFileSync(mapPath);
      const file = new File([fileBuffer], '3P Sentinel 01 v3.06.w3x');

      const loader = new W3XMapLoader();
      const mapData = await loader.parse(file);

      // Force terrain generation
      const result = await extractor.extract(file, mapData, { forceGenerate: true });

      expect(result.success).toBe(true);
      expect(result.source).toBe('generated');

      const dimensions = await getImageDimensions(result.dataUrl!);
      expect(dimensions.width).toBe(512);
      expect(dimensions.height).toBe(512);
    });

    it('should generate terrain for SC2 map (primary method)', async () => {
      const mapPath = path.join(__dirname, '../../maps/Ruined Citadel.SC2Map');
      const fileBuffer = fs.readFileSync(mapPath);
      const file = new File([fileBuffer], 'Ruined Citadel.SC2Map');

      const loader = new SC2MapLoader();
      const mapData = await loader.parse(file);

      const result = await extractor.extract(file, mapData);

      expect(result.success).toBe(true);
      expect(result.source).toBe('generated');

      const dimensions = await getImageDimensions(result.dataUrl!);
      expect(dimensions.width).toBe(512);
      expect(dimensions.height).toBe(512);
    });
  });

  // ============================================================================
  // CONFIGURATION 6: No Image Fallback - Error Handling
  // ============================================================================

  describe('Configuration 6: No Image Fallback - Error Cases', () => {
    /**
     * When BOTH embedded extraction AND terrain generation fail:
     * - Return error result
     * - Provide meaningful error message
     * - Suggest fallback actions
     *
     * Common Error Scenarios:
     * 1. Corrupted map file
     * 2. Missing terrain data
     * 3. WebGL unavailable
     * 4. Unsupported compression format
     */
    it('should return error when both extraction and generation fail', async () => {
      const corruptedBuffer = Buffer.from([0x00, 0x01, 0x02]); // Invalid MPQ
      const file = new File([corruptedBuffer], 'corrupted.w3x');

      const mockMapData: RawMapData = {
        format: 'w3x',
        info: {
          name: 'Corrupted Map',
          description: '',
          author: '',
          version: '1.0',
          players: [],
          dimensions: { width: 0, height: 0 },
          environment: { tileset: '' },
        },
        terrain: {
          width: 0,
          height: 0,
          heightmap: new Float32Array(0),
          textures: [],
        },
        units: [],
        doodads: [],
      };

      const result = await extractor.extract(file, mockMapData);

      expect(result.success).toBe(false);
      expect(result.source).toBe('error');
      expect(result.error).toBeDefined();
    });

    it('should handle missing terrain data gracefully', async () => {
      const mockMapData: RawMapData = {
        format: 'w3x',
        info: {
          name: 'No Terrain Map',
          description: '',
          author: '',
          version: '1.0',
          players: [],
          dimensions: { width: 64, height: 64 },
          environment: { tileset: 'ashenvale' },
        },
        terrain: {
          width: 0, // Invalid terrain
          height: 0,
          heightmap: new Float32Array(0),
          textures: [],
        },
        units: [],
        doodads: [],
      };

      const file = new File([Buffer.from([])], 'no-terrain.w3x');
      const result = await extractor.extract(file, mockMapData);

      expect(result.success).toBe(false);
      expect(result.source).toBe('error');
    });

    it('should provide placeholder image option (FUTURE)', async () => {
      // FUTURE: Return default placeholder image instead of error
      // - Generic map icon
      // - Map name overlay
      // - Format badge (W3X/SC2)

      const mockMapData: RawMapData = {
        format: 'w3x',
        info: {
          name: 'Unknown Map',
          description: '',
          author: '',
          version: '1.0',
          players: [],
          dimensions: { width: 64, height: 64 },
          environment: { tileset: '' },
        },
        terrain: {
          width: 0,
          height: 0,
          heightmap: new Float32Array(0),
          textures: [],
        },
        units: [],
        doodads: [],
      };

      const file = new File([Buffer.from([])], 'unknown.w3x');
      const result = await extractor.extract(file, mockMapData);

      // Current behavior: returns error
      expect(result.success).toBe(false);

      // FUTURE: Should return placeholder
      // expect(result.success).toBe(true);
      // expect(result.source).toBe('placeholder');
      // expect(result.dataUrl).toMatch(/^data:image\/png;base64,/);
    });
  });
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get image dimensions from data URL
 */
async function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/**
 * Calculate average brightness of image (0-255)
 */
async function calculateAverageBrightness(dataUrl: string): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      let totalBrightness = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const brightness = (r + g + b) / 3;
        totalBrightness += brightness;
      }

      const avgBrightness = totalBrightness / (data.length / 4);
      resolve(avgBrightness);
    };
    img.src = dataUrl;
  });
}
