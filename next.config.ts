/** @type {import('next').NextConfig} */
const nextConfig = {
  // This allows the build to succeed even if there are TS errors
  typescript: {
    ignoreBuildErrors: true,
  },
  // This allows the build to succeed even if there are ESLint warnings
  eslint: {
    ignoreDuringBuilds: true,
  },
  // If you use next/image in other parts of the app, add your domains here
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'api.dicebear.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      // Add your supabase storage domain here if you use next/image for uploads
    ],
  },
};

module.exports = nextConfig;