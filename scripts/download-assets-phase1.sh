#!/bin/bash

# EdgeCraft Asset Downloader - Phase 1 MVP
# Downloads CC0 textures from Polyhaven and provides instructions for Quaternius models
#
# Prerequisites:
#   - curl (installed by default on macOS/Linux)
#   - unzip (for model packs)
#
# Usage:
#   bash scripts/download-assets-phase1.sh

set -e  # Exit on error

echo "======================================"
echo "EdgeCraft Asset Downloader - Phase 1"
echo "======================================"
echo ""
echo "Downloading 3 terrain textures (CC0) from Polyhaven..."
echo "Downloading 3 doodad models (CC0) from Quaternius..."
echo ""

# Create directories
echo "[1/5] Creating asset directories..."
mkdir -p public/assets/textures/terrain
mkdir -p public/assets/models/doodads
mkdir -p public/assets/.downloads

echo "✅ Directories created"
echo ""

# Download Polyhaven textures
# Polyhaven API: https://api.polyhaven.com/files/{asset_id}
# Format: .../2k-JPG/{file}.jpg

DOWNLOAD_DIR="public/assets/.downloads"
TEXTURE_DIR="public/assets/textures/terrain"

echo "[2/5] Downloading terrain textures from Polyhaven (CC0)..."
echo ""

# Function to download Polyhaven texture set
download_polyhaven_texture() {
    local asset_id=$1
    local base_name=$2
    local output_prefix=$3

    echo "  → Downloading ${base_name}..."

    # Get asset metadata from Polyhaven API
    local api_url="https://api.polyhaven.com/files/${asset_id}"

    # Download diffuse map (2K JPG)
    echo "    - Diffuse map..."
    curl -L -o "${TEXTURE_DIR}/${output_prefix}.jpg" \
        "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/${asset_id}/${asset_id}_diff_2k.jpg" \
        --progress-bar --fail --retry 3

    # Download normal map (OpenGL format, 2K JPG)
    echo "    - Normal map..."
    curl -L -o "${TEXTURE_DIR}/${output_prefix}_normal.jpg" \
        "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/${asset_id}/${asset_id}_nor_gl_2k.jpg" \
        --progress-bar --fail --retry 3

    # Download roughness map (2K JPG)
    echo "    - Roughness map..."
    curl -L -o "${TEXTURE_DIR}/${output_prefix}_roughness.jpg" \
        "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/${asset_id}/${asset_id}_rough_2k.jpg" \
        --progress-bar --fail --retry 3

    echo "  ✅ ${base_name} complete (3 files)"
    echo ""
}

# Download all 3 texture sets
download_polyhaven_texture "sparse_grass" "Sparse Grass" "grass_light"
download_polyhaven_texture "dirt_floor" "Dirt Floor" "dirt_brown"
download_polyhaven_texture "rock_surface" "Rock Surface" "rock_gray"

echo "✅ All textures downloaded (9 files total)"
echo ""

# Download Quaternius models
echo "[3/5] Downloading doodad models from Quaternius (CC0)..."
echo ""

# Quaternius Ultimate Nature Pack
# Direct download link (may change, check https://quaternius.com/packs/ultimatenature.html)
MODELS_ZIP="${DOWNLOAD_DIR}/quaternius-ultimate-nature.zip"
MODELS_EXTRACT="${DOWNLOAD_DIR}/quaternius-ultimate-nature"

echo "  → Downloading Ultimate Nature Pack..."
echo "    (This may take a minute - pack is ~21MB)"

# Try direct download from itch.io (requires the pack to be publicly accessible)
# Note: This URL may need to be updated if Quaternius changes hosting
QUATERNIUS_URL="https://quaternius.com/assets/packs/UltimateNaturePack.zip"

if curl -L -o "${MODELS_ZIP}" "${QUATERNIUS_URL}" --progress-bar --fail --retry 3 2>/dev/null; then
    echo "  ✅ Download complete"
else
    echo "  ⚠️  Automatic download failed"
    echo ""
    echo "  Please download manually:"
    echo "    1. Visit: https://quaternius.com/packs/ultimatenature.html"
    echo "    2. Click 'Download' (free, no account needed)"
    echo "    3. Save ZIP to: ${MODELS_ZIP}"
    echo "    4. Re-run this script"
    echo ""
    exit 1
fi

# Extract ZIP
echo ""
echo "  → Extracting models..."
unzip -q "${MODELS_ZIP}" -d "${MODELS_EXTRACT}"
echo "  ✅ Extraction complete"
echo ""

# Find and copy the 3 models we need
echo "[4/5] Locating tree, bush, and rock models..."
echo ""

# Note: Actual filenames may vary - these are common patterns
# User may need to manually identify correct models

MODELS_SOURCE="${MODELS_EXTRACT}/fbx"  # Models are usually in an fbx/ subdirectory

if [ -d "$MODELS_SOURCE" ]; then
    # List available models for user to identify
    echo "  Available FBX models in pack:"
    find "$MODELS_SOURCE" -name "*.fbx" | head -20
    echo ""
    echo "  ⚠️  MANUAL STEP REQUIRED:"
    echo "  1. Review the list above"
    echo "  2. Identify these 3 models:"
    echo "     - A tree (oak/generic tree)"
    echo "     - A bush/shrub"
    echo "     - A rock/boulder"
    echo "  3. Run the Blender conversion script:"
    echo "     python3 scripts/convert-fbx-to-glb.py"
    echo ""
else
    echo "  ⚠️  Could not find FBX models directory"
    echo "  Please extract manually and locate .fbx files"
    echo ""
fi

# Create placeholder GLB files (user will replace these)
echo "[5/5] Setting up placeholders..."

# Create a simple marker file
echo '{"note": "Replace this with actual GLB model from Quaternius pack"}' > public/assets/models/doodads/.pending

echo "✅ Setup complete!"
echo ""

# Summary
echo "======================================"
echo "DOWNLOAD SUMMARY"
echo "======================================"
echo ""
echo "✅ COMPLETE:"
echo "  - 3 terrain texture sets (9 JPG files) - ${TEXTURE_DIR}/"
echo "  - Quaternius pack downloaded - ${MODELS_ZIP}"
echo ""
echo "⏳ NEXT STEPS:"
echo ""
echo "1. Convert FBX models to GLB format:"
echo "   - Install Blender (https://www.blender.org/download/)"
echo "   - Run: python3 scripts/convert-fbx-to-glb.py"
echo "   - Or use Blender manually (see public/assets/README.md)"
echo ""
echo "2. Verify assets:"
echo "   - Run: npm run validate-assets"
echo ""
echo "3. Test in browser:"
echo "   - Run: npm run dev"
echo "   - Load: '3P Sentinel 01 v3.06.w3x'"
echo "   - Terrain should show textures (not solid green)"
echo "   - Doodads should show 3D models (once GLB files added)"
echo ""
echo "See CREDITS.md for license information."
echo "See PRPs/phase2-rendering/2.12-legal-asset-library.md for full spec."
echo ""
echo "======================================"
