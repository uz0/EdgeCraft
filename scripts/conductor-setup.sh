#!/bin/bash
set -e  # Exit on any error

echo "🚀 Edge Craft - Conductor Workspace Setup"
echo "=========================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print error and exit
fail() {
    echo -e "${RED}❌ Error: $1${NC}"
    exit 1
}

# Function to print success
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to print warning
warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo "🔍 Step 1: Checking prerequisites..."
echo "-----------------------------------"

# Check Node.js version
if ! command -v node &> /dev/null; then
    fail "Node.js is not installed. Please install Node.js 20+ before continuing."
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    fail "Node.js version must be 20 or higher. Current version: $(node --version)"
fi
success "Node.js $(node --version) detected"

# Check npm version
if ! command -v npm &> /dev/null; then
    fail "npm is not installed. Please install npm 10+ before continuing."
fi

NPM_VERSION=$(npm --version | cut -d'.' -f1)
if [ "$NPM_VERSION" -lt 10 ]; then
    fail "npm version must be 10 or higher. Current version: $(npm --version)"
fi
success "npm $(npm --version) detected"

echo ""
echo "📦 Step 2: Installing dependencies..."
echo "--------------------------------------"

# Install dependencies
if npm install; then
    success "Dependencies installed successfully"
else
    fail "Failed to install dependencies. Check your package.json and network connection."
fi

echo ""
echo "📁 Step 3: Setting up environment..."
echo "-------------------------------------"

# Check for .env file in root and copy if it exists
if [ -n "$CONDUCTOR_ROOT_PATH" ] && [ -f "$CONDUCTOR_ROOT_PATH/.env" ]; then
    cp "$CONDUCTOR_ROOT_PATH/.env" .env
    success "Copied .env from repository root"
elif [ -f ".env.example" ]; then
    warn "No .env file found in root. Using .env.development as default."
    # The project has .env.development which is fine for development
else
    warn "No .env file found. Proceeding without environment configuration."
fi

echo ""
echo "🔍 Step 4: Running validation checks..."
echo "----------------------------------------"

# Run TypeScript type checking
echo "Checking TypeScript types..."
if npm run typecheck > /dev/null 2>&1; then
    success "TypeScript type checking passed"
else
    fail "TypeScript type checking failed. Run 'npm run typecheck' to see details."
fi

# Run linting
echo "Running ESLint..."
if npm run lint > /dev/null 2>&1; then
    success "Linting passed"
else
    warn "Linting found issues. Run 'npm run lint:fix' to auto-fix."
fi

# Run tests (if any exist)
echo "Running tests..."
if npm test > /dev/null 2>&1; then
    success "Tests passed"
else
    warn "Some tests failed or no tests found. Run 'npm test' to see details."
fi

echo ""
echo "🏗️  Step 5: Verifying build..."
echo "-------------------------------"

# Test that build works
if npm run build > /dev/null 2>&1; then
    success "Build completed successfully"
    # Clean up build artifacts
    rm -rf dist
else
    fail "Build failed. Run 'npm run build' to see details."
fi

echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "Your Edge Craft workspace is ready to use!"
echo ""
echo "Next steps:"
echo "  • Run 'npm run dev' to start the development server"
echo "  • Visit http://localhost:3000 in your browser"
echo "  • Check README.md for more development commands"
echo ""
echo "Happy coding! 🚀"
