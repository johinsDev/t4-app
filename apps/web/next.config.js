/** @type {import('next').NextConfig} */
const nextConfig = {
	images: {
		remotePatterns: [
			...(process.env.R2_PUBLIC_URL
				? [{ protocol: "https", hostname: new URL(process.env.R2_PUBLIC_URL).hostname }]
				: []),
		],
	},
};

export default nextConfig;
