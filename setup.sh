#!/bin/bash

# F.Conv Setup Script
echo "🚀 Setting up F.Conv - Universal File Format Converter"
echo "=================================================="

# Check if Docker is installed
if command -v docker &> /dev/null; then
    echo "✅ Docker is installed"
    
    # Check if Docker Compose is available
    if command -v docker-compose &> /dev/null || docker compose version &> /dev/null; then
        echo "✅ Docker Compose is available"
        echo ""
        echo "🐳 Starting F.Conv with Docker..."
        echo "This will build the image and start the application."
        echo ""
        
        # Build and start with Docker Compose
        docker-compose up --build -d
        
        echo ""
        echo "🎉 F.Conv is starting up!"
        echo "📱 Access the application at: http://localhost:3000"
        echo "🔍 Health check: http://localhost:3000/api/health"
        echo ""
        echo "📋 Useful commands:"
        echo "  docker-compose logs -f    # View logs"
        echo "  docker-compose down       # Stop the application"
        echo "  docker-compose restart    # Restart the application"
        
    else
        echo "❌ Docker Compose not found"
        echo "Please install Docker Compose and try again"
        exit 1
    fi
    
else
    echo "❌ Docker not found"
    echo ""
    echo "🔧 Setting up for local development..."
    
    # Check if Node.js is installed
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        echo "✅ Node.js is installed: $NODE_VERSION"
    else
        echo "❌ Node.js not found"
        echo "Please install Node.js 18+ and try again"
        exit 1
    fi
    
    # Check if FFmpeg is installed
    if command -v ffmpeg &> /dev/null; then
        FFMPEG_VERSION=$(ffmpeg -version | head -n 1)
        echo "✅ FFmpeg is installed: $FFMPEG_VERSION"
    else
        echo "❌ FFmpeg not found"
        echo ""
        echo "Please install FFmpeg:"
        echo "  macOS: brew install ffmpeg"
        echo "  Ubuntu/Debian: sudo apt install ffmpeg"
        echo "  Windows: Download from https://ffmpeg.org/download.html"
        exit 1
    fi
    
    # Install dependencies
    echo ""
    echo "📦 Installing dependencies..."
    npm install
    
    # Create temp directory
    mkdir -p /tmp/conversions
    
    echo ""
    echo "🎉 Setup complete!"
    echo "🚀 Start the development server with: npm run dev"
    echo "📱 Then access the application at: http://localhost:3000"
fi

echo ""
echo "📚 For more information, check the README.md file"
echo "🐛 Report issues at: https://github.com/your-repo/fdotconv/issues" 