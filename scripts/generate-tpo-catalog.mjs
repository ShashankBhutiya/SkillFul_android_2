/**
 * Generates the TPO portal's category catalog from the app's student catalog.
 *
 * The portal is a separate site and must not pull in studentQuestions.ts — that
 * file is ~340 kB of question text the dashboard never renders. It needs only
 * each category's id, name, emoji and question count, so we bundle the source
 * with esbuild, read the export, and emit a small typed manifest.
 *
 * Run from the repo root after adding or renaming a student category:
 *   node scripts/generate-tpo-catalog.mjs
 */
import { build } from "esbuild";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(root, "tpo-portal", "src", "data", "catalog.ts");
const TMP = path.join(root, "node_modules", ".cache", "tpo-catalog.mjs");

await fs.mkdir(path.dirname(TMP), { recursive: true });

await build({
    entryPoints: [path.join(root, "src", "data", "studentQuestions.ts")],
    outfile: TMP,
    bundle: true,
    format: "esm",
    platform: "node",
    logLevel: "error",
    // questions.ts imports it back; the alias keeps the graph resolvable.
    alias: { "@": path.join(root, "src") },
});

const { studentCategories } = await import(pathToFileURL(TMP).href);

const rows = studentCategories.map((c) => ({
    id: c.id,
    name: c.name,
    emoji: c.emoji,
    questionCount: c.questions.length,
}));

// AI sets are intentionally represented as one virtual category. Their topics
// are free-form, so forcing them into stale hard-coded CS category ids would
// make the dashboard disagree with what the student actually practised.
rows.push({
    id: "ai_practice",
    name: "Personalised AI Practice",
    emoji: "✨",
    questionCount: 40,
});

const body = rows
    .map(
        (r) =>
            `    { id: ${JSON.stringify(r.id)}, name: ${JSON.stringify(r.name)}, ` +
            `emoji: ${JSON.stringify(r.emoji)}, questionCount: ${r.questionCount} },`
    )
    .join("\n");

const file = `/**
 * Student category catalog — GENERATED, do not edit by hand.
 *
 * Source: src/data/studentQuestions.ts in the SkillFul app repo.
 * Regenerate with: node scripts/generate-tpo-catalog.mjs
 *
 * Only the fields the dashboard actually renders are carried over, so the
 * portal never ships the question text itself.
 */

export interface CatalogCategory {
    id: string;
    name: string;
    emoji: string;
    /** How many questions exist, which sets the coverage denominator. */
    questionCount: number;
}

export const CATALOG: CatalogCategory[] = [
${body}
];

export const CATALOG_BY_ID = new Map(CATALOG.map((c) => [c.id, c]));
`;

await fs.mkdir(path.dirname(OUT), { recursive: true });
await fs.writeFile(OUT, file, "utf8");
await fs.rm(TMP, { force: true });

console.log(`Wrote ${rows.length} categories to tpo-portal/src/data/catalog.ts`);
