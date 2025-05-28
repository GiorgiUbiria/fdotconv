@echo off
echo 🚀 Setting up F.Conv - Universal File Format Converter
echo ==================================================

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Docker is installed
    
    REM Check if Docker Compose is available
    docker-compose --version >nul 2>&1
    if %errorlevel% == 0 (
        echo ✅ Docker Compose is available
        echo.
        echo 🐳 Starting F.Conv with Docker...
        echo This will build the image and start the application.
        echo.
        
        REM Build and start with Docker Compose
        docker-compose up --build -d
        
        echo.
        echo 🎉 F.Conv is starting up!
        echo 📱 Access the application at: http://localhost:3000
        echo 🔍 Health check: http://localhost:3000/api/health
        echo.
        echo 📋 Useful commands:
        echo   docker-compose logs -f    # View logs
        echo   docker-compose down       # Stop the application
        echo   docker-compose restart    # Restart the application
        
    ) else (
        echo ❌ Docker Compose not found
        echo Please install Docker Compose and try again
        pause
        exit /b 1
    )
    
) else (
    echo ❌ Docker not found
    echo.
    echo 🔧 Setting up for local development...
    
    REM Check if Node.js is installed
    node --version >nul 2>&1
    if %errorlevel% == 0 (
        for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
        echo ✅ Node.js is installed: %NODE_VERSION%
    ) else (
        echo ❌ Node.js not found
        echo Please install Node.js 18+ and try again
        pause
        exit /b 1
    )
    
    REM Check if FFmpeg is installed
    ffmpeg -version >nul 2>&1
    if %errorlevel% == 0 (
        echo ✅ FFmpeg is installed
    ) else (
        echo ❌ FFmpeg not found
        echo.
        echo Please install FFmpeg:
        echo   Download from https://ffmpeg.org/download.html
        echo   Add FFmpeg to your system PATH
        pause
        exit /b 1
    )
    
    REM Install dependencies
    echo.
    echo 📦 Installing dependencies...
    npm install
    
    REM Create temp directory
    if not exist "C:\temp\conversions" mkdir "C:\temp\conversions"
    
    echo.
    echo 🎉 Setup complete!
    echo 🚀 Start the development server with: npm run dev
    echo 📱 Then access the application at: http://localhost:3000
)

echo.
echo 📚 For more information, check the README.md file
echo 🐛 Report issues at: https://github.com/your-repo/fdotconv/issues
pause 