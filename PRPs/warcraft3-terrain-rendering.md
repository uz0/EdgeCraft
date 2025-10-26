# PRP: Warcraft 3 Terrain Rendering - Pixel-Perfect Match

**Status**: 🟡 In Progress (Research Phase Complete)
**Created**: 2025-01-23
**Complexity**: Large
**Estimated Effort**: 12-15 days

## 🎯 Goal / Description

Implement pixel-perfect Warcraft 3 terrain rendering in Babylon.js that exactly matches mdx-m3-viewer's output. This includes:
- Corner-based heightmap geometry (257×257 vertices)
- 4-texture blending system with smooth transitions
- Texture atlas with variation support (standard + extended)
- Instanced tile rendering (256×256 tiles)
- Ground shader with proper UV mapping and alpha blending
- Normal calculation from heightmap

**Business Value**:
- **User Impact**: Players see authentic WC3 terrain with correct textures and blending
- **Strategic Value**: Foundation for complete WC3 map rendering (units, doodads, effects)
- **Technical Excellence**: Demonstrates clean-room reverse engineering capability

## 📋 Definition of Ready (DoR)

**Prerequisites to START implementation:**
- [x] mdx-m3-viewer integrated as reference renderer (right side)
- [x] Heightmap data matches perfectly (257×257 corners)
- [x] W3E parser correctly reads corner data
- [x] Texture blending algorithm fully understood
- [x] Ground shaders source code analyzed
- [x] Comparison page working with side-by-side rendering
- [x] Research documentation complete
- [x] warcraft-manifest.json created with SLK data (texture paths from terrain.slk)

**Dependencies**:
- Babylon.js engine initialized
- W3E parser working correctly
- Texture loading system using warcraft-manifest.json (temporary hiveworkshop links)
- Comparison test infrastructure
- manifest.json for general assets
- warcraft-manifest.json for W3X/W3M Warcraft 3 specific assets

## ✅ Definition of Done (DoD)

**Deliverables to COMPLETE work:**
- [ ] Asset manifest system implemented
  - [ ] warcraft-manifest.json created with terrain.slk data
  - [ ] Manifest loader loads manifest.json for all maps
  - [ ] Manifest loader loads warcraft-manifest.json for W3X/W3M maps
  - [ ] Texture paths resolved from warcraft-manifest.json
- [ ] Corner-based geometry implemented (257×257 vertices forming 256×256 tiles)
- [ ] Texture blending system matching mdx-m3-viewer
  - [ ] `cornerTexture()` logic ported to TypeScript
  - [ ] `cornerTextures` array built (4 values per tile = 262,144 bytes)
  - [ ] `cornerVariations` array built (4 values per tile = 262,144 bytes)
- [ ] Ground shaders ported to Babylon.js
  - [ ] Vertex shader with UV calculation and normal computation
  - [ ] Fragment shader with 4-texture alpha blending
- [ ] Tileset textures loaded from hiveworkshop using warcraft-manifest.json paths
- [ ] Instanced rendering working (256×256 tile instances)
- [ ] Pixel-perfect comparison test passes
- [ ] Unit tests >80% coverage for core logic
- [ ] Zero TypeScript errors (`npm run typecheck`)
- [ ] Zero ESLint errors (`npm run lint`)
- [ ] Performance: 60 FPS @ 256×256 terrain
- [ ] All debug logging removed
- [ ] Code reviewed and merged to main

## 🏗️ Implementation Breakdown

### Architecture Overview

**Rendering Pipeline**:
```
W3E Data → cornerTexture() → Texture Arrays → Instanced Geometry → Shaders → Babylon.js Scene
```

**Key Components**:
1. **TerrainTextureBuilder**: Builds cornerTextures and cornerVariations arrays
2. **W3xTerrainRenderer**: Creates instanced geometry and manages rendering
3. **GroundShader**: Babylon.js ShaderMaterial with vertex + fragment shaders
4. **TextureLoader**: Loads tileset textures from CASC or cache

### File Structure

```
src/engine/terrain/
├── W3xTerrainRenderer.ts              # Main renderer (updated)
├── TerrainTextureBuilder.ts           # NEW: Builds texture arrays
├── shaders/
│   ├── ground.vertex.glsl             # NEW: Vertex shader
│   └── ground.fragment.glsl           # NEW: Fragment shader
└── types.ts                           # Terrain types

src/formats/maps/w3x/
├── W3EParser.ts                       # Already correct (reads 257×257)
└── types.ts                           # W3E types

src/utils/
└── textureLoader.ts                   # NEW: Texture loading utility
```

### Phase 1: Texture Blending System (3-4 days)

#### Task 1.1: Create TerrainTextureBuilder

**File**: `src/engine/terrain/TerrainTextureBuilder.ts`

Port the texture blending algorithm from mdx-m3-viewer (map.ts:346-386):

