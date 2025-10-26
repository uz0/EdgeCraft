# Cliff Rendering Implementation Research

**Research Date**: 2025-10-26
**Source**: mdx-m3-viewer (src/vendor/mdx-m3-viewer/src/viewer/handlers/w3x/)
**Goal**: Understand cliff detection, terrain cutting, and cliff model rendering

---

## 1. Overview: How Cliffs Work in WC3

Cliffs are **special terrain tiles** where corner heights differ, requiring:
1. **Detection**: Identify tiles with height changes
2. **Terrain Cutting**: Do NOT render ground texture on cliff tiles
3. **Cliff Models**: Load MDX models representing cliff geometry
4. **Cliff Textures**: Apply cliff-specific textures (from CliffTypes.slk)

**Key Insight**: Cliffs replace ground tiles, they don't overlay them.

---

## 2. Cliff Detection Algorithm

### 2.1 isCliff() Function

**File**: `src/vendor/mdx-m3-viewer/src/viewer/handlers/w3x/map.ts:932-944`

```typescript
isCliff(column: number, row: number): boolean {
  if (column < 1 || column > this.columns - 1 || row < 1 || row > this.rows - 1) {
    return false;
  }

  const corners = this.corners;
  const bottomLeft = corners[row][column].layerHeight;
  const bottomRight = corners[row][column + 1].layerHeight;
  const topLeft = corners[row + 1][column].layerHeight;
  const topRight = corners[row + 1][column + 1].layerHeight;

  return bottomLeft !== bottomRight || bottomLeft !== topLeft || bottomLeft !== topRight;
}
```

**Logic**:
- A tile is a cliff if ANY of its 4 corner heights differ
- Compare `layerHeight` field (NOT `groundHeight`)
- `layerHeight` = cliff level (0-15)
- If all 4 corners same height → flat ground
- If any difference → cliff tile

**Example**:
```
Flat Ground (NOT cliff):
  2 --- 2
  |     |
  2 --- 2
  (all heights = 2)

Cliff Tile (IS cliff):
  2 --- 3
  |     |
  2 --- 3
  (heights differ)
```

---

## 3. Cliff Filename Generation

### 3.1 cliffFileName() Function

**File**: `src/vendor/mdx-m3-viewer/src/viewer/handlers/w3x/map.ts:893-906`

```typescript
cliffFileName(
  bottomLeftLayer: number,
  bottomRightLayer: number,
  topLeftLayer: number,
  topRightLayer: number,
  base: number
): string {
  return (
    String.fromCharCode(65 + bottomLeftLayer - base) +
    String.fromCharCode(65 + topLeftLayer - base) +
    String.fromCharCode(65 + topRightLayer - base) +
    String.fromCharCode(65 + bottomRightLayer - base)
  );
}
```

**Logic**:
- `base` = minimum height among 4 corners
- Each letter encodes relative height: A=0, B=1, C=2, D=3
- Order: **BL → TL → TR → BR** (counter-clockwise from bottom-left)

**Example**:
```
Heights:
  2 --- 3
  |     |
  2 --- 3

base = min(2, 2, 3, 3) = 2
BL = 2-2 = 0 → 'A'
TL = 2-2 = 0 → 'A'
TR = 3-2 = 1 → 'B'
BR = 3-2 = 1 → 'B'

fileName = "AABB"
```

**Special Cases**:
- `"AAAA"` = flat cliff (all same height) → **skip** (line 321)
- `"AAAB"` = single-height ramp
- `"ABBA"` = diagonal cliff
- `"ABCD"` = multi-level cliff

---

## 4. Terrain Cutting (Crucial!)

### 4.1 How Ground Tiles are Filtered

**File**: `src/vendor/mdx-m3-viewer/src/viewer/handlers/w3x/map.ts:307-343`

