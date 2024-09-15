/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@ffmpeg/ffmpeg', '@ffmpeg/util', 'fluent-ffmpeg'],
};

export default nextConfig;