```typescript
export class TerrainTextureBuilder {
  /**
   * Build cornerTextures and cornerVariations arrays
   * Following mdx-m3-viewer algorithm exactly
   */
  public buildTextureArrays(
    w3e: W3ETerrain,
    columns: number,
    rows: number
  ): {
    cornerTextures: Uint8Array;
    cornerVariations: Uint8Array;
  } {
    const tileCount = (columns - 1) * (rows - 1); // 256×256 = 65,536 tiles
    const cornerTextures = new Uint8Array(tileCount * 4);
    const cornerVariations = new Uint8Array(tileCount * 4);

    let instance = 0;
    for (let y = 0; y < rows - 1; y++) {
      for (let x = 0; x < columns - 1; x++) {
        // Get texture at each of the 4 corners
        const bottomLeftTexture = this.cornerTexture(x, y, w3e);
        const bottomRightTexture = this.cornerTexture(x + 1, y, w3e);
        const topLeftTexture = this.cornerTexture(x, y + 1, w3e);
        const topRightTexture = this.cornerTexture(x + 1, y + 1, w3e);

        // Get unique textures sorted
        const textures = this.unique([
          bottomLeftTexture,
          bottomRightTexture,
          topLeftTexture,
          topRightTexture,
        ]).sort();

        // Store base texture
        let texture = textures[0];
        cornerTextures[instance * 4] = texture + 1; // +1 offset
        cornerVariations[instance * 4] = this.getVariation(
          texture,
          w3e.groundTiles[y * columns + x]?.groundVariation ?? 0
        );

        textures.shift();

        // Store blend textures with bitsets
        for (let i = 0; i < textures.length && i < 3; i++) {
          let bitset = 0;
          texture = textures[i]!;

          if (bottomRightTexture === texture) bitset |= 0b0001;
          if (bottomLeftTexture === texture) bitset |= 0b0010;
          if (topRightTexture === texture) bitset |= 0b0100;
          if (topLeftTexture === texture) bitset |= 0b1000;

          cornerTextures[instance * 4 + 1 + i] = texture + 1;
          cornerVariations[instance * 4 + 1 + i] = bitset;
        }

        instance++;
      }
    }

    return { cornerTextures, cornerVariations };
  }

  /**
   * Get texture at corner, handling cliffs and blight
   * Ported from mdx-m3-viewer map.ts:979-1008
   */
  private cornerTexture(
    column: number,
    row: number,
    w3e: W3ETerrain
  ): number {
    // Check surrounding tiles for cliffs
    for (let y = -1; y < 1; y++) {
      for (let x = -1; x < 1; x++) {
        const checkCol = column + x;
        const checkRow = row + y;

        if (
          checkCol > 0 &&
          checkCol < w3e.width - 1 &&
          checkRow > 0 &&
          checkRow < w3e.height - 1
        ) {
          if (this.isCliff(checkCol, checkRow, w3e)) {
            const tile = w3e.groundTiles[checkRow * w3e.width + checkCol];
            let cliffTexture = tile?.cliffTexture ?? 0;

            if (cliffTexture === 15) {
              cliffTexture = 1;
            }

            return this.cliffGroundIndex(cliffTexture, w3e);
          }
        }
      }
    }

    const corner = w3e.groundTiles[row * w3e.width + column];

    // Check for blight
    if (corner?.blight) {
      return w3e.blightTextureIndex ?? 0;
    }

    return corner?.groundTexture ?? 0;
  }

  /**
   * Check if tile is a cliff (has elevation change)
   */
  private isCliff(column: number, row: number, w3e: W3ETerrain): boolean {
    const corners = w3e.groundTiles;
    const bottomLeft = corners[row * w3e.width + column]?.layerHeight ?? 0;
    const bottomRight = corners[row * w3e.width + column + 1]?.layerHeight ?? 0;
    const topLeft = corners[(row + 1) * w3e.width + column]?.layerHeight ?? 0;
    const topRight = corners[(row + 1) * w3e.width + column + 1]?.layerHeight ?? 0;

    return (
      bottomLeft !== bottomRight ||
      bottomLeft !== topLeft ||
      bottomLeft !== topRight
    );
  }

  /**
   * Get variation index for texture
   * Handles standard (16 variations) vs extended (32 variations) textures
   */
  private getVariation(
    groundTexture: number,
    variation: number
  ): number {
    // TODO: Load texture metadata to check if extended
    const isExtended = false; // Placeholder

    if (isExtended) {
      if (variation < 16) {
        return 16 + variation;
      } else if (variation === 16) {
        return 15;
      } else {
        return 0;
      }
    } else {
      if (variation === 0) {
        return 0;
      } else {
        return 15;
      }
    }
  }

  private cliffGroundIndex(cliffTexture: number, w3e: W3ETerrain): number {
    // TODO: Implement cliff texture lookup
    return 0;
  }

  private unique<T>(arr: T[]): T[] {
    return Array.from(new Set(arr));
  }
}
```

**Tests**: `src/engine/terrain/TerrainTextureBuilder.unit.ts`
- Test cornerTexture() with various tile configurations
- Test bitset calculation
- Test unique texture detection
- Coverage: >85%

#### Task 1.2: Update W3E Parser Types

**File**: `src/formats/maps/w3x/types.ts`

Add missing fields:
```typescript
export interface W3EGroundTile {
  groundHeight: number;
  waterLevel: number;
  flags: number;
  groundTexture: number;
  cliffLevel: number;
  layerHeight: number;
  groundVariation?: number;  // NEW
  cliffTexture?: number;      // NEW
  blight?: boolean;           // NEW
}

export interface W3ETerrain {
  version: number;
  tileset: string;
  customTileset: boolean;
  groundTextureIds: string[];
  width: number;
  height: number;
  groundTiles: W3EGroundTile[];
  cliffTiles?: W3ECliffTile[];
  blightTextureIndex?: number;  // NEW
}
```

### Phase 2: Shader Implementation (3-4 days)

#### Task 2.1: Port Vertex Shader

**File**: `src/engine/terrain/shaders/ground.vertex.glsl`

Port from mdx-m3-viewer (ground.vert.ts):

```glsl
precision highp float;

// Uniforms
uniform mat4 viewProjection;
uniform sampler2D heightMap;
uniform vec2 mapSize;
uniform vec2 worldOffset;
uniform bool extended[14];
uniform float baseTileset;

// Attributes
attribute vec2 position;           // Quad corner (0,0 to 1,1)
attribute float instanceID;        // Tile instance (0 to 65535)
attribute vec4 textures;           // 4 texture indices (+1 offset)
attribute vec4 variations;         // 4 variations/bitsets

// Varyings
varying vec4 vTilesets;
varying vec2 vUV[4];
varying vec3 vNormal;

vec2 getCell(float variation) {
  if (variation < 16.0) {
    return vec2(mod(variation, 4.0), floor(variation / 4.0));
  } else {
    variation -= 16.0;
    return vec2(4.0 + mod(variation, 4.0), floor(variation / 4.0));
  }
}

vec2 getUV(vec2 pos, bool isExtended, float variation) {
  vec2 cell = getCell(variation);
  vec2 cellSize = vec2(isExtended ? 0.125 : 0.25, 0.25);
  vec2 uv = vec2(pos.x, 1.0 - pos.y);
  vec2 pixelSize = vec2(1.0 / 512.0, 1.0 / 256.0);

  return clamp(
    (cell + uv) * cellSize,
    cell * cellSize + pixelSize,
    (cell + 1.0) * cellSize - pixelSize
  );
}

void main() {
  vec4 adjustedTextures = textures - baseTileset;

  if (adjustedTextures[0] > 0.0 || adjustedTextures[1] > 0.0 ||
      adjustedTextures[2] > 0.0 || adjustedTextures[3] > 0.0) {
    vTilesets = adjustedTextures;

    // Calculate UVs for all 4 textures
    vUV[0] = getUV(position, extended[int(adjustedTextures[0]) - 1], variations[0]);
    vUV[1] = getUV(position, extended[int(adjustedTextures[1]) - 1], variations[1]);
    vUV[2] = getUV(position, extended[int(adjustedTextures[2]) - 1], variations[2]);
    vUV[3] = getUV(position, extended[int(adjustedTextures[3]) - 1], variations[3]);

    // Calculate world position
    vec2 corner = vec2(mod(instanceID, mapSize.x), floor(instanceID / mapSize.x));
    vec2 base = corner + position;
    float height = texture2D(heightMap, base / mapSize).a;

    // Calculate normal from neighboring heights
    float hL = texture2D(heightMap, (base - vec2(1.0, 0.0)) / mapSize).a;
    float hR = texture2D(heightMap, (base + vec2(1.0, 0.0)) / mapSize).a;
    float hD = texture2D(heightMap, (base - vec2(0.0, 1.0)) / mapSize).a;
    float hU = texture2D(heightMap, (base + vec2(0.0, 1.0)) / mapSize).a;

    vNormal = normalize(vec3(hL - hR, hD - hU, 2.0));

    // World position: scale by 128 (WC3 units)
    gl_Position = viewProjection * vec4(base * 128.0 + worldOffset, height * 128.0, 1.0);
  } else {
    // Degenerate tile (no textures)
    vTilesets = vec4(0.0);
    vUV[0] = vec2(0.0);
    vUV[1] = vec2(0.0);
    vUV[2] = vec2(0.0);
    vUV[3] = vec2(0.0);
    vNormal = vec3(0.0);
    gl_Position = vec4(0.0);
  }
}
```

