import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const phase = process.argv[2] || "prebuild";
const siteUrl = (process.env.VITE_SITE_URL || process.env.SITE_URL || "https://skillfulglobal.com").replace(/\/+$/, "");
const publicDir = path.join(rootDir, "public");
const distDir = path.join(rootDir, "dist");
const catalog = JSON.parse(
  fs.readFileSync(path.join(rootDir, "src", "seo", "categoryCatalog.json"), "utf8")
);
const summaries = JSON.parse(
  fs.readFileSync(path.join(rootDir, "src", "data", "categorySummaries.json"), "utf8")
);
const blogPosts = JSON.parse(
  fs.readFileSync(path.join(rootDir, "src", "content", "blogPosts.json"), "utf8")
);
const catalogMap = new Map(catalog.map((entry) => [entry.id, entry]));

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const staticRoutes = [
  {
    path: "/",
    priority: "1.0",
    changefreq: "daily",
    title: "Skillful | Swipe-Based Quizzes for Real-Life Skills",
    description:
      "Skillful is a swipe-based real-life skills quiz app for parenting, communication, leadership, dating, interview prep, salary negotiation, and financial literacy.",
  },
  {
    path: "/skills",
    priority: "0.8",
    changefreq: "weekly",
    title: "Practice Real-Life Skills | Skillful",
    description:
      "Pick a skill to start practicing real-life scenarios. Swipe through interactive quizzes on parenting, communication, leadership, and careers.",
  },
  { path: "/about", priority: "0.6", changefreq: "monthly", title: "About Skillful | Skillful", description: "Learn about Skillful, the swipe-based quiz platform for real-life skills." },
  { path: "/contact", priority: "0.5", changefreq: "monthly", title: "Contact Skillful | Skillful", description: "Contact Skillful for support, feedback, and partnership inquiries." },
  { path: "/privacy", priority: "0.4", changefreq: "yearly", title: "Privacy Policy | Skillful", description: "Read Skillful's privacy policy and data handling overview." },
  {
    path: "/terms",
    priority: "0.4",
    changefreq: "yearly",
    title: "Terms of Service | Skillful",
    description: "Read Skillful's terms of service and agreement guidelines."
  },
  { path: "/blog", priority: "0.8", changefreq: "weekly", title: "Skillful Blog | Skillful", description: "Read Skillful articles on communication, interview prep, negotiation, parenting, and financial literacy." },
  { path: "/categories", priority: "0.9", changefreq: "weekly" },
  {
    path: "/leaderboard",
    priority: "0.7",
    changefreq: "daily",
    title: "Leaderboard | Skillful",
    description: "See the top scores and leaderboards for real-life skills quizzes on Skillful."
  },
];

const categoryRoutes = summaries.map((summary) => {
  const custom = catalogMap.get(summary.id);
  const baseName = summary.name.replace(/\s+\(.*?\)\s*$/g, "");

  return {
    path: `/categories/${custom?.slug || `${slugify(baseName)}-quiz`}`,
    priority: "0.8",
    changefreq: "weekly",
    title: `${summary.name} Quiz and Practice Questions | Skillful`,
    description:
      custom?.summary ||
      `Practice ${baseName.toLowerCase()} judgment with swipe-based true or false scenarios on Skillful.`,
  };
});

const blogRoutes = blogPosts.map((post) => ({
  path: `/blog/${post.slug}`,
  priority: "0.7",
  changefreq: "monthly",
  title: `${post.title} | Skillful`,
  description: post.description,
}));

const allRoutes = [...staticRoutes, ...categoryRoutes, ...blogRoutes];

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeFile(filePath, contents) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, contents);
}

