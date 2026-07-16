import type { NextConfig } from "next";

// GitHub Pages is a plain file server — it cannot run a build or a Node server,
// so the app ships as pre-rendered HTML/JS. That works here only because nothing
// runs server-side: the rotation, costing and shopping list are all client work.
//
// The site lives at /ShelfLife rather than the domain root (it is a project page,
// not the user page), so assets need that prefix. Local `npm run dev` serves from
// the root, hence the env switch.
const isPages = process.env.GITHUB_PAGES === "true";
const repo = "/ShelfLife";

// Next warns that it inferred the workspace root, because the parent folder has
// its own package-lock.json. The warning is cosmetic and the inference is
// harmless here. Do not "fix" it by setting `turbopack.root` to __dirname —
// that resolves to the parent and breaks the dev server's module resolution.
const nextConfig: NextConfig = {
  output: "export",
  basePath: isPages ? repo : "",
  assetPrefix: isPages ? repo : "",
  // Pages has no rewrite layer, so /shop must resolve to a real /shop/index.html.
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
