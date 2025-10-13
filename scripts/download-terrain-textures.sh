#!/bin/bash
#
# Download all terrain textures for PRP 2.12 from Polyhaven.com (CC0)
# This script downloads 16 terrain texture sets (48 files total)
#

set -e  # Exit on error

TEXTURE_DIR="public/assets/textures/terrain"
RESOLUTION="2k"

# Create directory
mkdir -p "$TEXTURE_DIR"
cd "$TEXTURE_DIR"

echo "============================================"
echo "Downloading Terrain Textures from Polyhaven"
echo "Resolution: ${RESOLUTION}"
echo "License: CC0 1.0 Universal (Public Domain)"
echo "============================================"

# Helper function to download a texture set
download_texture_set() {
  local polyhaven_id="$1"
  local our_id="$2"
  echo ""
  echo "[$our_id] Downloading from Polyhaven: $polyhaven_id"

  # Diffuse (base color)
  curl -L -o "${our_id}.jpg" \
    "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/${RESOLUTION}/${polyhaven_id}/${polyhaven_id}_diff_${RESOLUTION}.jpg" \
    --progress-bar

  # Normal map (OpenGL format)
  curl -L -o "${our_id}_normal.jpg" \
    "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/${RESOLUTION}/${polyhaven_id}/${polyhaven_id}_nor_gl_${RESOLUTION}.jpg" \
    --progress-bar

  # Roughness map
  curl -L -o "${our_id}_roughness.jpg" \
    "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/${RESOLUTION}/${polyhaven_id}/${polyhaven_id}_rough_${RESOLUTION}.jpg" \
    --progress-bar

  echo "  ✅ Downloaded 3 maps for $our_id"
}

# ============================================
# Warcraft 3 Terrain Types
# ============================================

# 1. Grass/Dirt Mix - use "coast_sand_rocks_02" (mixed terrain)
download_texture_set "coast_sand_rocks_02" "grass_dirt_mix"

# 2. Vines - use "bark_willow_02" (organic, rough)
download_texture_set "bark_willow_02" "vines"

# 3. Dark Grass - use "moss" (dark green)
download_texture_set "moss" "grass_dark"

# 4. Rough Rock - use "rock_06" (rough, craggy)
download_texture_set "rock_06" "rock_rough"

# 5. Forest Floor Leaves - use "forest_leaves_02"
download_texture_set "forest_leaves_02" "leaves"

# 6. Desert Dirt - use "sandy_desert_soil" (dry, cracked)
download_texture_set "sandy_desert_soil" "dirt_desert"

# 7. Desert Sand - use "brown_mud_03" (sandy)
download_texture_set "brown_mud_03" "sand_desert"

# 8. Desert Rock - use "sandstone_blocks" (desert stone)
download_texture_set "sandstone_blocks" "rock_desert"

# 9. Green Grass - use "aerial_grass_rock"
download_texture_set "aerial_grass_rock" "grass_green"

# 10. Clean Snow - use "snow_02"
download_texture_set "snow_02" "snow_clean"

# 11. Ice - use "ice_02"
download_texture_set "ice_02" "ice"

# 12. Frozen Dirt - use "snow_field" (snowy ground)
download_texture_set "snow_field" "dirt_frozen"

# ============================================
# StarCraft 2 Terrain Types (Sci-Fi)
# ============================================

# 13. Metal Platform - use "metal_plate" (tech)
download_texture_set "metal_plate" "metal_platform"

# 14. Alien Blight - use "mud_cracked_dry" (corrupted)
download_texture_set "mud_cracked_dry" "blight_purple"

# 15. Volcanic Ash - use "volcanic_rock" (dark volcanic)
download_texture_set "volcanic_rock" "volcanic_ash"

# 16. Lava - use "lava_rock" (molten rock)
download_texture_set "lava_rock" "lava"

echo ""
echo "============================================"
echo "✅ Download Complete!"
echo "============================================"
echo "Total texture files: 48 (16 sets × 3 maps)"
echo "Total size: ~80-100 MB"
echo "License: CC0 1.0 Universal"
echo "Source: https://polyhaven.com"
echo "============================================"
