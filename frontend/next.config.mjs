/** @type {import('next').NextConfig} */
const nextConfig = {
  // "standalone" output is needed for the Docker image (server.js runner).
  // It is intentionally NOT used for the OpenNext Cloudflare deployment.
  // The Docker build sets BUILD_STANDALONE=1 to opt in.
  ...(process.env.BUILD_STANDALONE === "1" ? { output: "standalone" } : {}),
  poweredByHeader: false,
  images: {
    // Cloudflare Pages handles images via its own optimizer
    unoptimized: true,
  },
};

export default nextConfig;
