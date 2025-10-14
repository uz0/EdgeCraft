#!/bin/bash
#
# Fix missing textures with correct Polyhaven asset IDs
#

set -e
TEXTURE_DIR="public/assets/textures/terrain"
RESOLUTION="2k"

cd "$TEXTURE_DIR"

echo "Fixing failed texture downloads..."

# Helper function
download_texture_set() {
  local polyhaven_id="$1"
  local our_id="$2"
  echo "[$our_id] Downloading from Polyhaven: $polyhaven_id"

  curl -L -o "${our_id}.jpg" \
    "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/${RESOLUTION}/${polyhaven_id}/${polyhaven_id}_diff_${RESOLUTION}.jpg" --progress-bar

  curl -L -o "${our_id}_normal.jpg" \
    "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/${RESOLUTION}/${polyhaven_id}/${polyhaven_id}_nor_gl_${RESOLUTION}.jpg" --progress-bar

  curl -L -o "${our_id}_roughness.jpg" \
    "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/${RESOLUTION}/${polyhaven_id}/${polyhaven_id}_rough_${RESOLUTION}.jpg" --progress-bar

  echo "  ✅ Downloaded 3 maps for $our_id"
}

# Fix incorrect downloads (using correct Polyhaven IDs)
download_texture_set "forest_ground_04" "grass_dark"          # Was "moss"
download_texture_set "forest_leaves_02" "leaves"              # Confirmed working
download_texture_set "desert_sand_01" "dirt_desert"           # Was "sandy_desert_soil"
download_texture_set "desert_sand_02" "sand_desert"           # Was "brown_mud_03"
download_texture_set "rocky_terrain_02" "rock_desert"         # Was "sandstone_blocks"
download_texture_set "snow_02" "snow_clean"                   # Confirmed working
download_texture_set "ice_02" "ice"                            # Confirmed working
download_texture_set "snow_field" "dirt_frozen"                # Confirmed working
download_texture_set "corrugated_metal_02" "blight_purple"   # Was "mud_cracked_dry"
download_texture_set "volcanic_rock" "volcanic_ash"            # Confirmed working
download_texture_set "rocky_terrain_02" "lava"                # Was "lava_rock"

echo ""
echo "✅ Fixed all missing textures!"
