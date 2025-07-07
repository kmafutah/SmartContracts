#!/bin/bash

# GitHub Pages Deployment Script for ZiGVerse Frontend
# This script builds and deploys the Next.js app to GitHub Pages

set -e

echo "🚀 Starting GitHub Pages Deployment..."

# Check if we're in the right directory
if [ ! -f "next.config.js" ]; then
    echo "❌ Error: next.config.js not found. Please run this script from the frontend directory."
    exit 1
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "⚠️  Warning: .env.local not found. Creating from template..."
    cp env.example .env.local
fi

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf .next out

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build for static export
echo "🔨 Building for static export..."
NODE_ENV=production npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build completed successfully!"
    
    # Check for static files
    echo "🔍 Checking static files..."
    if [ -d "out" ]; then
        echo "✅ Static files generated in 'out' directory"
        echo "📁 Files count: $(find out -type f | wc -l)"
        
        # List the main files
        echo "📄 Main files:"
        ls -la out/
        
        echo "🎉 Static export ready for GitHub Pages!"
        echo ""
        echo "📋 Next steps:"
        echo "1. Commit and push your changes to GitHub"
        echo "2. Go to your repository Settings > Pages"
        echo "3. Set Source to 'Deploy from a branch'"
        echo "4. Select 'gh-pages' branch or 'main' branch with '/out' folder"
        echo "5. Save the settings"
        echo ""
        echo "💡 Or use GitHub Actions for automatic deployment!"
        
    else
        echo "❌ Static files not found in 'out' directory"
        exit 1
    fi
    
else
    echo "❌ Build failed!"
    echo "🔍 Check the error messages above for details"
    exit 1
fi 