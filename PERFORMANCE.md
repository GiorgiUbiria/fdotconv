# F.Conv Performance Optimization Guide

## Overview
F.Conv has been optimized for fast, efficient file conversions with several performance enhancements implemented to reduce conversion times significantly.

## Key Performance Improvements

### 1. Hardware Acceleration
- **Automatic Detection**: The system automatically detects available hardware acceleration (NVIDIA NVENC, Intel QSV, AMD VAAPI, Apple VideoToolbox)
- **GPU Encoding**: When available, uses hardware encoders for 3-5x faster video encoding
- **Fallback Support**: Gracefully falls back to software encoding when hardware acceleration isn't available

### 2. Optimized Codec Settings

#### WebM Conversions (Major Speed Improvement)
- **VP8 vs VP9**: Switched from VP9 to VP8 codec for WebM conversions
- **Speed Gain**: VP8 is 3-4x faster than VP9 while maintaining good quality
- **Real-time Mode**: Uses `-deadline realtime` for maximum speed
- **CPU Optimization**: Configurable CPU usage levels for speed vs quality balance

#### Video Quality Presets
- **Fast**: Ultra-fast encoding with CRF 32, `ultrafast` preset
- **Low**: Fast encoding with CRF 30, `veryfast` preset  
- **Medium**: Balanced encoding with CRF 25, `fast` preset
- **High**: Quality encoding with CRF 20, `medium` preset

### 3. Threading and Concurrency
- **Multi-threading**: Automatically uses up to 8 CPU threads for encoding
- **Queue Concurrency**: Increased from 3 to 5 concurrent conversions
- **Thread Pool**: Enhanced Node.js thread pool size (UV_THREADPOOL_SIZE=16)

### 4. Resolution Optimization
- **Auto-scaling**: Large videos (>1920x1080) are automatically scaled down for faster processing
- **Aspect Ratio**: Maintains original aspect ratio while reducing resolution
- **Performance Gain**: 2-3x speed improvement for 4K videos

### 5. Performance Monitoring
- **Real-time Tracking**: Built-in performance monitoring with detailed metrics
- **Conversion Times**: Track average conversion times by format and quality
- **Success Rates**: Monitor conversion success rates and error patterns
- **API Endpoint**: Access performance reports at `/api/performance`

## Expected Performance Improvements

### Before Optimization (90MB MP4 → WebM)
- **Time**: ~3.5 minutes
- **Codec**: VP9 (slow but high quality)
- **Preset**: Medium
- **Threading**: Limited

### After Optimization (90MB MP4 → WebM)
- **Fast Quality**: ~45-60 seconds (5-6x faster)
- **Medium Quality**: ~1.5-2 minutes (2x faster)
- **Codec**: VP8 (fast with good quality)
- **Hardware Acceleration**: When available
- **Optimized Threading**: Full CPU utilization

## Quality Settings Guide

### When to Use Each Setting

#### Fast Quality
- **Use for**: Quick previews, social media uploads, testing
- **Speed**: Fastest conversion times
- **Quality**: Good for most web use cases
- **File Size**: Larger files but acceptable

#### Medium Quality (Recommended)
- **Use for**: General purpose conversions, web content
- **Speed**: 2x faster than previous default
- **Quality**: Excellent balance of quality and speed
- **File Size**: Optimized compression

#### High Quality
- **Use for**: Professional content, archival purposes
- **Speed**: Slower but still optimized
- **Quality**: Near-lossless quality
- **File Size**: Smaller files with better compression

## Hardware Acceleration Support

### NVIDIA GPUs (NVENC)
- **Supported**: H.264, H.265 encoding
- **Speed Improvement**: 3-5x faster
- **Quality**: Excellent hardware encoding quality

### Intel CPUs (Quick Sync Video)
- **Supported**: Modern Intel processors with integrated graphics
- **Speed Improvement**: 2-3x faster
- **Compatibility**: Wide range of Intel hardware

### AMD GPUs (VAAPI)
- **Supported**: Modern AMD graphics cards
- **Speed Improvement**: 2-4x faster
- **Linux**: Best support on Linux systems

### Apple Silicon (VideoToolbox)
- **Supported**: M1, M2, M3 processors
- **Speed Improvement**: 4-6x faster
- **Quality**: Excellent native hardware encoding

## Monitoring Performance

### Real-time Monitoring
```bash
# Check performance metrics
curl http://localhost:3000/api/performance

# Example output:
📊 Performance Report:
- Total conversions: 25
- Success rate: 96.0%
- Average conversion time: 1.2m
- Active conversions: 2
```

### Docker Logs
```bash
# Monitor conversion progress
docker-compose logs -f fdotconv

# Example output:
🚀 Starting conversion: video.mp4 (89.2 MB) mp4 → webm [fast]
✅ Conversion completed: video.mp4 in 52.3s
```

## Troubleshooting Performance Issues

### Slow Conversions
1. **Check Hardware Acceleration**: Look for "Hardware acceleration support" in logs
2. **Use Fast Quality**: For testing, use "fast" quality setting
3. **Monitor CPU Usage**: Ensure Docker has adequate CPU allocation
4. **Check File Size**: Very large files (>200MB) will naturally take longer

### Memory Issues
1. **Increase Docker Memory**: Allocate more RAM to Docker
2. **Reduce Concurrency**: Lower the queue concurrency if needed
3. **Monitor Temp Space**: Ensure adequate disk space for temporary files

### Quality vs Speed Trade-offs
- **Fast Quality**: 5-6x speed improvement, good quality
- **Medium Quality**: 2x speed improvement, excellent quality
- **High Quality**: Optimized but slower, best quality

## Best Practices

1. **Use Fast Quality** for initial testing and quick conversions
2. **Medium Quality** for production web content
3. **High Quality** only when maximum quality is required
4. **Monitor Performance** regularly using the `/api/performance` endpoint
5. **Scale Resolution** for very large videos to improve speed
6. **Hardware Acceleration** ensure your Docker setup can access GPU resources if available

## Future Optimizations

- **AV1 Codec Support**: For next-generation video compression
- **Distributed Processing**: Multi-container processing for large files
- **Caching**: Intelligent caching for repeated conversions
- **Progressive Upload**: Stream processing for very large files 