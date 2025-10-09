#!/bin/bash

# Edge Craft External Dependencies Setup Script
# This script helps set up the external repositories required for full functionality

echo "╔════════════════════════════════════════════════════════╗"
echo "║         EDGE CRAFT EXTERNAL DEPENDENCIES SETUP          ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Please run this script from the Edge Craft root directory${NC}"
    exit 1
fi

echo "Current directory: $(pwd)"
echo ""

# Function to check if a repository exists
check_repo() {
    local repo_path=$1
    local repo_name=$2
    local repo_url=$3

    echo -e "${YELLOW}Checking $repo_name...${NC}"

    if [ -d "$repo_path" ]; then
        echo -e "${GREEN}✓ $repo_name found at $repo_path${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠ $repo_name not found${NC}"
        return 1
    fi
}

# Function to clone repository
clone_repo() {
    local repo_url=$1
    local target_dir=$2
    local repo_name=$3

    echo ""
    echo -e "${YELLOW}Would you like to clone $repo_name?${NC}"
    echo "Repository: $repo_url"
    echo "Target: $target_dir"
    read -p "Clone? (y/n): " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${GREEN}Cloning $repo_name...${NC}"
        git clone "$repo_url" "$target_dir"

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Successfully cloned $repo_name${NC}"

            # Install dependencies
            cd "$target_dir"
            echo -e "${YELLOW}Installing dependencies...${NC}"
            npm install

            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✓ Dependencies installed${NC}"
            else
                echo -e "${RED}✗ Failed to install dependencies${NC}"
            fi

            cd - > /dev/null
        else
            echo -e "${RED}✗ Failed to clone $repo_name${NC}"
        fi
    else
        echo -e "${YELLOW}Skipping $repo_name${NC}"
    fi
}

# Check Edge Craft setup
echo "═══════════════════════════════════════════════════════════"
echo "1. Checking Edge Craft Setup"
echo "═══════════════════════════════════════════════════════════"

if [ -f "node_modules/.bin/vite" ]; then
    echo -e "${GREEN}✓ Edge Craft dependencies installed${NC}"
else
    echo -e "${YELLOW}⚠ Edge Craft dependencies not installed${NC}"
    echo "Running npm install..."
    npm install
fi

# Check and setup mock implementations
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "2. Checking Mock Implementations"
echo "═══════════════════════════════════════════════════════════"

if [ -d "mocks/multiplayer-server" ]; then
    echo -e "${GREEN}✓ Mock multiplayer server found${NC}"
else
    echo -e "${RED}✗ Mock multiplayer server missing${NC}"
fi

if [ -f "mocks/launcher-map/index.edgecraft" ]; then
    echo -e "${GREEN}✓ Mock launcher map found${NC}"
else
    echo -e "${RED}✗ Mock launcher map missing${NC}"
fi

# Check Core-Edge Server
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "3. Core-Edge Multiplayer Server"
echo "═══════════════════════════════════════════════════════════"

CORE_EDGE_PATH="../core-edge"

if ! check_repo "$CORE_EDGE_PATH" "core-edge" "https://github.com/uz0/core-edge"; then
    clone_repo "https://github.com/uz0/core-edge" "$CORE_EDGE_PATH" "core-edge"
fi

# Check Index.EdgeCraft Launcher
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "4. Index.EdgeCraft Launcher Map"
echo "═══════════════════════════════════════════════════════════"

INDEX_EDGECRAFT_PATH="../index.edgecraft"

if ! check_repo "$INDEX_EDGECRAFT_PATH" "index.edgecraft" "https://github.com/uz0/index.edgecraft"; then
    clone_repo "https://github.com/uz0/index.edgecraft" "$INDEX_EDGECRAFT_PATH" "index.edgecraft"
fi

# Setup environment variables
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "5. Environment Configuration"
echo "═══════════════════════════════════════════════════════════"

if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating .env file...${NC}"
    cat > .env << EOF
# Edge Craft Environment Configuration
NODE_ENV=development

# External Dependencies
CORE_EDGE_URL=http://localhost:2567
LAUNCHER_PATH=./mocks/launcher-map/index.edgecraft

# To use full external repos, update these:
# CORE_EDGE_URL=http://localhost:2567  # When running ../core-edge
# LAUNCHER_PATH=../index.edgecraft/dist/index.edgecraft  # After building
EOF
    echo -e "${GREEN}✓ .env file created${NC}"
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi

# Summary
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "SETUP SUMMARY"
echo "═══════════════════════════════════════════════════════════"

echo ""
echo "Development Mode (with mocks):"
echo -e "${GREEN}npm run dev${NC}"
echo ""

echo "Development Mode (with external repos):"
echo "1. Terminal 1 - Core-Edge Server:"
echo -e "   ${GREEN}cd ../core-edge && npm run dev${NC}"
echo ""
echo "2. Terminal 2 - Edge Craft:"
echo -e "   ${GREEN}npm run dev${NC}"
echo ""

echo "Full Setup (all external dependencies):"
echo "1. Build launcher:"
echo -e "   ${GREEN}cd ../index.edgecraft && npm run build${NC}"
echo ""
echo "2. Link launcher:"
echo -e "   ${GREEN}npm run link:launcher ../index.edgecraft/dist${NC}"
echo ""
echo "3. Start with full dependencies:"
echo -e "   ${GREEN}npm run dev:full${NC}"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo -e "${GREEN}Setup complete!${NC}"
echo ""
echo "External Repository Links:"
echo "• Core-Edge Server: https://github.com/uz0/core-edge"
echo "• Index.EdgeCraft: https://github.com/uz0/index.edgecraft"
echo "═══════════════════════════════════════════════════════════"