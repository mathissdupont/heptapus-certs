import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";


const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const docsRoot = path.resolve(scriptDir, "..");
const pagesRoot = path.join(docsRoot, "pages");
const repoRoot = path.resolve(docsRoot, "..", "..");

async function walk(root, extensions) {
  const files = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === "_archive_lms") {
      continue;
    }
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(absolute, extensions));
    } else if (extensions.has(path.extname(entry.name))) {
      files.push(absolute);
    }
  }
  return files;
}

function routeForPage(file) {
  const relative = path.relative(pagesRoot, file).replaceAll(path.sep, "/");
  const withoutExtension = relative.replace(/\.(mdx|jsx|tsx|js|ts)$/, "");
  const withoutLocale = withoutExtension.replace(/\.en$/, "");
  const route = withoutLocale.replace(/(^|\/)index$/, "");
  return route ? `/${route}`.replace(/\/$/, "") : "/";
}

function lineNumber(text, offset) {
  return text.slice(0, offset).split("\n").length;
}

const pageFiles = await walk(pagesRoot, new Set([".mdx", ".jsx", ".tsx", ".js", ".ts"]));
const routes = new Set(pageFiles.map(routeForPage));
const failures = [];

for (const file of pageFiles.filter((candidate) => candidate.endsWith(".mdx"))) {
  const text = await readFile(file, "utf8");
  const markdownLink = /\]\((\/[^)\s?#]+)(?:[?#][^)]*)?\)/g;
  for (const match of text.matchAll(markdownLink)) {
    const target = match[1] === "/" ? "/" : match[1].replace(/\/$/, "");
    if (!routes.has(target)) {
      failures.push(
        `${path.relative(repoRoot, file)}:${lineNumber(text, match.index)} links to missing docs route ${target}`,
      );
    }
  }
}

const contractRoots = [
  pagesRoot,
  path.join(repoRoot, "heptacert", "frontend", "public"),
  path.join(repoRoot, "heptacert", "frontend", "src"),
  path.join(repoRoot, "heptacert", "backend", "src"),
  path.join(repoRoot, "heptacert", "cli"),
];
const contractFiles = (
  await Promise.all(contractRoots.map((root) => walk(root, new Set([".md", ".mdx", ".txt", ".py", ".ts", ".tsx", ".js", ".jsx"]))))
).flat();
const forbiddenContracts = [
  ["retired app subdomain", /https:\/\/app\.heptacert\.com/g],
  ["retired certificate route", /heptacert\.com\/c\//g],
  ["disabled Swagger UI", /https:\/\/heptacert\.com\/docs(?:\b|\/)|Swagger UI at \/docs\b/g],
  ["disabled ReDoc UI", /https:\/\/heptacert\.com\/redoc(?:\b|\/)|ReDoc at \/redoc\b/g],
  ["nonexistent frontend documentation route", /\/docs\/mcp-agent\b/g],
];

for (const file of contractFiles) {
  const text = await readFile(file, "utf8");
  for (const [label, pattern] of forbiddenContracts) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      failures.push(`${path.relative(repoRoot, file)}:${lineNumber(text, match.index)} advertises ${label}`);
    }
  }
}

const cliConfig = await readFile(path.join(repoRoot, "heptacert", "cli", "heptacert_cli", "config.py"), "utf8");
if (!cliConfig.includes('DEFAULT_API_BASE = "https://heptacert.com"')) {
  failures.push("heptacert/cli/heptacert_cli/config.py must default to https://heptacert.com");
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Checked ${pageFiles.length} documentation pages and ${contractFiles.length} public contract files.`);
}
