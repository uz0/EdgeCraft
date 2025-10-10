#!/bin/bash
#
# Pre-commit hook for copyright validation
# Blocks commits containing copyrighted assets
#
# Installation:
#   ln -sf ../../scripts/pre-commit-hook.sh .git/hooks/pre-commit
#   chmod +x .git/hooks/pre-commit
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Running copyright validation..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo -e "${RED}❌ Error: package.json not found${NC}"
  echo "This script must be run from the project root"
  exit 1
fi

# Check for staged asset files
STAGED_ASSETS=$(git diff --cached --name-only --diff-filter=ACMR | grep -E '\.(png|jpg|jpeg|gif|bmp|tga|dds|gltf|glb|fbx|obj|mp3|wav|ogg|json)$' || true)

if [ -z "$STAGED_ASSETS" ]; then
  echo -e "${GREEN}✅ No asset files staged, skipping copyright check${NC}"
  exit 0
fi

echo -e "${YELLOW}Found staged asset files:${NC}"
echo "$STAGED_ASSETS" | sed 's/^/  - /'
echo ""

# Run copyright validation
echo "Running copyright tests..."
npm run test:copyright --silent

VALIDATION_RESULT=$?

if [ $VALIDATION_RESULT -ne 0 ]; then
  echo ""
  echo -e "${RED}❌ Copyright validation FAILED!${NC}"
  echo ""
  echo "One or more staged assets failed copyright validation."
  echo ""
  echo "Possible reasons:"
  echo "  1. Asset matches known copyrighted content (hash match)"
  echo "  2. Asset contains copyrighted metadata (Blizzard, etc.)"
  echo "  3. Asset is visually similar to copyrighted content"
  echo ""
  echo "Solutions:"
  echo "  1. Replace with legal alternatives from the asset database"
  echo "  2. Remove copyrighted metadata from files"
  echo "  3. Use original or CC0/MIT licensed assets"
  echo ""
  echo "To bypass this check (NOT recommended):"
  echo "  git commit --no-verify"
  echo ""
  exit 1
fi

# Check license attributions
echo ""
echo "Checking license attributions..."
npm run validate:attributions --silent

ATTRIBUTION_RESULT=$?

if [ $ATTRIBUTION_RESULT -ne 0 ]; then
  echo ""
  echo -e "${YELLOW}⚠️  License attribution validation warnings${NC}"
  echo ""
  echo "Some assets may be missing proper attribution."
  echo "Please run: npm run generate:attribution"
  echo ""
  # This is a warning, not a failure
fi

# Success
echo ""
echo -e "${GREEN}✅ All copyright checks passed!${NC}"
echo ""
exit 0