```typescript
for (let y = 0; y < rows; y++) {
  for (let x = 0; x < columns; x++) {
    if (y < rows - 1 && x < columns - 1) {
      waterFlags[instance] = this.isWater(x, y);

      // Is this a cliff, or a normal corner?
      if (this.isCliff(x, y)) {
        // CLIFF TILE PATH (lines 308-343)
        // - Build cliff model instances
        // - Store positions and textures
        // - DO NOT set cornerTextures for ground rendering
      } else {
        // GROUND TILE PATH (lines 344-387)
        // - Set cornerTextures and cornerVariations
        // - Will be rendered by ground shader
      }
      instance += 1;
    }
  }
}
```

**Critical Understanding**:
- When `isCliff(x, y) === true`:
  - **Skip** setting `cornerTextures[instance * 4]`
  - This tile's textures remain **0** (default)
  - Ground shader will see `texture = 0` and **skip rendering** that tile

**This is NOT done via mesh filtering!**
- mdx-m3-viewer **includes ALL tiles** in instance buffer
- Cliff tiles have `cornerTextures = [0, 0, 0, 0]`
- Vertex shader checks `if (textures[0] > 0.0 || ...)` and degenerates if all zeros

**From ground.vert.ts:54-75**:
```glsl
void main() {
  vec4 textures = a_textures - u_baseTileset;

  if (textures[0] > 0.0 || textures[1] > 0.0 ||
      textures[2] > 0.0 || textures[3] > 0.0) {
    // RENDER THIS TILE (normal ground)
    // ... calculate position, UVs, normals
    gl_Position = u_VP * vec4(worldPos, 1.0);
  } else {
    // DEGENERATE TILE (cliff or water without ground)
    gl_Position = vec4(0.0);  // <-- Invisible triangle
  }
}
```

**Why This Matters**:
- Terrain and cliffs use **same heightmap texture**
- Cliff vertices sample neighbors for perfect alignment
- No gaps or z-fighting
- GPU-side filtering is efficient

---

## 5. Cliff Model Loading

### 5.1 Cliff Accumulation

**File**: `src/vendor/mdx-m3-viewer/src/viewer/handlers/w3x/map.ts:288-342`

```typescript
const cliffs: { [key: string]: { locations: number[]; textures: number[] } } = {};

// Inside cliff detection loop:
if (fileName !== 'AAAA') {
  let cliffTexture = bottomLeft.cliffTexture;

  // Special case: texture 15 → 1
  if (cliffTexture === 15) {
    cliffTexture = 1;
  }

  const cliffRow = this.cliffTilesets[cliffTexture];
  const dir = cliffRow.string('cliffModelDir');
  const path = `Doodads\\Terrain\\${dir}\\${dir}${fileName}${getCliffVariation(dir, fileName, bottomLeft.cliffVariation)}.mdx`;

  if (!cliffs[path]) {
    cliffs[path] = { locations: [], textures: [] };
  }

  cliffs[path].locations.push(
    (x + 1) * 128 + centerOffset[0],  // X: Right edge of tile
    y * 128 + centerOffset[1],         // Y: Bottom edge
    (base - 2) * 128                   // Z: Base height - 2 offset
  );
  cliffs[path].textures.push(cliffTexture);
}
```

**Data Structure**:
- `cliffs` object groups by **path** (unique MDX file)
- Each path has:
  - `locations`: [x1, y1, z1, x2, y2, z2, ...] (flat array, 3 floats per instance)
  - `textures`: [textureIndex1, textureIndex2, ...] (which cliff texture to use)

**Cliff Position Calculation**:
- X: `(column + 1) * 128 + centerOffset[0]`
  **Why +1?** Cliff models are left-aligned, so position is right edge of tile
- Y: `row * 128 + centerOffset[1]`
  Bottom edge of tile
- Z: `(base - 2) * 128`
  **Why -2?** Cliff models are offset 2 layers down for proper alignment

**Cliff Texture Index**:
- From `w3e.groundTiles[row][column].cliffTexture` (0-15)
- Maps to `cliffTilesets` array (loaded from CliffTypes.slk)
- Special case: `15 → 1` (unknown reason, hardcoded)

---

## 6. CliffTypes.slk Data

### 6.1 File Location

**Path**: `TerrainArt\\CliffTypes.slk` (loaded from CASC or local)

