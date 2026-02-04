#!/bin/bash

# 🐺 Kogaion GitHub Setup - Create and Push Repository
# 
# This script creates a GitHub repo and pushes Kogaion to it.
#
# Usage:
#   1. Get a GitHub Personal Access Token from:
#      https://github.com/settings/tokens
#      (Scopes needed: repo, delete_repo)
#
#   2. Run this script with your token:
#      GITHUB_TOKEN=ghp_xxxxx ./setup-github-repo.sh
#
#   3. Or manually:
#      export GITHUB_TOKEN="your_token_here"
#      ./setup-github-repo.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🐺 Kogaion GitHub Repository Setup${NC}"
echo "=========================================="

# Check for token
if [ -z "$GITHUB_TOKEN" ]; then
    echo -e "${YELLOW}⚠️  No GITHUB_TOKEN environment variable found${NC}"
    echo ""
    echo "To create the repository, you need a GitHub Personal Access Token."
    echo ""
    echo "1. Get a token at: https://github.com/settings/tokens"
    echo "   - Click 'Generate new token (classic)'"
    echo "   - Note: 'kogaion-setup'"
    echo "   - Scopes: ✓ repo, ✓ delete_repo"
    echo "   - Copy the token"
    echo ""
    echo "2. Run this script with your token:"
    echo "   ${YELLOW}GITHUB_TOKEN=ghp_your_token_here ./setup-github-repo.sh${NC}"
    echo ""
    echo "3. Or create the repo manually at:"
    echo "   ${GREEN}https://github.com/new${NC}"
    echo ""
    exit 0
fi

# Get GitHub username
echo -e "${YELLOW}Fetching GitHub username...${NC}"
USERNAME=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/user | grep -o '"login": *"[^"]*"' | cut -d'"' -f4)

if [ -z "$USERNAME" ]; then
    echo -e "${RED}❌ Failed to get GitHub username. Check your token.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Logged in as: $USERNAME${NC}"

# Repository name
REPO_NAME="kogaion"

echo ""
echo -e "${YELLOW}Creating repository '$REPO_NAME'...${NC}"

# Create repository
RESPONSE=$(curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  -d "{
    \"name\": \"$REPO_NAME\",
    \"description\": \"🐺 Kogaion - Agent Blockchain Network. Zero-money economy for AI agents.\",
    \"homepage\": \"https://github.com/$USERNAME/$REPO_NAME\",
    \"private\": false,
    \"has_issues\": true,
    \"has_projects\": true,
    \"has_wiki\": false
  }" \
  https://api.github.com/user/repos)

# Check if created or already exists
if echo "$RESPONSE" | grep -q '"id":'; then
    echo -e "${GREEN}✅ Repository created successfully!${NC}"
elif echo "$RESPONSE" | grep -q "already exists"; then
    echo -e "${YELLOW}⚠️  Repository already exists${NC}"
else
    echo -e "${RED}❌ Failed to create repository${NC}"
    echo "$RESPONSE"
    exit 1
fi

# Get current directory
REPO_DIR=$(pwd)
echo ""
echo -e "${YELLOW}Configuring git remote...${NC}"

# Add remote if not exists
if ! git remote get-url origin &>/dev/null; then
    git remote add origin "https://github.com/$USERNAME/$REPO_NAME.git"
    echo -e "${GREEN}✅ Added remote 'origin'${NC}"
else
    echo -e "${YELLOW}⚠️  Remote 'origin' already exists${NC}"
fi

# Set branch name
BRANCH=$(git branch --show-current)
if [ -z "$BRANCH" ]; then
    BRANCH="main"
fi
echo -e "${GREEN}Branch: $BRANCH${NC}"

# Push to GitHub
echo ""
echo -e "${YELLOW}Pushing to GitHub...${NC}"
git push -u origin "$BRANCH"

echo ""
echo -e "${GREEN}🎉 Successfully pushed to GitHub!${NC}"
echo ""
echo "Your repository is now live:"
echo -e "${GREEN}https://github.com/$USERNAME/$REPO_NAME${NC}"
echo ""

# Enable GitHub Pages
echo -e "${YELLOW}Enabling GitHub Pages...${NC}"
sleep 2  # Give GitHub a moment to create the repo

# Try to enable Pages (may fail if not ready)
curl -s -X PUT \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  -d "{\"source\":{\"branch\":\"docs\",\"path\":\"/\"}}" \
  "https://api.github.com/repos/$USERNAME/$REPO_NAME/pages" 2>/dev/null || true

echo ""
echo "📝 Next Steps:"
echo "1. Go to: https://github.com/$USERNAME/$REPO_NAME/settings/pages"
echo "2. Set Source to: 'Deploy from a branch'"
echo "3. Branch: 'main' or 'docs' folder"
echo "4. Your site will be live at: https://$USERNAME.github.io/kogaion"
echo ""
echo -e "${GREEN}🐺 Kogaion is now on GitHub!${NC}"
