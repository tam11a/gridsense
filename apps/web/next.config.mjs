/** @type {import('next').NextConfig} */
const nextConfig = {
	// Self-contained server bundle for the Docker image (apps/web/Dockerfile).
	output: "standalone",
	poweredByHeader: false,
};

export default nextConfig;