**File**: `src/vendor/mdx-m3-viewer/src/viewer/handlers/w3x/viewer.ts:72`

```typescript
this.loadBaseFile('TerrainArt\\CliffTypes.slk', 'text')
```

### 6.2 Data Structure

**Parsed by**: `MappedData` class (same as terrain.slk)

**Fields Used**:
- `cliffModelDir`: Directory name for MDX models (e.g., "Cliffs", "DalaranCliffs")
- `texDir`: Texture directory
- `texFile`: Texture filename
- `groundTile`: Associated ground tileset ID

**Example Row**:
```
cliffID: "CLdi"
cliffModelDir: "DalaranCliffs"
texDir: "TerrainArt\\CliffTextures\\Dalaran"
texFile: "DalaranCliff"
groundTile: "Ldrt"
```

**Usage in Code** (map.ts:329-331):
```typescript
const cliffRow = this.cliffTilesets[cliffTexture];
const dir = cliffRow.string('cliffModelDir');
const path = `Doodads\\Terrain\\${dir}\\${dir}${fileName}${variation}.mdx`;
```

---

## 7. Cliff Variations

### 7.1 getCliffVariation() Function

**File**: `src/vendor/mdx-m3-viewer/src/viewer/handlers/w3x/variations.ts:136-142`

```typescript
export default function getCliffVariation(dir: string, tag: string, variation: number): number {
  if (dir === 'Cliffs') {
    return Math.min(variation, cliffVariations[tag]);
  } else {
    return Math.min(variation, cityCliffVariations[tag]);
  }
}
```

**Variation Tables**:
- `cliffVariations`: Standard cliffs (most tilesets)
- `cityCliffVariations`: City-style cliffs (Dalaran, Lordaeron, Village)

**Example Entries**:
```typescript
cliffVariations = {
  'AAAB': 1,  // Max 1 variation for simple ramp
  'AABB': 2,  // Max 2 variations for L-corner
  'ABBA': 2,  // Max 2 variations for diagonal
  'AAAA': 0,  // Flat (not rendered)
  // ... 67 total entries
}

cityCliffVariations = {
  'AAAB': 2,  // City ramps have more variations
  'AABB': 3,
  'ABBA': 3,
  // ... different max values
}
```

**Variation Filename**:
- If `variation = 0`: No suffix (e.g., `CliffsAAAB.mdx`)
- If `variation > 0`: Numeric suffix (e.g., `CliffsAAAB1.mdx`)

**Full Path Example**:
```
dir = "DalaranCliffs"
fileName = "AABB"
variation = cliffVariation from w3e = 2
maxVariation = cityCliffVariations["AABB"] = 3
clampedVariation = Math.min(2, 3) = 2

finalPath = "Doodads\\Terrain\\DalaranCliffs\\DalaranCliffsAAAB2.mdx"
```

---

## 8. Cliff Rendering Pipeline

### 8.1 TerrainModel Class

**File**: `src/vendor/mdx-m3-viewer/src/viewer/handlers/w3x/terrainmodel.ts`

**Purpose**: Renders a single cliff MDX model with multiple instances

**Constructor**:
```typescript
constructor(
  map: War3MapViewerMap,
  arrayBuffer: ArrayBuffer,      // MDX file data
  locations: number[],            // [x1,y1,z1, x2,y2,z2, ...]
  textures: number[],             // [textureIndex1, textureIndex2, ...]
  shader: Shader                  // Cliff shader
)
```

**Process**:
1. Parse MDX model (vertices, normals, UVs, faces)
2. Create vertex buffer (vertices + normals + UVs)
3. Create per-instance buffer (locations + textures)
4. Setup instanced attributes (VAO or manual)
5. Store instance count and element count

**Rendering**:
```typescript
render(shader: Shader): void {
  // Bind VAO or manual buffers
  // Draw instanced: gl.drawElementsInstanced(TRIANGLES, elements, UNSIGNED_SHORT, 0, instances)
}
```

### 8.2 Cliff Shader