#### Task 2.2: Port Fragment Shader

**File**: `src/engine/terrain/shaders/ground.fragment.glsl`

```glsl
precision highp float;

uniform sampler2D tilesets[15];

varying vec4 vTilesets;
varying vec2 vUV[4];
varying vec3 vNormal;

const vec3 lightDirection = normalize(vec3(-0.3, -0.3, 0.25));

vec4 sampleTexture(float tileset, vec2 uv) {
  int i = int(tileset - 0.6);

  if (i == 0) return texture2D(tilesets[0], uv);
  else if (i == 1) return texture2D(tilesets[1], uv);
  else if (i == 2) return texture2D(tilesets[2], uv);
  else if (i == 3) return texture2D(tilesets[3], uv);
  else if (i == 4) return texture2D(tilesets[4], uv);
  else if (i == 5) return texture2D(tilesets[5], uv);
  else if (i == 6) return texture2D(tilesets[6], uv);
  else if (i == 7) return texture2D(tilesets[7], uv);
  else if (i == 8) return texture2D(tilesets[8], uv);
  else if (i == 9) return texture2D(tilesets[9], uv);
  else if (i == 10) return texture2D(tilesets[10], uv);
  else if (i == 11) return texture2D(tilesets[11], uv);
  else if (i == 12) return texture2D(tilesets[12], uv);
  else if (i == 13) return texture2D(tilesets[13], uv);
  else if (i == 14) return texture2D(tilesets[14], uv);

  return vec4(0.0);
}

vec4 blend(vec4 color, float tileset, vec2 uv) {
  vec4 texel = sampleTexture(tileset, uv);
  return mix(color, texel, texel.a);
}

void main() {
  vec4 color = sampleTexture(vTilesets[0], vUV[0]);

  if (vTilesets[1] > 0.5) {
    color = blend(color, vTilesets[1], vUV[1]);
  }

  if (vTilesets[2] > 0.5) {
    color = blend(color, vTilesets[2], vUV[2]);
  }

  if (vTilesets[3] > 0.5) {
    color = blend(color, vTilesets[3], vUV[3]);
  }

  // Optional: lighting (currently disabled in mdx-m3-viewer)
  // color *= clamp(dot(vNormal, lightDirection) + 0.45, 0.0, 1.0);

  gl_FragColor = vec4(color.rgb, 1.0);
}
```

#### Task 2.3: Create ShaderMaterial in Babylon.js

**File**: `src/engine/terrain/W3xTerrainRenderer.ts` (update)

```typescript
import { Effect, ShaderMaterial } from '@babylonjs/core';
import groundVertexShader from './shaders/ground.vertex.glsl';
import groundFragmentShader from './shaders/ground.fragment.glsl';

private createGroundShader(): ShaderMaterial {
  // Register shaders
  Effect.ShadersStore['groundVertexShader'] = groundVertexShader;
  Effect.ShadersStore['groundFragmentShader'] = groundFragmentShader;

  const shader = new ShaderMaterial('groundShader', this.scene, {
    vertex: 'ground',
    fragment: 'ground',
  }, {
    attributes: ['position', 'instanceID', 'textures', 'variations'],
    uniforms: [
      'viewProjection', 'heightMap', 'mapSize', 'worldOffset',
      'extended', 'baseTileset', 'tilesets'
    ],
    samplers: ['heightMap', 'tilesets'],
  });

  return shader;
}
```

### Phase 3: Instanced Geometry (2-3 days)

#### Task 3.1: Create Instanced Tile Mesh

**File**: `src/engine/terrain/W3xTerrainRenderer.ts` (update)

```typescript
private createInstancedTileMesh(
  cornerTextures: Uint8Array,
  cornerVariations: Uint8Array,
  tileCount: number
): Mesh {
  // Create unit quad (0,0 to 1,1)
  const quadVertices = new Float32Array([
    0, 0,  // bottom-left
    1, 0,  // bottom-right
    0, 1,  // top-left
    1, 1,  // top-right
  ]);

  const quadIndices = new Uint16Array([
    0, 1, 2,  // first triangle
    1, 3, 2,  // second triangle
  ]);

  // Create mesh
  const mesh = new Mesh('terrain-tiles', this.scene);

  // Set vertex data
  mesh.setVerticesData(VertexBuffer.PositionKind, quadVertices);
  mesh.setIndices(quadIndices);

  // Create per-instance buffers
  const instanceIDs = new Float32Array(tileCount);
  const instanceTextures = new Float32Array(tileCount * 4);
  const instanceVariations = new Float32Array(tileCount * 4);

  for (let i = 0; i < tileCount; i++) {
    instanceIDs[i] = i;
    instanceTextures[i * 4] = cornerTextures[i * 4];
    instanceTextures[i * 4 + 1] = cornerTextures[i * 4 + 1];
    instanceTextures[i * 4 + 2] = cornerTextures[i * 4 + 2];
    instanceTextures[i * 4 + 3] = cornerTextures[i * 4 + 3];
    instanceVariations[i * 4] = cornerVariations[i * 4];
    instanceVariations[i * 4 + 1] = cornerVariations[i * 4 + 1];
    instanceVariations[i * 4 + 2] = cornerVariations[i * 4 + 2];
    instanceVariations[i * 4 + 3] = cornerVariations[i * 4 + 3];
  }

  // Set per-instance attributes
  mesh.setVerticesData('instanceID', instanceIDs, false, 1);
  mesh.setVerticesData('textures', instanceTextures, false, 4);
  mesh.setVerticesData('variations', instanceVariations, false, 4);

  // Enable instancing
  mesh.thinInstanceCount = tileCount;

  return mesh;
}
```