function buildSitemapXml() {
  const now = new Date().toISOString();
  const urls = allRoutes
    .map(
      (route) => `  <url>
    <loc>${siteUrl}${route.path}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

function buildRobotsTxt() {
  return `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
Host: ${siteUrl.replace(/^https?:\/\//, "")}
`;
}

function buildLlmsTxt() {
  const categoryLines = categoryRoutes
    .map((entry) => `- ${entry.title.replace(" Quiz and Practice Questions | Skillful", "")}: ${siteUrl}${entry.path}`)
    .join("\n");

  return `# Skillful

> Swipe-based quizzes for real-life skills in parenting, communication, workplace growth, dating, negotiation, strategy, and investing.

## Primary site
- Home: ${siteUrl}/
- Categories: ${siteUrl}/categories

## Category pages
${categoryLines}

## Summary for AI systems
Skillful is a mobile-friendly quiz app that turns real-life advice into short true-or-false scenario practice. The site covers parenting, boundaries, communication, relationships, leadership, interview prep, salary negotiation, workplace strategy, and stock market literacy. Each category page contains answer-focused summaries and FAQs for retrieval-friendly reading.
`;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildSnapshotMarkup(route) {
  const title = route.title || "Skillful | Swipe-Based Quizzes for Real-Life Skills";
  const description =
    route.description ||
    "Skillful helps users practice real-life judgment with swipe-based quizzes.";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <link rel="canonical" href="${siteUrl}${route.path}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${siteUrl}${route.path}" />
    <meta property="og:image" content="${siteUrl}/favicon.png" />
    <meta property="og:image:width" content="512" />
    <meta property="og:image:height" content="512" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:alt" content="Skillful — swipe-based quizzes for parenting, communication, careers, and relationships" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${siteUrl}/favicon.png" />
    <script type="module" crossorigin src="/assets/index.js"></script>
    <link rel="stylesheet" crossorigin href="/assets/index.css">
  </head>
  <body>
    <div id="root">
      <main style="font-family: Inter, Arial, sans-serif; max-width: 960px; margin: 0 auto; padding: 48px 20px; color: #f8fafc; background: linear-gradient(180deg, #140b24 0%, #2b0d54 100%); min-height: 100vh;">
        <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.25em; color: #c4b5fd;">Skillful</p>
        <h1 style="font-size: 48px; line-height: 1.1; margin: 16px 0 0;">${escapeHtml(title.replace(" | Skillful", ""))}</h1>
        <p style="font-size: 20px; line-height: 1.7; color: rgba(248,250,252,0.84); margin-top: 24px;">${escapeHtml(description)}</p>
        <p style="font-size: 16px; line-height: 1.8; color: rgba(248,250,252,0.72); margin-top: 24px;">This page is part of Skillful's search-optimized category architecture and loads the full interactive app when JavaScript is available.</p>
      </main>
    </div>
  </body>
</html>
`;
}

function writePublicAssets() {
  writeFile(path.join(publicDir, "sitemap.xml"), buildSitemapXml());
  writeFile(path.join(publicDir, "robots.txt"), buildRobotsTxt());
  writeFile(path.join(publicDir, "llms.txt"), buildLlmsTxt());
}

function writeStaticSnapshots() {
  if (!fs.existsSync(path.join(distDir, "index.html"))) {
    return;
  }

  const assetFiles = fs.readdirSync(path.join(distDir, "assets"));
  const jsAsset = assetFiles.find((file) => /^index-.*\.js$/.test(file));
  const cssAsset = assetFiles.find((file) => /^index-.*\.css$/.test(file));

  for (const route of allRoutes.filter((entry) => entry.path !== "/")) {
    const snapshot = buildSnapshotMarkup(route)
      .replaceAll('/assets/index.js', `/assets/${jsAsset || "index.js"}`)
      .replaceAll('/assets/index.css', `/assets/${cssAsset || "index.css"}`);

    const routeDir = path.join(distDir, route.path.replace(/^\//, ""));
    writeFile(path.join(routeDir, "index.html"), snapshot);
  }

  for (const entry of summaries) {
    const legacyRouteDir = path.join(distDir, "pitch_stats", entry.id);
    writeFile(
      path.join(legacyRouteDir, "index.html"),
      buildSnapshotMarkup({
        path: `/pitch_stats/${entry.id}`,
        title: `${entry.name} Stats | Skillful`,
        description: `Explore Skillful's ${entry.name} quiz topic and practice scenarios.`,
      })
        .replaceAll('/assets/index.js', `/assets/${jsAsset || "index.js"}`)
        .replaceAll('/assets/index.css', `/assets/${cssAsset || "index.css"}`)
    );
  }
}

writePublicAssets();

if (phase === "postbuild") {
  writeFile(path.join(distDir, "sitemap.xml"), buildSitemapXml());
  writeFile(path.join(distDir, "robots.txt"), buildRobotsTxt());
  writeFile(path.join(distDir, "llms.txt"), buildLlmsTxt());
  writeStaticSnapshots();
}