**Vertex Shader** (cliffs.vert.ts):
```glsl
uniform mat4 u_VP;
uniform sampler2D u_heightMap;  // Shares heightmap with terrain!
uniform vec2 u_pixel;
uniform vec2 u_centerOffset;

attribute vec3 a_position;      // Model vertex position
attribute vec3 a_normal;
attribute vec2 a_uv;
attribute vec3 a_instancePosition;  // Per-instance world position
attribute float a_instanceTexture;  // Per-instance texture index

void main() {
  // Calculate tile corner from instance position
  vec2 corner = floor((a_instancePosition.xy - vec2(1.0, 0.0) - u_centerOffset) / 128.0);

  // Sample 4 heights from heightmap (bilinear interpolation)
  float bottomLeft = texture2D(u_heightMap, corner * u_pixel + halfPixel).a;
  float bottomRight = texture2D(u_heightMap, (corner + vec2(1.0, 0.0)) * u_pixel + halfPixel).a;
  float topLeft = texture2D(u_heightMap, (corner + vec2(0.0, 1.0)) * u_pixel + halfPixel).a;
  float topRight = texture2D(u_heightMap, (corner + vec2(1.0, 1.0)) * u_pixel + halfPixel).a;

  // Bilinear interpolation for smooth height transition
  float bottom = mix(bottomRight, bottomLeft, -a_position.x / 128.0);
  float top = mix(topRight, topLeft, -a_position.x / 128.0);
  float height = mix(bottom, top, a_position.y / 128.0);

  // Final position: model vertex + instance position + height from map
  v_position = a_position + vec3(a_instancePosition.xy, a_instancePosition.z + height * 128.0);
  gl_Position = u_VP * vec4(v_position, 1.0);
}
```

**Fragment Shader** (cliffs.frag.ts):
```glsl
uniform sampler2D u_texture1;  // Cliff texture 1
uniform sampler2D u_texture2;  // Cliff texture 2

varying float v_texture;  // Instance texture index (0 or 1)

vec4 sample(float texture, vec2 uv) {
  int i = int(texture + 0.1);
  if (i == 0) {
    return texture2D(u_texture1, uv);
  } else {
    return texture2D(u_texture2, uv);
  }
}

void main() {
  gl_FragColor = sample(v_texture, v_uv);
}
```

**Key Insight**: Cliff shader samples **same heightmap texture** as ground shader!
- This ensures cliffs align perfectly with terrain
- Bilinear interpolation smooths cliff vertices to terrain heights
- No gaps or z-fighting

---

## 9. cornerTexture() - Ground Texture Selection

### 9.1 Algorithm

**File**: `src/vendor/mdx-m3-viewer/src/viewer/handlers/w3x/map.ts:980-1008`

```typescript
cornerTexture(column: number, row: number): number {
  const corners = this.corners;
  const columns = this.columns;
  const rows = this.rows;

  // Check 3×3 neighborhood for cliffs
  for (let y = -1; y < 1; y++) {
    for (let x = -1; x < 1; x++) {
      if (column + x > 0 && column + x < columns - 1 &&
          row + y > 0 && row + y < rows - 1) {
        if (this.isCliff(column + x, row + y)) {
          // Adjacent cliff found - use cliff's ground texture
          let texture = corners[row + y][column + x].cliffTexture;
          if (texture === 15) {
            texture = 1;
          }
          return this.cliffGroundIndex(texture);
        }
      }
    }
  }

  const corner = corners[row][column];

  // Check for blight
  if (corner.blight) {
    return this.blightTextureIndex;
  }

  // Normal ground texture
  return corner.groundTexture;
}
```

**Logic**:
1. **Check neighbors**: Look at 8 surrounding tiles + self (3×3 grid)
2. **If cliff nearby**: Use cliff's associated ground texture (from CliffTypes.slk `groundTile`)
3. **Else if blighted**: Use blight texture
4. **Else**: Use normal `groundTexture` from corner

**Why This Matters**:
- Tiles adjacent to cliffs get cliff-matching textures for smooth transitions
- Example: Grass cliff in dirt terrain → nearby dirt tiles become grass