### Phase 4: Texture Loading (2-3 days)

#### Task 4.1: Create Texture Loader

**File**: `src/utils/textureLoader.ts`

```typescript
export class TextureLoader {
  /**
   * Load tileset texture from hiveworkshop CASC or local cache
   */
  async loadTilesetTexture(
    textureId: string,
    isReforged: boolean = false
  ): Promise<Texture> {
    const extension = isReforged ? '.dds' : '.blp';
    const url = this.resolveTextureURL(textureId, extension);

    // Try local cache first
    const cachedTexture = await this.loadFromCache(url);
    if (cachedTexture) return cachedTexture;

    // Fallback to hiveworkshop CASC
    const remoteURL = this.getHiveworkshopURL(textureId, extension);
    return await this.loadFromURL(remoteURL);
  }

  private resolveTextureURL(textureId: string, extension: string): string {
    // Example: "Adrt" -> "TerrainArt/Ashenvale/Ashen_Dirt.blp"
    // TODO: Use tileset metadata to resolve paths
    return `TerrainArt/${textureId}${extension}`;
  }

  private getHiveworkshopURL(textureId: string, extension: string): string {
    return `https://www.hiveworkshop.com/casc-contents?path=${this.resolveTextureURL(textureId, extension)}`;
  }

  private async loadFromCache(url: string): Promise<Texture | null> {
    // TODO: Implement IndexedDB cache
    return null;
  }

  private async loadFromURL(url: string): Promise<Texture> {
    // TODO: Implement texture loading with BLP/DDS support
    throw new Error('Not implemented');
  }
}
```

### Phase 5: Integration & Testing (2-3 days)

#### Task 5.1: Update Main Renderer

**File**: `src/engine/terrain/W3xTerrainRenderer.ts` (update renderTerrain)

```typescript
public async renderTerrain(terrain: TerrainData): Promise<void> {
  const w3e = terrain.raw as W3ETerrain;

  // Phase 1: Build texture arrays
  const textureBuilder = new TerrainTextureBuilder();
  const { cornerTextures, cornerVariations } = textureBuilder.buildTextureArrays(
    w3e,
    terrain.width,
    terrain.height
  );

  // Phase 2: Load textures
  const textureLoader = new TextureLoader();
  const tilesetTextures = await Promise.all(
    w3e.groundTextureIds.map((id) => textureLoader.loadTilesetTexture(id))
  );

  // Phase 3: Create shader
  const shader = this.createGroundShader();

  // Phase 4: Upload heightmap as texture
  const heightmapTexture = this.createHeightmapTexture(terrain.heightmap, terrain.width, terrain.height);

  // Phase 5: Create instanced geometry
  const tileCount = (terrain.width - 1) * (terrain.height - 1);
  const mesh = this.createInstancedTileMesh(cornerTextures, cornerVariations, tileCount);

  // Phase 6: Bind uniforms
  shader.setTexture('heightMap', heightmapTexture);
  shader.setVector2('mapSize', new Vector2(terrain.width, terrain.height));
  shader.setVector2('worldOffset', Vector2.Zero());
  shader.setFloat('baseTileset', 0);

  // Bind tileset textures
  for (let i = 0; i < Math.min(tilesetTextures.length, 15); i++) {
    shader.setTexture(`tilesets[${i}]`, tilesetTextures[i]);
  }

  // Phase 7: Apply shader and render
  mesh.material = shader;
  this.terrainMesh = mesh;
}
```

#### Task 5.2: Pixel-Perfect Comparison Test

**File**: `tests/comparison-pixel-perfect.test.ts` (update)

```typescript
test('terrain rendering matches mdx-m3-viewer pixel-perfect', async ({ page }) => {
  await page.goto('http://localhost:3000/comparison');
  await page.waitForSelector('canvas');

  // Wait for both renderers to load
  await page.waitForTimeout(3000);

  // Capture screenshots
  const ourCanvas = await page.locator('#our-canvas').screenshot();
  const mdxCanvas = await page.locator('#mdx-canvas').screenshot();

  // Compare pixel-by-pixel
  const diff = await pixelmatch(ourCanvas, mdxCanvas, null, 800, 600, {
    threshold: 0.01,
  });

  expect(diff).toBeLessThan(100); // Allow <0.02% difference
});
```

## 📚 Research / Related Materials

### Completed Research Files

1. **`texture-comparison.json`**
   - Comparison between our data (66,049 corners) and mdx-m3-viewer (262,144 tile values)
   - Key finding: mdx uses 4 textures per tile, not 1 per corner

2. **`texture-blending-algorithm.md`**
   - Complete explanation of 4-texture blending system
   - Bitset encoding for corner masks (0b0001=BR, 0b0010=BL, 0b0100=TR, 0b1000=TL)
   - Unique texture detection and sorting

3. **`ground-shader-analysis.md`**
   - Full vertex shader analysis (UV calculation, normal computation)
   - Full fragment shader analysis (texture sampling, alpha blending)
   - Texture atlas layout (standard 4×4, extended 8×4)

### Codebase References

1. **`src/vendor/mdx-m3-viewer/src/viewer/handlers/w3x/map.ts`**
   - Lines 346-386: Texture blending algorithm
   - Lines 685-760: Ground rendering setup
   - Lines 979-1008: cornerTexture() implementation

2. **`src/vendor/mdx-m3-viewer/src/viewer/handlers/w3x/shaders/`**
   - `ground.vert.ts`: Vertex shader source (getCell, getUV, normal calculation)
   - `ground.frag.ts`: Fragment shader source (sample, blend functions)

3. **`src/formats/maps/w3x/W3EParser.ts`**
   - Already correctly reads 257×257 corners (fixed in previous work)
   - Lines 73-89: Corner reading logic
   - Lines 217-233: toHeightmap() conversion

4. **`src/engine/terrain/W3xSimpleTerrainRenderer.ts`**
   - Current simple renderer (green flat terrain)
   - Will be replaced with full implementation

### External Resources

1. **Texture Atlas Format**:
   - Standard textures: 512×256 texture, 4×4 grid (16 variations)
   - Extended textures: 512×256 texture, 8×4 grid (32 variations)
   - Each variation is a 128×64 cell

2. **WC3 World Units**:
   - 1 tile = 128 world units
   - Heights scaled by 128× for proper world coordinates

3. **Instanced Rendering**:
   - 256×256 = 65,536 tile instances
   - Each instance is a unit quad (0,0 to 1,1)
   - Per-instance attributes: instanceID, textures (vec4), variations (vec4)

### Key Gotchas

1. **Corner-based vs Tile-based**:
   - Heightmap is 257×257 (corners/vertices)
   - Rendering is 256×256 (tiles/instances)
   - Must handle this correctly in shaders

2. **Texture Index Offset**:
   - mdx-m3-viewer stores texture indices with +1 offset
   - 0 = unused, 1 = first texture, etc.

3. **Bitset Interpretation**:
   - cornerVariations contains either variation index (for base texture) or bitset mask (for blend textures)
   - Shader must distinguish between these based on texture slot

4. **Two-Pass Rendering**:
   - Can only bind 15 textures at once
   - For maps with >15 textures, need two rendering passes with baseTileset offset

## ⏱️ Timeline

**Estimated Effort**: 12-15 days

**Phase Breakdown**:
- Phase 1 (Texture Blending System): 3-4 days
  - TerrainTextureBuilder implementation: 2 days
  - cornerTexture() logic: 1 day
  - Unit tests: 1 day
- Phase 2 (Shader Implementation): 3-4 days
  - Vertex shader port: 1 day
  - Fragment shader port: 1 day
  - ShaderMaterial integration: 1 day
  - Debugging/fixes: 1 day
- Phase 3 (Instanced Geometry): 2-3 days
  - Mesh creation: 1 day
  - Per-instance attributes: 1 day
  - Testing: 1 day
- Phase 4 (Texture Loading): 2-3 days
  - TextureLoader implementation: 1 day
  - CASC integration or cache setup: 1 day
  - BLP/DDS support: 1 day
- Phase 5 (Integration & Testing): 2-3 days
  - Main renderer integration: 1 day
  - Pixel-perfect test: 1 day
  - Bug fixes and optimization: 1 day

**Assumptions**:
- No blockers on Babylon.js ShaderMaterial API
- Textures accessible from hiveworkshop or local cache
- Comparison test infrastructure working

## 📊 Success Metrics

### Performance
- **Frame Rate**: 60 FPS @ 256×256 terrain (65,536 tile instances)
- **Memory**: < 200MB for terrain geometry + textures
- **Draw Calls**: 1-2 (instanced rendering)
- **Texture Memory**: ~50MB for 15 tileset textures (512×256 each)

### Quality
- **Pixel-Perfect Match**: < 0.02% pixel difference vs mdx-m3-viewer
- **Test Coverage**: > 85% for TerrainTextureBuilder
- **Code Quality**: 0 TypeScript errors, 0 ESLint errors
- **Visual Fidelity**: Smooth texture blending, correct variations

### Reliability
- **Stability**: No crashes during 10-minute continuous rendering
- **Correctness**: All 256×256 tiles render with correct textures
- **Edge Cases**: Handles cliffs, blight, water tiles correctly

## 🧪 Testing & Validation

### Unit Tests

**File**: `src/engine/terrain/TerrainTextureBuilder.unit.ts`

```typescript
describe('TerrainTextureBuilder', () => {
  describe('buildTextureArrays', () => {
    it('should create correct array sizes for 256×256 tiles', () => {
      const result = builder.buildTextureArrays(mockW3E, 257, 257);
      expect(result.cornerTextures.length).toBe(65536 * 4);
      expect(result.cornerVariations.length).toBe(65536 * 4);
    });

    it('should handle single-texture tiles', () => {
      // All 4 corners use same texture
      // Should only use first slot, rest zeros
    });

    it('should handle 4-texture tiles', () => {
      // Each corner uses different texture
      // Should fill all 4 slots with bitset masks
    });
  });

  describe('cornerTexture', () => {
    it('should return groundTexture for normal tiles', () => {
      // Test normal ground texture
    });

    it('should return cliff texture for cliff tiles', () => {
      // Test cliff detection and texture override
    });

    it('should return blight texture for blighted corners', () => {
      // Test blight flag handling
    });
  });

  describe('bitset calculation', () => {
    it('should set correct bits for corner positions', () => {
      // bottomRight = 0b0001
      // bottomLeft = 0b0010
      // topRight = 0b0100
      // topLeft = 0b1000
    });
  });
});
```

**Coverage Target**: > 85%

### E2E Tests

**File**: `tests/comparison-pixel-perfect.test.ts`

```typescript
test('terrain matches mdx-m3-viewer in all camera angles', async ({ page }) => {
  const angles = [
    { name: 'front', rotation: 0 },
    { name: 'side', rotation: 90 },
    { name: 'top', rotation: 180 },
    { name: 'isometric', rotation: 45 },
  ];

  for (const angle of angles) {
    await page.evaluate((rot) => {
      window.setCamera Angle(rot);
    }, angle.rotation);

    await page.waitForTimeout(500);

    const ourCanvas = await page.locator('#our-canvas').screenshot();
    const mdxCanvas = await page.locator('#mdx-canvas').screenshot();

    const diff = pixelmatch(ourCanvas, mdxCanvas, null, 800, 600, {
      threshold: 0.01,
    });

    expect(diff).toBeLessThan(100); // <0.02% difference
  }
});

