#!/bin/bash
#
# Fix missing textures by reusing existing successful ones
# This is acceptable for Phase 2 alpha quality
#

set -e
TEXTURE_DIR="public/assets/textures/terrain"

cd "$TEXTURE_DIR"

echo "Fixing missing textures by reusing existing ones..."

# Copy grass_light (successful) to grass_dark
cp grass_light.jpg grass_dark.jpg
cp grass_light_normal.jpg grass_dark_normal.jpg
cp grass_light_roughness.jpg grass_dark_roughness.jpg

# Copy rock_gray (successful) to ice
cp rock_gray.jpg ice.jpg
cp rock_gray_normal.jpg ice_normal.jpg
cp rock_gray_roughness.jpg ice_roughness.jpg

# Copy dirt_brown (successful) to dirt_desert and dirt_frozen
cp dirt_brown.jpg dirt_desert.jpg
cp dirt_brown_normal.jpg dirt_desert_normal.jpg
cp dirt_brown_roughness.jpg dirt_desert_roughness.jpg

cp dirt_brown.jpg dirt_frozen.jpg
cp dirt_brown_normal.jpg dirt_frozen_normal.jpg
cp dirt_brown_roughness.jpg dirt_frozen_roughness.jpg

# Copy grass_dirt_mix to leaves
cp grass_dirt_mix.jpg leaves.jpg
cp grass_dirt_mix_normal.jpg leaves_normal.jpg
cp grass_dirt_mix_roughness.jpg leaves_roughness.jpg

# Copy rock_gray to rock_desert
cp rock_gray.jpg rock_desert.jpg
cp rock_gray_normal.jpg rock_desert_normal.jpg
cp rock_gray_roughness.jpg rock_desert_roughness.jpg

# Copy snow_clean (successful) to keep as is
# (already downloaded successfully)

# Copy dirt_brown to blight_purple
cp dirt_brown.jpg blight_purple.jpg
cp dirt_brown_normal.jpg blight_purple_normal.jpg
cp dirt_brown_roughness.jpg blight_purple_roughness.jpg

# Copy rock_gray to volcanic_ash and lava
cp rock_gray.jpg volcanic_ash.jpg
cp rock_gray_normal.jpg volcanic_ash_normal.jpg
cp rock_gray_roughness.jpg volcanic_ash_roughness.jpg

cp rock_gray.jpg lava.jpg
cp rock_gray_normal.jpg lava_normal.jpg
cp rock_gray_roughness.jpg lava_roughness.jpg

echo "✅ All textures fixed!"
echo "Note: Some textures are duplicates for Phase 2 alpha quality."
echo "They can be replaced with unique textures in Phase 3."
