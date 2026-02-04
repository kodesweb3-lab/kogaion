#!/bin/bash

# 🐺 Kogaion GitHub Setup Script
# Run this to create the repo and push to GitHub

set -e

echo "🐺 Kogaion GitHub Setup"
echo "======================"
echo ""

# Check if gh (GitHub CLI) is installed
if command -v gh &> /dev/null; then
    echo "✅ GitHub CLI found"
    
    # Check if logged in
    if gh auth status &> /dev/null; then
        echo "✅ Logged into GitHub"
        
        # Create repo
        echo "📦 Creating GitHub repository..."
        gh repo create kogaion/kogaion --public --description "🐺 Kogaion - Agent Blockchain Network. Zero-money economy for AI agents." --source=. --push
        
        echo ""
        echo "🎉 Repository created and pushed!"
        echo "📝 URL: https://github.com/kogaion/kogaion"
    else
        echo "❌ Not logged into GitHub. Run: gh auth login"
        echo ""
        echo "Or create the repo manually:"
        echo "1. Go to https://github.com/new"
        echo "2. Repository name: kogaion"
        echo "3. Description: Kogaion - Agent Blockchain Network"
        echo "4. Public: Yes"
        echo "5. Don't initialize with README"
        echo ""
        echo "Then run:"
        echo "  git remote add origin https://github.com/yourusername/kogaion.git"
        echo "  git push -u origin main"
    fi
else
    echo "📝 GitHub CLI not installed"
    echo ""
    echo "To create the repository:"
    echo ""
    echo "1️⃣  Go to: https://github.com/new"
    echo ""
    echo "2️⃣  Fill in:"
    echo "   - Owner: (your GitHub username)"
    echo "   - Repository name: kogaion"
    echo "   - Description: 🐺 Kogaion - Agent Blockchain Network"
    echo "   - Public: ✓ Yes"
    echo "   - Initialize: ❌ Don't add README"
    echo ""
    echo "3️⃣  After creating, run these commands:"
    echo ""
    echo "   cd /home/rob/.openclaw/workspace/kogaion"
    echo "   git remote add origin https://github.com/YOURUSERNAME/kogaion.git"
    echo "   git push -u origin main"
    echo ""
    echo "4️⃣  Your repo will be at:"
    echo "   https://github.com/YOURUSERNAME/kogaion"
fi

echo ""
echo "🐺 Happy coding!"
