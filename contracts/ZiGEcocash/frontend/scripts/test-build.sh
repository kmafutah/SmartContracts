#!/bin/bash

# Test script to verify Next.js build configuration
# This script tests the build process and checks for common issues

set -e

echo "🧪 Testing ZiGVerse Frontend Build Configuration..."

# Check if we're in the right directory
if [ ! -f "next.config.js" ]; then
    echo "❌ Error: next.config.js not found. Please run this script from the frontend directory."
    exit 1
fi

# Check environment file
if [ ! -f ".env.local" ]; then
    echo "⚠️  Warning: .env.local not found. Creating from template..."
    cp env.example .env.local
fi

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf .next

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the application
echo "🔨 Building application..."
NODE_ENV=production npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build completed successfully!"
    
    # Check for static assets
    echo "🔍 Checking static assets..."
    if [ -d ".next/static" ]; then
        echo "✅ Static assets directory found"
        echo "📁 Static assets count: $(find .next/static -type f | wc -l)"
    else
        echo "❌ Static assets directory not found"
    fi
    
    # Check for CSS files
    echo "🎨 Checking CSS files..."
    if [ -d ".next/static/css" ]; then
        echo "✅ CSS files found"
        echo "📁 CSS files: $(ls .next/static/css/)"
    else
        echo "❌ CSS files not found"
    fi
    
    # Check for JS files
    echo "📜 Checking JS files..."
    if [ -d ".next/static/chunks" ]; then
        echo "✅ JS chunks found"
        echo "📁 JS chunks count: $(find .next/static/chunks -name "*.js" | wc -l)"
    else
        echo "❌ JS chunks not found"
    fi
    
    echo "🎉 Build test completed successfully!"
    echo "💡 To test the production server, run: npm run start"
    
else
    echo "❌ Build failed!"
    echo "🔍 Check the error messages above for details"
    exit 1
fi 