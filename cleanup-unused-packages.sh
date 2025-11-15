#!/bin/bash

# Universal Checker - Cleanup Unused Packages Script
# This script removes heavy, unused packages from the server

set -e

echo "=========================================="
echo "🧹 Universal Checker - Package Cleanup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Get initial disk usage
echo ""
print_info "Checking current disk usage..."
INITIAL_USAGE=$(df / | tail -1 | awk '{print $3}')
echo "Current disk usage: $(df -h / | tail -1 | awk '{print $3}')"
echo ""

# Show what will be removed
echo "=========================================="
echo "📦 Packages to be REMOVED:"
echo "=========================================="
echo ""
echo "GLOBAL PACKAGES (~965MB total):"
echo "  ❌ playwright         - 12MB package + 924MB browsers"
echo "  ❌ chromedriver       - 29MB"
echo ""
echo "OPTIONAL (if not needed):"
echo "  ❌ http-server        - Alternative web server"
echo "  ❌ serve              - Alternative web server"
echo "  ❌ nodemon            - Process manager (you use ts-node-dev)"
echo "  ❌ pnpm               - Package manager (if you only use npm)"
echo "  ❌ yarn               - Package manager (if you only use npm)"
echo ""
echo "CACHE:"
echo "  ❌ npm cache"
echo "  ❌ Playwright browser cache"
echo ""
echo "=========================================="
echo ""

# Confirmation
read -p "Do you want to proceed with the cleanup? (yes/no): " confirm
if [[ ! "$confirm" =~ ^[Yy][Ee][Ss]$ ]]; then
    print_warning "Cleanup cancelled by user."
    exit 0
fi

echo ""
print_info "Starting cleanup process..."
echo ""

# 1. Remove Playwright globally
print_info "Removing Playwright (globally installed)..."
if npm list -g playwright &>/dev/null; then
    npm uninstall -g playwright
    print_success "Playwright removed"
else
    print_warning "Playwright not found (already removed?)"
fi

# 2. Remove Playwright browser cache (THE BIG ONE - 924MB)
print_info "Removing Playwright browser cache (~924MB)..."
if [ -d "/root/.cache/ms-playwright" ]; then
    CACHE_SIZE=$(du -sh /root/.cache/ms-playwright | awk '{print $1}')
    rm -rf /root/.cache/ms-playwright
    print_success "Playwright cache removed (freed: $CACHE_SIZE)"
else
    print_warning "Playwright cache not found"
fi

# 3. Remove Chromedriver
print_info "Removing Chromedriver (~29MB)..."
if npm list -g chromedriver &>/dev/null; then
    npm uninstall -g chromedriver
    print_success "Chromedriver removed"
else
    print_warning "Chromedriver not found (already removed?)"
fi

# 4. Remove other unused global packages (OPTIONAL)
echo ""
print_info "Removing optional unused packages..."

# Remove http-server
if npm list -g http-server &>/dev/null; then
    npm uninstall -g http-server
    print_success "http-server removed"
fi

# Remove serve
if npm list -g serve &>/dev/null; then
    npm uninstall -g serve
    print_success "serve removed"
fi

# Remove nodemon
if npm list -g nodemon &>/dev/null; then
    npm uninstall -g nodemon
    print_success "nodemon removed"
fi

# Remove pnpm
if npm list -g pnpm &>/dev/null; then
    read -p "Remove pnpm? (yes/no): " remove_pnpm
    if [[ "$remove_pnpm" =~ ^[Yy][Ee][Ss]$ ]]; then
        npm uninstall -g pnpm
        print_success "pnpm removed"
    fi
fi

# Remove yarn
if npm list -g yarn &>/dev/null; then
    read -p "Remove yarn? (yes/no): " remove_yarn
    if [[ "$remove_yarn" =~ ^[Yy][Ee][Ss]$ ]]; then
        npm uninstall -g yarn
        print_success "yarn removed"
    fi
fi

# 5. Clean npm cache
echo ""
print_info "Cleaning npm cache..."
npm cache clean --force
print_success "npm cache cleaned"

# 6. Show final results
echo ""
echo "=========================================="
echo "📊 CLEANUP SUMMARY"
echo "=========================================="

FINAL_USAGE=$(df / | tail -1 | awk '{print $3}')
FREED_KB=$((INITIAL_USAGE - FINAL_USAGE))
FREED_MB=$((FREED_KB / 1024))

echo ""
print_success "Cleanup completed successfully!"
echo ""
echo "Disk space freed: ~${FREED_MB}MB"
echo ""
echo "Current disk usage:"
df -h / | tail -1 | awk '{print "  Total: " $2 ", Used: " $3 ", Available: " $4 ", Usage: " $5}'
echo ""

# List remaining global packages
echo "Remaining global packages:"
npm list -g --depth=0 2>/dev/null | grep -v "^/opt" | grep "^[├└]" || echo "  (none)"
echo ""

print_success "Server cleanup complete! ✨"
echo ""
