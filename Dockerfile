# Use Node.js 20 Alpine as base image for smaller size
FROM node:20-alpine

# Install FFmpeg and other necessary packages for optimal performance
RUN apk add --no-cache \
    ffmpeg \
    ffmpeg-dev \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy source code
COPY . .

# Install dependencies (including dev dependencies for build)
RUN npm ci --ignore-scripts

# Build the application
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm prune --omit=dev

# Create directory for temporary files with proper permissions
RUN mkdir -p /tmp/conversions && chmod 777 /tmp/conversions

# Expose port
EXPOSE 3000

# Set environment variables for optimal performance
ENV NODE_ENV=production
ENV FFMPEG_PATH=/usr/bin/ffmpeg
ENV FFPROBE_PATH=/usr/bin/ffprobe
ENV UV_THREADPOOL_SIZE=16

# Start the application
CMD ["npm", "start"] 