#!/bin/bash

# ZiGVerse Frontend Deployment Script
# This script handles the build and deployment process

set -e

echo "🚀 Starting ZiGVerse Frontend Deployment..."

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "⚠️  Warning: .env.local not found. Please create it from env.example"
    echo "📝 Copying env.example to .env.local..."
    cp env.example .env.local
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf .next

# Build for production
echo "🔨 Building for production..."
NODE_ENV=production npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build completed successfully!"
    echo "📁 Build output is in .next directory"
    
    # Start production server
    echo "🌐 Starting production server..."
    npm run start
else
    echo "❌ Build failed!"
    exit 1
fi 