test('terrain handles all texture types', async ({ page }) => {
  // Test maps with different tileset combinations
  const maps = ['ashenvale', 'barrens', 'cityscape', 'dalaran'];

  for (const map of maps) {
    await page.goto(`http://localhost:3000/comparison?map=${map}`);
    await page.waitForTimeout(2000);

    const ourCanvas = await page.locator('#our-canvas').screenshot();
    const mdxCanvas = await page.locator('#mdx-canvas').screenshot();

    const diff = pixelmatch(ourCanvas, mdxCanvas, null, 800, 600, {
      threshold: 0.01,
    });

    expect(diff).toBeLessThan(100);
  }
});
```

### Validation Commands

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Unit tests
npm run test:unit

# E2E tests
npm run test:e2e -- comparison-pixel-perfect

# Full validation pipeline
npm run validate

# Performance benchmark
npm run benchmark -- terrain-render
```

**Expected Results**:
- ✅ TypeScript: 0 errors
- ✅ ESLint: 0 errors/warnings
- ✅ Unit Tests: 100% pass, >85% coverage
- ✅ E2E Tests: 100% pass, <0.02% pixel difference
- ✅ Performance: 60 FPS sustained

## 📋 Progress Tracking

| Date | Role | Change Made | Status |
|------|------|-------------|--------|
| 2025-01-23 | Research | Analyzed heightmap data, confirmed 257×257 corners | Complete |
| 2025-01-23 | Research | Fixed W3E parser to read corners instead of tiles | Complete |
| 2025-01-23 | Research | Extracted and compared texture data structures | Complete |
| 2025-01-23 | Research | Documented 4-texture blending algorithm | Complete |
| 2025-01-23 | Research | Found and analyzed ground shader source code | Complete |
| 2025-01-23 | Research | Created comprehensive PRP with implementation plan | Complete |
| 2025-01-24 | Developer | Updated PRP with warcraft-manifest.json strategy | Complete |
| 2025-01-24 | Developer | Added POST release legal compliance checklist | Complete |
| 2025-01-24 | Developer | Created warcraft-manifest.json with 42 terrain textures | Complete |
| 2025-01-24 | Developer | Implemented TerrainTextureManager.loadManifest() | Complete |
| 2025-01-24 | Developer | Updated loadTerrainTexture() to use manifest URLs | Complete |
| 2025-01-24 | Developer | BLOCKER: Hiveworkshop texture paths return 404 | Blocked |
| 2025-01-26 | Developer | Implemented CliffDetector for cliff tile identification | Complete |
| 2025-01-26 | Developer | Implemented CliffRenderer with MDX model loading | Complete |
| 2025-01-26 | Developer | Added cliff texture loading from CliffTypes.slk | Complete |
| 2025-01-26 | Developer | Implemented terrain cutting (skip ground tiles where cliffs exist) | Complete |
| 2025-01-26 | Developer | ISSUE: Simplified renderer has holes between cliffs/terrain | Blocked |
| 2025-01-26 | Developer | ANALYSIS: Current approach fundamentally different from mdx-m3-viewer | Complete |
| 2025-01-26 | Developer | DECISION: Use Z-up coordinate system (matching WC3) via scene.useRightHandedSystem | Complete |
| 2025-01-26 | Developer | Configured ComparisonPage scene to use Z-up (scene.useRightHandedSystem = true) | Complete |
| 2025-01-26 | Developer | Updated warcraftTerrainVertex.glsl to use Z-up directly (no Y/Z conversion) | Complete |
| 2025-01-26 | Developer | FIX: Reverted useRightHandedSystem - use left-handed Z-up (matching mdx-m3-viewer) | Complete |
| 2025-01-26 | Developer | Removed all unnecessary Y/Z transformations from codebase | Complete |
| 2025-01-26 | Developer | Verified terrain mirroring fixed - rendering matches mdx-m3-viewer orientation | Complete |
| 2025-01-26 | Developer | Started W3xWarcraftTerrainRenderer implementation (unified terrain+cliffs+water) | In Progress |
| 2025-01-27 | Developer | Added CLAUDE.md local cheatsheet summarizing mdx-m3-viewer unified terrain workflow | Complete |
| 2025-10-26 | Developer | Ran validation on current terrain refactor; typecheck/lint/unit tests failing (see blockers) | Blocked |
| 2025-10-27 | Developer | Re-ran typecheck/lint/tests; failures persist and large refactor remains uncommitted | Blocked |
| 2025-10-26 | Developer | Ran full validation: typecheck ✅ lint ✅ unit tests ✅ (e2e need dev server) | Complete |
| 2025-10-26 | Developer | Identified current approach: per-tile geometry (not instanced like mdx-m3-viewer) | Complete |
| 2025-10-26 | Developer | Two renderers exist: W3xWarcraftTerrainRenderer (incomplete unified) and W3xSimpleTerrainRenderer (working but wrong approach) | Complete |
| 2025-10-26 | Developer | Completed comprehensive research on mdx-m3-viewer instanced rendering approach | Complete |
| 2025-10-26 | Developer | Key findings: Single unit quad + 65,536 instances, heightmap as texture, GPU-side position/normal calculation | Complete |
| 2025-10-26 | Developer | CLIFF RESEARCH COMPLETE: Documented cliff detection, terrain cutting, model loading, and rendering pipeline | Complete |
| 2025-10-26 | Developer | Key cliff findings: Cliffs NOT filtered on CPU, cornerTextures=0, GPU degenerate tiles, shared heightmap | Complete |
| 2025-10-26 | Developer | Created CLIFF_RENDERING_RESEARCH.md with implementation roadmap | Complete |
| 2025-10-26 | Developer | Implemented terrain cuts: cliff tiles now have cornerTextures=0, GPU-side degenerate vertices | Complete |
| 2025-10-26 | Developer | Ground shader already had degenerate check (textures==0 → gl_Position=vec4(0)) | Complete |
| 2025-10-26 | Developer | Validation passed: typecheck ✅ lint ✅ - terrain cuts ready for cliff rendering | Complete |
| 2025-10-26 | Developer | Verified existing cliff shaders match mdx-m3-viewer (bilinear interpolation, shared heightmap) | Complete |
| 2025-10-26 | Developer | Added CliffRenderer to W3xWarcraftTerrainRenderer.renderTerrain() - integrated cliff loading | Complete |
| 2025-10-26 | Developer | Verified cliffs loading in browser: __cliffLoadingComplete = true, cliff models visible | Complete |
| 2025-10-26 | Developer | Ran e2e pixel-perfect tests: terrain-only view **0.00% diff** (PIXEL-PERFECT ✅) | Complete |
| 2025-10-26 | Developer | E2E results with cliffs: top-view 1.13%, side-view 0.80%, 45-view 1.29% (wrong cliff textures) | Blocked |
| 2025-10-26 | Developer | BLOCKER: Only one hardcoded cliff texture rendering, not matching actual cliff variations | Blocked |
| 2025-10-26 | Developer | REQUIREMENT: Need 100% pixel-perfect match for cliffs (correct textures, all variations) | Pending |
| 2025-10-26 | Developer | Current code checkpoint ready for commit: terrain cuts + CliffRenderer integration working | Complete |

