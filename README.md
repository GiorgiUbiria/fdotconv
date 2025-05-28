# F.Conv - Universal File Format Converter

F.Conv is a modern, web-based file format converter that handles images, videos, and audio files. All conversions are processed securely on the server using FFmpeg for optimal performance and quality.

## ✨ Features

- **Universal Format Support**: Convert between popular image, video, and audio formats
- **Server-Side Processing**: All conversions happen on the server for better performance and security
- **Batch Processing**: Convert multiple files simultaneously with queue management
- **Quality Control**: Choose between low, medium, and high quality settings
- **Modern UI**: Clean, responsive interface with drag-and-drop functionality
- **Real-time Progress**: Live conversion progress tracking
- **File Size Validation**: Automatic validation with 100MB file size limit
- **Docker Support**: Easy deployment with Docker and Docker Compose

## 🎯 Supported Formats

### Images
- **Input/Output**: JPEG, PNG, WebP, GIF, BMP, TIFF, AVIF

### Videos
- **Input/Output**: MP4, WebM, AVI, MOV
- **Video to Audio**: Extract MP3, WAV, AAC, OGG from video files

### Audio
- **Input/Output**: MP3, WAV, AAC, OGG

## 🚀 Quick Start

### Using Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd fdotconv
   ```

2. **Build and run with Docker Compose**
   ```bash
   docker-compose up --build
   ```

3. **Access the application**
   Open [http://localhost:3000](http://localhost:3000) in your browser

### Local Development

1. **Prerequisites**
   - Node.js 18+ 
   - FFmpeg installed on your system
   - npm or yarn

2. **Install FFmpeg**
   
   **macOS (using Homebrew):**
   ```bash
   brew install ffmpeg
   ```
   
   **Ubuntu/Debian:**
   ```bash
   sudo apt update
   sudo apt install ffmpeg
   ```
   
   **Windows:**
   Download from [FFmpeg official website](https://ffmpeg.org/download.html) and add to PATH

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Set environment variables (optional)**
   ```bash
   export FFMPEG_PATH=/usr/bin/ffmpeg
   export FFPROBE_PATH=/usr/bin/ffprobe
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   Open [http://localhost:3000](http://localhost:3000) in your browser

## 🐳 Docker Deployment

### Production Deployment

```bash
# Build the image
docker build -t fdotconv .

# Run the container
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e FFMPEG_PATH=/usr/bin/ffmpeg \
  -e FFPROBE_PATH=/usr/bin/ffprobe \
  -v /tmp/conversions:/tmp/conversions \
  fdotconv
```

### Using Docker Compose

```bash
# Production
docker-compose up -d

# Development (uncomment dev service in docker-compose.yml)
docker-compose -f docker-compose.yml up fdotconv-dev
```

## 🔧 Configuration

### Environment Variables

- `NODE_ENV`: Set to `production` for production builds
- `FFMPEG_PATH`: Path to FFmpeg binary (default: `ffmpeg`)
- `FFPROBE_PATH`: Path to FFprobe binary (default: `ffprobe`)

### File Size Limits

- Maximum file size: 100MB per file
- Maximum files per upload: 5 files
- Configurable in `lib/utils.ts`

## 🏗️ Architecture

### Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Backend**: Hono.js API routes
- **Media Processing**: FFmpeg (server-side)
- **State Management**: Zustand
- **UI Components**: Radix UI, Tailwind CSS
- **File Handling**: react-dropzone
- **Queue Management**: p-queue

### Key Improvements

- ✅ Removed deprecated `fluent-ffmpeg` package
- ✅ Eliminated client-side FFmpeg WASM processing
- ✅ Unified server-side processing for all file types
- ✅ Added comprehensive error handling and validation
- ✅ Implemented Docker containerization
- ✅ Added file size and type validation
- ✅ Improved progress tracking and user feedback

## 📡 API Endpoints

### POST `/api/convert`
Convert a file to the specified format.

**Parameters:**
- `file`: File to convert (multipart/form-data)
- `format`: Target format (string)
- `quality`: Quality setting - `low`, `medium`, `high` (optional, default: `medium`)

**Response:** Converted file as binary data

### GET `/api/health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "ffmpeg": "/usr/bin/ffmpeg",
  "ffprobe": "/usr/bin/ffprobe"
}
```

### GET `/api/formats`
Get supported formats.

**Response:**
```json
{
  "image": ["jpeg", "png", "webp", "gif", "bmp", "tiff", "avif"],
  "video": ["mp4", "webm", "avi", "mov"],
  "audio": ["mp3", "wav", "aac", "ogg"]
}
```

## 🛠️ Development

### Project Structure

```
fdotconv/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── image-generator/   # Future feature
│   ├── photo-editor/      # Future feature
│   └── text-extractor/    # Future feature
├── components/            # React components
├── lib/                   # Utility libraries
│   ├── ffmpeg.ts         # FFmpeg wrapper
│   └── utils.ts          # Utility functions
├── providers/            # Context providers
├── Dockerfile            # Docker configuration
└── docker-compose.yml    # Docker Compose configuration
```

### Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run format:fix   # Format code with Prettier
npm run docker:build # Build Docker image
npm run docker:run   # Run Docker container
```

## 🔒 Security

- All file processing happens on the server
- File size and type validation
- Temporary files are automatically cleaned up
- No client-side file storage
- Input sanitization and validation

## 🚧 Future Features

- **Text Extractor**: OCR and document text extraction
- **Photo Editor**: Basic image editing capabilities  
- **Image Generator**: AI-powered image generation
- **Batch Download**: Download all converted files as ZIP
- **Progress Persistence**: Resume interrupted conversions
- **User Accounts**: Save conversion history

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For issues and questions:
- Create an issue on GitHub
- Check the health endpoint: `/api/health`
- Review Docker logs: `docker-compose logs`
