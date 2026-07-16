import type { NextConfig } from "next";

// Next warns that it inferred the workspace root, because the parent folder has
// its own package-lock.json. The warning is cosmetic and the inference is
// harmless here. Do not "fix" it by setting `turbopack.root` to __dirname —
// that resolves to the parent and breaks the dev server's module resolution.
const nextConfig: NextConfig = {};

export default nextConfig;