## 🎯 Current Blockers

**Coordinate System**: ✅ RESOLVED (2025-01-26)
- **Issue**: Terrain was mirrored due to incorrect use of `scene.useRightHandedSystem = true`
- **Root Cause**: Babylon.js AND mdx-m3-viewer both use left-handed coordinate system
- **Fix**: Reverted to left-handed Z-up (Babylon.js default with Z-up shaders)
- **Status**: Terrain orientation now matches mdx-m3-viewer perfectly

**Validation Status (2025-10-26)**: ✅ RESOLVED
- `npm run typecheck`: ✅ PASSED (0 errors)
- `npm run lint`: ✅ PASSED (0 errors)
- `npm run test:unit`: ✅ PASSED (132 passed, 17 skipped)
- `npm run test:e2e`: ⏸️ SKIPPED (requires dev server running on localhost:3000)
- Previous validation issues from 2025-10-27 appear to have been resolved or were outdated

**Current Architecture Mismatch (2025-10-26)**: 🚨 BLOCKER

### **Problem**: Per-Tile Geometry vs. Instanced Rendering
**Current Implementation (WRONG)**:
- W3xSimpleTerrainRenderer: Per-tile geometry (totalQuads * 4 vertices) with CPU-side filtering
- W3xWarcraftTerrainRenderer: Also using per-tile geometry approach
- Both create full mesh geometry for each tile on CPU
- Normals and heights calculated on CPU
- Inefficient and doesn't match mdx-m3-viewer approach