### 9.2 cliffGroundIndex() Helper

**File**: `src/vendor/mdx-m3-viewer/src/viewer/handlers/w3x/map.ts:964-975`

```typescript
cliffGroundIndex(whichCliff: number): number {
  const whichTileset = this.cliffTilesets[whichCliff].string('groundTile');
  const tilesets = this.tilesets;

  for (let i = 0, l = tilesets.length; i < l; i++) {
    if (tilesets[i].string('tileID') === whichTileset) {
      return i;
    }
  }

  return 0;
}
```

**Process**:
1. Get `groundTile` ID from CliffTypes.slk (e.g., "Ldrt" for Lordaeron Dirt)
2. Find matching tileset in loaded textures
3. Return index into `tilesetTextures` array

---

## 10. Implementation Steps for Babylon.js

### Step 1: Cliff Detection
- **DONE**: `CliffDetector.ts` already implements `isCliff()` and `detectCliffs()`
- Matches mdx-m3-viewer logic exactly

### Step 2: Terrain Cutting
- **CURRENT ISSUE**: We're filtering cliff tiles on CPU (removing from mesh)
- **CORRECT APPROACH**: Include ALL tiles, set `cornerTextures = 0` for cliffs
- **Action**: Modify `TerrainTextureBuilder` to NOT skip cliff tiles

### Step 3: Update Ground Shader
- **Add degenerate tile check** in vertex shader:
  ```glsl
  if (a_textures[0] > 0.0 || a_textures[1] > 0.0 || ...) {
    // Render ground tile
  } else {
    gl_Position = vec4(0.0);  // Skip cliff tile
  }
  ```

### Step 4: Cliff Model Loading
- **Use existing** `CliffDetector.detectCliffs()` for positions
- Load MDX models via `TerrainModel` equivalent
- Create per-instance buffers for cliff positions

### Step 5: Cliff Shader
- Port `cliffs.vert.ts` and `cliffs.frag.ts`
- **Share heightmap texture** with ground shader
- Implement bilinear height interpolation

### Step 6: Cliff Textures
- Load from `CliffTypes.slk` (already have `CliffTypesLoader`)
- Bind 2 cliff textures to shader (`u_texture1`, `u_texture2`)

---

## 11. Code Snippets for Implementation

### 11.1 Updated TerrainTextureBuilder (DO NOT SKIP CLIFFS)

```typescript
// In buildTextureArrays():
for (let y = 0; y < rows - 1; y++) {
  for (let x = 0; x < columns - 1; x++) {
    if (this.isCliff(x, y, w3e)) {
      // CLIFF TILE - Set textures to 0 (shader will skip)
      cornerTextures[instance * 4 + 0] = 0;
      cornerTextures[instance * 4 + 1] = 0;
      cornerTextures[instance * 4 + 2] = 0;
      cornerTextures[instance * 4 + 3] = 0;

      cornerVariations[instance * 4 + 0] = 0;
      cornerVariations[instance * 4 + 1] = 0;
      cornerVariations[instance * 4 + 2] = 0;
      cornerVariations[instance * 4 + 3] = 0;
    } else {
      // GROUND TILE - Normal texture logic
      const bottomLeftTexture = this.cornerTexture(x, y, w3e);
      // ... rest of texture blending algorithm
    }
    instance++;
  }
}
```

### 11.2 Updated Ground Vertex Shader

```glsl
void main() {
  vec4 textures = a_textures - u_baseTileset;

  if (textures[0] > 0.0 || textures[1] > 0.0 ||
      textures[2] > 0.0 || textures[3] > 0.0) {
    // GROUND TILE - Render normally
    vec2 corner = vec2(mod(a_InstanceID, u_size.x), floor(a_InstanceID / u_size.x));
    vec2 base = corner + a_position;
    float height = texture2D(u_heightMap, base / u_size).a;

    // ... calculate normals, UVs, etc.

    gl_Position = u_VP * vec4(base * 128.0 + u_offset, height * 128.0, 1.0);
  } else {
    // CLIFF/WATER TILE - Degenerate
    gl_Position = vec4(0.0);
    v_tilesets = vec4(0.0);
    v_normal = vec3(0.0);
  }
}
```

