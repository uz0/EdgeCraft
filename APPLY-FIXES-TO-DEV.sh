#!/bin/bash
# Script to copy preview generation fixes from workspace to actual dev branch

set -e

WORKSPACE_DIR="/Users/dcversus/conductor/edgecraft/.conductor/copan"
DEV_DIR="/Users/dcversus/conductor/edgecraft"

echo "🔧 Applying preview generation fixes to dev branch..."
echo ""

# Check if we're in the right directory
if [ ! -d "$WORKSPACE_DIR" ]; then
    echo "❌ Error: Workspace directory not found: $WORKSPACE_DIR"
    exit 1
fi

if [ ! -d "$DEV_DIR" ]; then
    echo "❌ Error: Dev directory not found: $DEV_DIR"
    exit 1
fi

echo "📋 Files to copy:"
echo "  1. src/engine/rendering/MapPreviewGenerator.ts (screenshot fix)"
echo "  2. src/formats/maps/w3x/W3XMapLoader.ts (placeholder data for multi-compression)"
echo "  3. src/ui/MapPreviewReport.tsx (new component)"
echo "  4. src/ui/MapPreviewReport.css (new styles)"
echo "  5. src/App.tsx (report view toggle)"
echo "  6. src/App.css (toggle button styles)"
echo ""

read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled"
    exit 1
fi

# Copy files
echo ""
echo "📦 Copying files..."

cp "$WORKSPACE_DIR/src/engine/rendering/MapPreviewGenerator.ts" "$DEV_DIR/src/engine/rendering/MapPreviewGenerator.ts"
echo "  ✅ MapPreviewGenerator.ts"

cp "$WORKSPACE_DIR/src/formats/maps/w3x/W3XMapLoader.ts" "$DEV_DIR/src/formats/maps/w3x/W3XMapLoader.ts"
echo "  ✅ W3XMapLoader.ts"

cp "$WORKSPACE_DIR/src/ui/MapPreviewReport.tsx" "$DEV_DIR/src/ui/MapPreviewReport.tsx"
echo "  ✅ MapPreviewReport.tsx"

cp "$WORKSPACE_DIR/src/ui/MapPreviewReport.css" "$DEV_DIR/src/ui/MapPreviewReport.css"
echo "  ✅ MapPreviewReport.css"

cp "$WORKSPACE_DIR/src/App.tsx" "$DEV_DIR/src/App.tsx"
echo "  ✅ App.tsx"

cp "$WORKSPACE_DIR/src/App.css" "$DEV_DIR/src/App.css"
echo "  ✅ App.css"

echo ""
echo "✅ All files copied successfully!"
echo ""
echo "📝 Summary of fixes:"
echo ""
echo "1. MapPreviewGenerator.ts:"
echo "   - Fixed: Screenshot capture hanging indefinitely"
echo "   - Solution: Replaced CreateScreenshotUsingRenderTarget with direct canvas.toDataURL()"
echo "   - Added: 5-second timeout fallback"
echo ""
echo "2. W3XMapLoader.ts:"
echo "   - Fixed: W3X maps throwing errors due to multi-compression"
echo "   - Solution: Create placeholder map data when extraction fails"
echo "   - Result: W3X maps now generate flat terrain previews instead of failing"
echo ""
echo "3. MapPreviewReport component:"
echo "   - Added: New 'Report View' with full list of all 24 maps"
echo "   - Shows: Preview status, file size, format for each map"
echo "   - UI: Toggle between Gallery view and Report view"
echo ""
echo "🔄 Next steps:"
echo "1. Restart dev server: npm run dev"
echo "2. Open http://localhost:3001/ in browser"
echo "3. Check browser console for preview generation logs"
echo "4. Expected results:"
echo "   - SC2 maps: Full previews (embedded from PreviewImage.tga)"
echo "   - W3X maps: Flat terrain previews (placeholder data)"
echo "   - W3N campaigns: May fail (large files, various compression issues)"
echo ""