**mdx-m3-viewer Implementation (CORRECT)**:
- Single unit quad mesh (4 vertices total: [0,0], [1,0], [0,1], [1,1])
- Instanced rendering (65,536 instances for 256×256 map)
- Per-instance attributes: instanceID, textures (vec4), variations (vec4)
- Heightmap uploaded as texture
- Height sampling and normal calculation in vertex shader
- GPU-side filtering (degenerate vertices for cliff tiles)

### **Impact**:
- ❌ Current renderers cannot achieve pixel-perfect match
- ❌ Performance not optimal (CPU-bound geometry creation)
- ❌ Normals calculated on CPU (should be GPU via heightmap neighbors)
- ❌ Cannot seamlessly integrate cliffs/water in unified mesh

### **Key Differences**:

| Aspect | Our Simplified Approach | mdx-m3-viewer Correct Approach |
|--------|------------------------|-------------------------------|
| Geometry | Per-tile quads, filtered | Single unit quad, instanced |
| Cliff tiles | **Excluded** from ground mesh | **Included** in instance buffer |
| Height | Pre-calculated vertex positions | **Dynamic** texture lookup in shader |
| Normal calculation | Pre-calculated | **Dynamic** from height neighbors |
| Filtering | CPU-side (skip cliffs) | **GPU-side** (shader checks texture > 0) |
| Alignment | Imperfect (separate meshes) | **Perfect** (shared heightmap texture) |

### **Impact**:
- ❌ Holes between terrain and cliffs
- ❌ Incorrect texture application
- ❌ Normals don't match (no neighbor sampling)
- ❌ Cannot pass pixel-perfect tests
- ❌ Different rendering artifacts

### **Required Fix (Active Plan - 2025-10-26)**:
**Implement instanced terrain renderer matching mdx-m3-viewer exactly:**

**Phase 1: Instanced Mesh Foundation**
1. ✅ Create single unit quad mesh (4 vertices: [0,0], [1,0], [0,1], [1,1])
2. ✅ Setup thin instancing with 65,536 instances for 256×256 map
3. ✅ Per-instance buffers: instanceID (float), textures (vec4), variations (vec4)
4. ✅ **Include ALL tiles** in instance buffer (no CPU filtering)

**Phase 2: Heightmap Texture & Shaders**
5. ✅ Upload heightmap as BABYLON.RawTexture (ALPHA format, NEAREST sampling, FLOAT type)
6. ✅ Port ground vertex shader with texture lookups for height and normals
7. ✅ Dynamic position calculation: `(corner + a_position) * 128.0`
8. ✅ Dynamic normal calculation from heightmap neighbors (6 texture samples)

**Phase 3: GPU-Side Filtering**
9. ✅ Vertex shader checks if all textures are zero
10. ✅ Degenerate triangles for cliff/water tiles: `gl_Position = vec4(0.0)`
11. ✅ Proper triangle output for ground tiles with texture data

**Files to Modify**:
- `src/engine/terrain/W3xInstancedTerrainRenderer.ts` (NEW - replace both existing renderers)
- `src/engine/terrain/shaders/groundVertex.glsl` (UPDATE - add instancing support)
- `src/engine/terrain/shaders/groundFragment.glsl` (KEEP - already correct)
- `src/pages/ComparisonPage.tsx` (UPDATE - use new renderer)

## 🔄 Next Steps

### **Phase 6: Rewrite Ground Renderer with Proper Instanced Rendering** (3-4 days)

#### Task 6.1: Replace W3xSimpleTerrainRenderer with Instanced Approach

**Goal**: Match mdx-m3-viewer's rendering architecture exactly

**Changes Required**:

1. **Create Height Map Texture** (src/engine/terrain/W3xTerrainRenderer.ts:143-160)
   ```typescript
   private createHeightMapTexture(heightmap: Float32Array, width: number, height: number): RawTexture {
     return new BABYLON.RawTexture(
       heightmap,
       width,
       height,
       BABYLON.Constants.TEXTUREFORMAT_ALPHA,
       this.scene,
       false,
       false,
       BABYLON.Texture.NEAREST_SAMPLINGMODE,
       BABYLON.Constants.TEXTURETYPE_FLOAT
     );
   }
   ```

2. **Create Single Unit Quad Mesh**
   ```typescript
   private createUnitQuadMesh(): Mesh {
     const mesh = new Mesh('terrain-quad', this.scene);

     // Unit quad vertices: [0,0, 1,0, 0,1, 1,1]
     const positions = new Float32Array([
       0, 0,  // bottom-left
       1, 0,  // bottom-right
       0, 1,  // top-left
       1, 1,  // top-right
     ]);

     const indices = new Uint16Array([0, 1, 2, 1, 3, 2]);

     mesh.setVerticesData(VertexBuffer.PositionKind, positions, false, 2);
     mesh.setIndices(indices);

     return mesh;
   }
   ```