### 11.3 Cliff Renderer Integration

```typescript
async renderCliffs(w3e: W3ETerrain): Promise<void> {
  // 1. Detect cliffs
  const detector = new CliffDetector(w3e);
  const cliffData = detector.detectCliffs();

  // 2. Load CliffTypes.slk
  const cliffTypesData = await this.cliffTypesLoader.load();

  // 3. Load cliff textures
  const cliffTextures = await this.loadCliffTextures(cliffData, cliffTypesData);

  // 4. Create cliff shader
  const cliffShader = this.createCliffShader();
  cliffShader.setTexture('u_heightMap', this.heightmapTexture);  // SHARE with ground!
  cliffShader.setTexture('u_texture1', cliffTextures[0]);
  cliffShader.setTexture('u_texture2', cliffTextures[1]);

  // 5. For each unique cliff model:
  for (const [path, instances] of cliffData.instances.entries()) {
    // Load MDX model
    const modelData = await this.loadMDXModel(path);

    // Create TerrainModel (instanced cliff mesh)
    const cliffModel = this.createCliffModel(modelData, instances, cliffShader);

    // Render
    cliffModel.render();
  }
}
```

---

## 12. Key Takeaways

### Critical Points:
1. **Cliffs are detected by comparing corner heights** (`layerHeight` field)
2. **Cliff tiles have cornerTextures = 0** (NOT removed from mesh)
3. **Ground shader skips cliff tiles** via GPU-side check (`gl_Position = vec4(0.0)`)
4. **Cliffs share heightmap texture** with ground for perfect alignment
5. **Cliff models use instanced rendering** (same as ground tiles)
6. **Cliff positions are calculated with +1 offset** (right edge of tile)
7. **Cliff filenames encode relative heights** (AAAB, ABBA, etc.)
8. **Cliff variations are clamped** based on model type (standard vs city)

### What We Need to Fix:
1. ✅ **DO NOT filter cliff tiles on CPU** - include all in instance buffer
2. ✅ **Set cornerTextures = 0 for cliffs** in TerrainTextureBuilder
3. ✅ **Add degenerate tile check** in ground vertex shader
4. ✅ **Share heightmap texture** between ground and cliff shaders
5. ✅ **Implement cliff model loading** with proper instancing
6. ✅ **Port cliff shaders** (vertex + fragment)

### Files to Modify:
- `src/engine/terrain/TerrainTextureBuilder.ts` - Include cliffs, set textures = 0
- `src/engine/terrain/shaders/groundVertex.glsl` - Add degenerate check
- `src/engine/terrain/CliffRenderer.ts` - Implement cliff rendering
- `src/engine/terrain/shaders/cliffVertex.glsl` - NEW: Port from mdx-m3-viewer
- `src/engine/terrain/shaders/cliffFragment.glsl` - NEW: Port from mdx-m3-viewer
- `src/engine/terrain/W3xSimpleTerrainRenderer.ts` - Remove CPU filtering

---

## 13. Next Steps

1. **Update TerrainTextureBuilder**
   - Remove `if (!this.isCliff(...)) skip` logic
   - Add `if (this.isCliff(...)) set textures = 0`

2. **Update Ground Shader**
   - Add `if (textures all zero) degenerate` check in vertex shader

3. **Implement Cliff Rendering**
   - Port `TerrainModel` class to Babylon.js
   - Load MDX cliff models
   - Create per-instance buffers (locations + textures)
   - Render with cliff shader

4. **Port Cliff Shaders**
   - `cliffVertex.glsl` - Bilinear height interpolation
   - `cliffFragment.glsl` - Texture sampling

5. **Test Integration**
   - Visual comparison with mdx-m3-viewer
   - Verify no gaps between terrain and cliffs
   - Verify cliff textures match
   - Pixel-perfect tests

---

**Research Complete**: Ready for implementation phase.
