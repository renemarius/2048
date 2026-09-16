/** @type {import('next').NextConfig} */
const nextConfig = {
  // "core" is a workspace package consumed as raw TypeScript source
  // (packages/core/package.json "main" points at src/index.ts) — this
  // tells Next to transpile it instead of expecting a pre-built dist/.
  transpilePackages: ['core'],
};

export default nextConfig;