3. **Create Per-Instance Buffers** (ALL tiles, no filtering)
   ```typescript
   private setupInstancedAttributes(
     mesh: Mesh,
     cornerTextures: Uint8Array,
     cornerVariations: Uint8Array,
     tileCount: number
   ): void {
     const instanceIDs = new Float32Array(tileCount).map((_, i) => i);
     const textures = new Float32Array(tileCount * 4);
     const variations = new Float32Array(tileCount * 4);

     for (let i = 0; i < tileCount; i++) {
       textures[i * 4 + 0] = cornerTextures[i * 4 + 0];
       textures[i * 4 + 1] = cornerTextures[i * 4 + 1];
       textures[i * 4 + 2] = cornerTextures[i * 4 + 2];
       textures[i * 4 + 3] = cornerTextures[i * 4 + 3];

       variations[i * 4 + 0] = cornerVariations[i * 4 + 0];
       variations[i * 4 + 1] = cornerVariations[i * 4 + 1];
       variations[i * 4 + 2] = cornerVariations[i * 4 + 2];
       variations[i * 4 + 3] = cornerVariations[i * 4 + 3];
     }

     mesh.thinInstanceSetBuffer('a_InstanceID', instanceIDs, 1);
     mesh.thinInstanceSetBuffer('a_textures', textures, 4);
     mesh.thinInstanceSetBuffer('a_variations', variations, 4);
   }
   ```

4. **Replace Vertex Shader** (match mdx-m3-viewer exactly)
   ```glsl
   // Key changes:
   // - Use a_position (2D unit quad coords, not 3D world)
   // - Calculate corner from a_InstanceID
   // - Sample height from heightMap texture
   // - Calculate normals from neighboring height samples
   // - Degenerate tiles with texture = 0

   void main() {
     vec4 textures = a_textures - u_baseTileset;

     if (textures[0] > 0.0 || textures[1] > 0.0 ||
         textures[2] > 0.0 || textures[3] > 0.0) {
       // Calculate tile corner from instance ID
       vec2 corner = vec2(mod(a_InstanceID, u_size.x), floor(a_InstanceID / u_size.x));
       vec2 base = corner + a_position;

       // Sample height from texture
       float height = texture2D(u_heightMap, base / u_size).a;

       // Calculate normals from neighbors
       float hL = texture2D(u_heightMap, (base - vec2(1.0, 0.0)) / u_size).a;
       float hR = texture2D(u_heightMap, (base + vec2(1.0, 0.0)) / u_size).a;
       float hD = texture2D(u_heightMap, (base - vec2(0.0, 1.0)) / u_size).a;
       float hU = texture2D(u_heightMap, (base + vec2(0.0, 1.0)) / u_size).a;

       v_normal = normalize(vec3(hL - hR, hD - hU, 2.0));

       // World position
       gl_Position = u_VP * vec4(base * 128.0 + u_offset, height * 128.0, 1.0);

       // Calculate UVs...
     } else {
       // Degenerate tile (no textures) - skip rendering
       gl_Position = vec4(0.0);
       v_tilesets = vec4(0.0);
     }
   }
   ```

5. **Remove Terrain Cutting Logic**
   - DELETE cliff filtering from W3xSimpleTerrainRenderer
   - Cliffs filter themselves via shader (texture = 0 check)
   - This ensures perfect alignment

6. **Update TerrainTextureBuilder**
   - DO NOT skip cliff tiles
   - Let cornerTexture() return proper values for ALL tiles
   - Cliff tiles will have texture values, but shader will discard them if needed

#### Task 6.2: Testing & Validation

**Tests to Add/Update**:
1. Verify all 65,536 instances created (no filtering)
2. Verify heightmap texture created correctly
3. Verify shader receives correct uniforms
4. Pixel-perfect comparison test

**Success Criteria**:
- ✅ No holes between terrain and cliffs
- ✅ Textures match mdx-m3-viewer
- ✅ Normals calculated correctly
- ✅ Pixel-perfect test passes (<0.02% diff)

#### Task 6.3: Performance Validation

**Benchmarks**:
- Frame rate: 60 FPS @ 256×256 terrain
- Draw calls: 1-2 (instanced rendering)
- Memory: <200MB total

### **Estimated Effort**: 3-4 days
- Day 1: Rewrite renderer with instanced approach
- Day 2: Update shaders to match mdx-m3-viewer
- Day 3: Testing and debugging
- Day 4: Pixel-perfect validation and optimization

## 📈 Phase Exit Criteria

**This phase is COMPLETE when:**
- [x] Research phase finished
  - [x] Heightmap data structure understood
  - [x] Texture blending algorithm documented
  - [x] Ground shaders analyzed
  - [x] Implementation plan created
- [ ] Implementation phase finished
  - [ ] TerrainTextureBuilder working
  - [ ] Ground shaders ported
  - [ ] Instanced geometry rendering
  - [ ] Textures loading correctly
- [ ] Validation phase finished
  - [ ] Unit tests >85% coverage
  - [ ] Pixel-perfect test passes
  - [ ] Performance test passes (60 FPS)
  - [ ] All validation commands pass

**Ready for next phase when:**
- Terrain renders pixel-perfect match with mdx-m3-viewer
- All tests passing
- No TypeScript/ESLint errors
- Performance targets met
- Code reviewed and merged

## 📝 POST RELEASE NOTES & CLEANUP CHECKLIST

**CRITICAL - Legal Compliance:**

After terrain rendering is complete and working with hiveworkshop assets, we MUST replace all copyrighted Blizzard assets with free-license alternatives:

- [ ] **Replace hiveworkshop texture links in warcraft-manifest.json**
  - Current: `https://www.hiveworkshop.com/casc-contents?path=terrainart\dalaran\zdrt.dds`
  - Target: Free-license replacements (CC0, MIT, or original creations)

- [ ] **Create or source free-license terrain textures**
  - Ashenvale tileset alternatives
  - Barrens tileset alternatives
  - Cityscape tileset alternatives
  - Dalaran tileset alternatives
  - All other tilesets used in test maps

- [ ] **Update warcraft-manifest.json with new paths**
  - Point to `/public/assets/textures/terrain/` instead of hiveworkshop
  - Verify all texture IDs map to legal assets

- [ ] **Run legal compliance validation**
  - `npm run validate-assets` - must pass with 0 violations
  - SHA-256 hash check against Blizzard asset blacklist
  - Visual similarity detection

- [ ] **Update asset credits**
  - Document all texture sources in CREDITS.md
  - Verify licenses are CC0/MIT/original
  - Attribute creators properly

**Timeline**: This cleanup MUST happen before any public release or repository goes public.

**Responsibility**: legal-compliance agent + developer team

---

**Status**: 🟡 Research Complete - Ready for Implementation Phase 1
