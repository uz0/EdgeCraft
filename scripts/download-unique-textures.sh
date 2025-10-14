#!/bin/bash

# Download unique Polyhaven textures to replace duplicates
# All textures are CC0 licensed from polyhaven.com

set -e

TEXTURE_DIR="public/assets/textures/terrain"
BASE_URL="https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k"

echo "🎨 Downloading 8 Unique Polyhaven Textures (2K Resolution)"
echo "=========================================================="

# 1. Dark Grass → leafy_grass (green blades with brown leaves)
echo "[1/8] Downloading leafy_grass → terrain_grass_dark..."
curl -o "$TEXTURE_DIR/grass_dark.jpg" "$BASE_URL/leafy_grass/leafy_grass_diff_2k.jpg"
curl -o "$TEXTURE_DIR/grass_dark_normal.jpg" "$BASE_URL/leafy_grass/leafy_grass_nor_gl_2k.jpg"
curl -o "$TEXTURE_DIR/grass_dark_roughness.jpg" "$BASE_URL/leafy_grass/leafy_grass_rough_2k.jpg"

# 2. Ice → snow_04 (clean ice texture)
echo "[2/8] Downloading snow_04 → terrain_ice..."
curl -o "$TEXTURE_DIR/ice.jpg" "$BASE_URL/snow_04/snow_04_diff_2k.jpg"
curl -o "$TEXTURE_DIR/ice_normal.jpg" "$BASE_URL/snow_04/snow_04_nor_gl_2k.jpg"
curl -o "$TEXTURE_DIR/ice_roughness.jpg" "$BASE_URL/snow_04/snow_04_rough_2k.jpg"

# 3. Desert Dirt → red_sand (reddish-brown desert sand)
echo "[3/8] Downloading red_sand → terrain_dirt_desert..."
curl -o "$TEXTURE_DIR/dirt_desert.jpg" "$BASE_URL/red_sand/red_sand_diff_2k.jpg"
curl -o "$TEXTURE_DIR/dirt_desert_normal.jpg" "$BASE_URL/red_sand/red_sand_nor_gl_2k.jpg"
curl -o "$TEXTURE_DIR/dirt_desert_roughness.jpg" "$BASE_URL/red_sand/red_sand_rough_2k.jpg"

# 4. Frozen Dirt → sandy_gravel_02 (dusty, cold-looking ground)
echo "[4/8] Downloading sandy_gravel_02 → terrain_dirt_frozen..."
curl -o "$TEXTURE_DIR/dirt_frozen.jpg" "$BASE_URL/sandy_gravel_02/sandy_gravel_02_diff_2k.jpg"
curl -o "$TEXTURE_DIR/dirt_frozen_normal.jpg" "$BASE_URL/sandy_gravel_02/sandy_gravel_02_nor_gl_2k.jpg"
curl -o "$TEXTURE_DIR/dirt_frozen_roughness.jpg" "$BASE_URL/sandy_gravel_02/sandy_gravel_02_rough_2k.jpg"

# 5. Desert Rock → volcanic_rock_tiles (tan/brown volcanic rock)
echo "[5/8] Downloading volcanic_rock_tiles → terrain_rock_desert..."
curl -o "$TEXTURE_DIR/rock_desert.jpg" "$BASE_URL/volcanic_rock_tiles/volcanic_rock_tiles_diff_2k.jpg"
curl -o "$TEXTURE_DIR/rock_desert_normal.jpg" "$BASE_URL/volcanic_rock_tiles/volcanic_rock_tiles_nor_gl_2k.jpg"
curl -o "$TEXTURE_DIR/rock_desert_roughness.jpg" "$BASE_URL/volcanic_rock_tiles/volcanic_rock_tiles_rough_2k.jpg"

# 6. Lava → rock_08 (dark volcanic rock for lava terrain)
echo "[6/8] Downloading rock_08 → terrain_lava..."
curl -o "$TEXTURE_DIR/lava.jpg" "$BASE_URL/rock_08/rock_08_diff_2k.jpg"
curl -o "$TEXTURE_DIR/lava_normal.jpg" "$BASE_URL/rock_08/rock_08_nor_gl_2k.jpg"
curl -o "$TEXTURE_DIR/lava_roughness.jpg" "$BASE_URL/rock_08/rock_08_rough_2k.jpg"

# 7. Volcanic Ash → volcanic_herringbone_01 (gray volcanic ash texture)
echo "[7/8] Downloading volcanic_herringbone_01 → terrain_volcanic_ash..."
curl -o "$TEXTURE_DIR/volcanic_ash.jpg" "$BASE_URL/volcanic_herringbone_01/volcanic_herringbone_01_diff_2k.jpg"
curl -o "$TEXTURE_DIR/volcanic_ash_normal.jpg" "$BASE_URL/volcanic_herringbone_01/volcanic_herringbone_01_nor_gl_2k.jpg"
curl -o "$TEXTURE_DIR/volcanic_ash_roughness.jpg" "$BASE_URL/volcanic_herringbone_01/volcanic_herringbone_01_rough_2k.jpg"

# 8. Blight/Corrupted → brown_mud_03 (dark, corrupted muddy texture)
echo "[8/8] Downloading brown_mud_03 → terrain_blight_purple..."
curl -o "$TEXTURE_DIR/blight_purple.jpg" "$BASE_URL/brown_mud_03/brown_mud_03_diff_2k.jpg"
curl -o "$TEXTURE_DIR/blight_purple_normal.jpg" "$BASE_URL/brown_mud_03/brown_mud_03_nor_gl_2k.jpg"
curl -o "$TEXTURE_DIR/blight_purple_roughness.jpg" "$BASE_URL/brown_mud_03/brown_mud_03_rough_2k.jpg"

echo ""
echo "✅ All 8 unique textures downloaded successfully!"
echo "📦 Total: 24 files (8 types × 3 PBR maps each)"
echo "📏 Resolution: 2K (2048x2048)"
echo "📜 License: CC0 1.0 Universal (polyhaven.com)"
echo ""
