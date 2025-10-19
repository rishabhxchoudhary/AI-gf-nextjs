/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  env: {
    LIGHTNINGCSS_EXPERIMENTAL: 'false',
  },
  webpack: (config, { isServer }) => {
    // Add fallback for lightningcss on server side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        lightningcss: false,
      };
    }
    return config;
  },
};

export default config;
