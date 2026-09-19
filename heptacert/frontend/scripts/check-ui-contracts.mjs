#!/usr/bin/env node
/**
 * UI contract ratchet (WP32 Phase 0).
 *
 * Counts the patterns that block multi-language support, dark mode and the date/time
 * picker migration, and fails when any count rises above the committed baseline in
 * scripts/ui-contracts-baseline.json. Counts may only fall. When one does fall, the check
 * fails until the lower number is locked in with --update-baseline, so debt that has been
 * paid cannot quietly come back.
 *
 * It also validates the translation catalogs in src/locales/*.ts: key parity with the
 * reference catalog, no empty or duplicate keys, and identical {placeholders} across
 * languages. Locales listed in src/i18n/routing.ts must be complete, because an
 * incomplete locale must never be advertised to search engines.
 *
 * Usage:
 *   node scripts/check-ui-contracts.mjs                    # check (what CI runs)
 *   node scripts/check-ui-contracts.mjs --update-baseline  # lock in lower counts
 *   node scripts/check-ui-contracts.mjs --report <rule-id> # per-file counts for one rule
 */

import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const frontendRoot = path.resolve(scriptDir, "..");
const srcRoot = path.join(frontendRoot, "src");
const localesDir = path.join(srcRoot, "locales");
const routingFile = path.join(srcRoot, "i18n", "routing.ts");
const baselineFile = path.join(scriptDir, "ui-contracts-baseline.json");

const REFERENCE_LOCALE = "tr"; // TranslationKey is derived from tr.ts
const ALWAYS_COMPLETE = ["tr", "en"]; // en is the runtime fallback

export const RULES = [
  {
    id: "lang-binary-check",
    summary: "binary language checks — a third language silently falls back to English",
    fix: 'move the text into src/locales/*.ts and read it with t("key")',
    pattern:
      /\b(?:lang|locale|language)\s*[!=]==?\s*["'](?:tr|en)["']|\b(?:lang|locale|language)\.startsWith\(\s*["'](?:tr|en)["']\s*\)/g,
  },
  {
    id: "lang-indexed-lookup",
    summary: "values indexed by [lang] — undefined, usually a crash, for a third language",
    fix: "use catalog keys; as a stopgap write value[lang] ?? value.en",
    // Preceded by an identifier, `}`, `)`, `]` or `?.`, so dependency arrays like
    // `useMemo(fn, [lang])` do not match. The sanctioned `?? fallback` form is excluded.
    pattern: /(?<=[\w$})\].])\[\s*lang\s*\](?!\s*\?\?)/g,
    skip: ["src/lib/i18n.tsx"],
  },
  {
    id: "locale-tag-ternary",
    summary: 'binary "tr-TR" / "en-US" switches — dates and numbers format wrongly in other languages',
    fix: "derive the locale tag from the active language with the shared helper",
    pattern: /\?\s*["'](?:tr-TR|en-US)["']\s*:\s*["'](?:tr-TR|en-US)["']/g,
  },
  {
    id: "locale-tag-literal",
    summary: 'hardcoded "tr-TR" / "en-US" locale tags',
    fix: "format with the active language's tag instead of a fixed one",
    pattern: /["'](?:tr-TR|en-US)["']/g,
    skip: ["src/lib/localeTag.ts"],
  },
  {
    id: "native-date-input",
    summary: "browser-native date/time inputs — they follow the browser's language and ignore the theme",
    fix: "use DateField / TimeField / DateTimeField from components/Admin",
    pattern: /\btype=\{?\s*["'](?:date|datetime-local|time|month|week)["']\s*\}?/g,
    extensions: [".tsx"],
  },
  {
    id: "raw-hex-color",
    summary: "raw hex colors — they bypass the design tokens and cannot follow the theme (ADR-0014)",
    fix: "use a semantic token or a theme color utility",
    pattern: /\[#[0-9a-fA-F]{3,8}\]|["'`]#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})["'`]/g,
    extensions: [".tsx"],
  },
  {
    id: "light-only-color",
    summary: "light-only color utilities (bg-white, gray-*, slate-*) — they cannot invert for dark mode",
    fix: "use surface-* or semantic role utilities (ADR-0022)",
    pattern:
      /(?<![\w-])(?:bg-white|(?:text|bg|border|ring|divide|placeholder|from|via|to|fill|stroke|outline|accent|caret)-(?:gray|slate)-\d{2,3})(?![\w-])/g,
  },
];

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);
const SKIPPED_DIRS = new Set(["node_modules", ".next", "_archive_lms", "test", "locales"]);

export function countRule(rule, text) {
  return (text.match(rule.pattern) || []).length;
}

function appliesTo(rule, relativePath) {
  if (rule.extensions && !rule.extensions.includes(path.extname(relativePath))) return false;
  if (rule.skip?.includes(relativePath)) return false;
  return true;
}

// ── Catalogs ─────────────────────────────────────────────────────────────

const KEY_LINE = /^\s+([A-Za-z0-9_]+):\s*"((?:[^"\\]|\\.)*)"\s*,?\s*$/;
const KEY_LIKE = /^\s+[A-Za-z0-9_]+\s*:/;
const PLACEHOLDER = /\{([A-Za-z0-9_]+)\}/g;

export function parseCatalog(text) {
  const entries = new Map();
  const unparsed = [];
  const duplicates = [];
  text.split(/\r?\n/).forEach((line, index) => {
    const match = line.match(KEY_LINE);
    if (match) {
      if (entries.has(match[1])) duplicates.push(match[1]);
      entries.set(match[1], match[2]);
    } else if (KEY_LIKE.test(line)) {
      unparsed.push(index + 1);
    }
  });
  return { entries, unparsed, duplicates };
}

export function placeholders(value) {
  return [...new Set([...value.matchAll(PLACEHOLDER)].map((m) => m[1]))].sort();
}

export function checkCatalogs(catalogs, { reference = REFERENCE_LOCALE, required = ALWAYS_COMPLETE } = {}) {
  const problems = [];
  const warnings = [];
  const ref = catalogs[reference];
  if (!ref) return { problems: [`reference catalog ${reference}.ts is missing`], warnings };

  for (const [name, catalog] of Object.entries(catalogs)) {
    for (const line of catalog.unparsed) {
      problems.push(`${name}.ts:${line} could not be parsed — keep one  key: "value",  entry per line`);
    }
    for (const key of catalog.duplicates) problems.push(`${name}.ts: duplicate key ${key}`);

    for (const [key, value] of catalog.entries) {
      if (!value.trim()) problems.push(`${name}.ts: ${key} is empty`);
      if (!ref.entries.has(key)) {
        problems.push(`${name}.ts: ${key} does not exist in ${reference}.ts`);
        continue;
      }
      const expected = placeholders(ref.entries.get(key)).join(", ");
      const actual = placeholders(value).join(", ");
      if (expected !== actual) {
        problems.push(`${name}.ts: ${key} has placeholders {${actual}} but ${reference}.ts has {${expected}}`);
      }
    }

    const missing = [...ref.entries.keys()].filter((key) => !catalog.entries.has(key));
    if (missing.length) {
      const sample = missing.slice(0, 5).join(", ") + (missing.length > 5 ? ", …" : "");
      const message = `${name}.ts is missing ${missing.length} key(s): ${sample}`;
      (required.includes(name) ? problems : warnings).push(message);
    }
  }
  return { problems, warnings };
}

export function parseRoutingLocales(text) {
  const match = text.match(/\blocales\s*=\s*\[([^\]]*)\]/);
  if (!match) return [];
  return [...match[1].matchAll(/["']([a-z]{2}(?:-[A-Z]{2})?)["']/g)].map((m) => m[1]);
}

// ── Baseline ─────────────────────────────────────────────────────────────

export function evaluate(counts, baseline) {
  const failures = [];
  const improvements = [];
  for (const rule of RULES) {
    const current = counts[rule.id];
    const allowed = baseline?.counts?.[rule.id];
    if (allowed === undefined) {
      failures.push(`${rule.id}: no baseline recorded — run with --update-baseline`);
    } else if (current > allowed) {
      failures.push(`${rule.id}: ${current} (baseline ${allowed}) — ${rule.summary}. Fix: ${rule.fix}.`);
    } else if (current < allowed) {
      improvements.push(`${rule.id}: ${allowed} → ${current}`);
    }
  }
  return { failures, improvements };
}

export function cleanPathViolations(perFile, cleanPaths) {
  const violations = [];
  for (const [file, counts] of Object.entries(perFile)) {
    if (!cleanPaths.some((prefix) => file === prefix || file.startsWith(`${prefix.replace(/\/$/, "")}/`))) continue;
    for (const [ruleId, count] of Object.entries(counts)) {
      if (count > 0) violations.push(`${file}: ${count} × ${ruleId} in a path that must stay clean`);
    }
  }
  return violations;
}

// ── File system ──────────────────────────────────────────────────────────

async function walk(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRS.has(entry.name)) files.push(...(await walk(path.join(dir, entry.name))));
    } else if (SOURCE_EXTENSIONS.has(path.extname(entry.name)) && !/\.(test|spec)\.tsx?$/.test(entry.name)) {
      files.push(path.join(dir, entry.name));
    }
  }
  return files;
}

async function measure() {
  const totals = Object.fromEntries(RULES.map((rule) => [rule.id, 0]));
  const perFile = {};
  for (const file of await walk(srcRoot)) {
    const relative = path.relative(frontendRoot, file).split(path.sep).join("/");
    const text = await readFile(file, "utf8");
    for (const rule of RULES) {
      if (!appliesTo(rule, relative)) continue;
      const count = countRule(rule, text);
      if (!count) continue;
      totals[rule.id] += count;
      (perFile[relative] ??= {})[rule.id] = count;
    }
  }
  return { totals, perFile };
}

async function loadCatalogs() {
  const catalogs = {};
  for (const entry of await readdir(localesDir)) {
    if (!entry.endsWith(".ts")) continue;
    catalogs[path.basename(entry, ".ts")] = parseCatalog(await readFile(path.join(localesDir, entry), "utf8"));
  }
  let routed = [];
  try {
    routed = parseRoutingLocales(await readFile(routingFile, "utf8"));
  } catch {
    // src/i18n/routing.ts does not exist until the multi-language branch lands (WP32 Phase 1).
  }
  return { catalogs, routed };
}

async function readBaseline() {
  try {
    return JSON.parse(await readFile(baselineFile, "utf8"));
  } catch {
    return null;
  }
}

async function writeBaseline(counts, previous) {
  const body = {
    $comment:
      "WP32 UI contract ratchet. Counts may only fall. Lower them with `npm run check:ui -- --update-baseline`; never raise them by hand. cleanPaths must have zero matches for every rule.",
    counts: Object.fromEntries(RULES.map((rule) => [rule.id, counts[rule.id]])),
    cleanPaths: previous?.cleanPaths ?? [],
  };
  await writeFile(baselineFile, `${JSON.stringify(body, null, 2)}\n`);
}

async function main(argv) {
  const { totals, perFile } = await measure();

  const reportIndex = argv.indexOf("--report");
  if (reportIndex !== -1) {
    const ruleId = argv[reportIndex + 1];
    if (!RULES.some((rule) => rule.id === ruleId)) {
      console.error(`Unknown rule. Choose one of: ${RULES.map((rule) => rule.id).join(", ")}`);
      return 1;
    }
    Object.entries(perFile)
      .filter(([, counts]) => counts[ruleId])
      .sort(([, a], [, b]) => b[ruleId] - a[ruleId])
      .forEach(([file, counts]) => console.log(`${String(counts[ruleId]).padStart(5)}  ${file}`));
    console.log(`${String(totals[ruleId]).padStart(5)}  total`);
    return 0;
  }

  const baseline = await readBaseline();

  if (argv.includes("--update-baseline")) {
    const raised = baseline ? RULES.filter((rule) => totals[rule.id] > (baseline.counts?.[rule.id] ?? Infinity)) : [];
    if (raised.length) {
      console.error("Refusing to raise the baseline. These counts went up — fix them instead:");
      raised.forEach((rule) => console.error(`  ${rule.id}: ${baseline.counts[rule.id]} → ${totals[rule.id]}`));
      return 1;
    }
    await writeBaseline(totals, baseline);
    console.log(`Baseline written to ${path.relative(frontendRoot, baselineFile)}:`);
    RULES.forEach((rule) => console.log(`  ${rule.id}: ${totals[rule.id]}`));
    return 0;
  }

  const errors = [];
  const { failures, improvements } = evaluate(totals, baseline);
  errors.push(...failures);
  if (improvements.length) {
    errors.push(
      `Counts dropped — lock them in so they cannot rise again: npm run check:ui -- --update-baseline\n    ${improvements.join("\n    ")}`,
    );
  }
  errors.push(...cleanPathViolations(perFile, baseline?.cleanPaths ?? []));

  const { catalogs, routed } = await loadCatalogs();
  const { problems, warnings } = checkCatalogs(catalogs, {
    required: [...new Set([...ALWAYS_COMPLETE, ...routed])],
  });
  errors.push(...problems);

  warnings.forEach((warning) => console.warn(`warning: ${warning}`));
  if (errors.length) {
    console.error(errors.map((error) => `✗ ${error}`).join("\n"));
    console.error("\nPer-file detail: npm run check:ui -- --report <rule-id>");
    return 1;
  }

  const catalogSummary = Object.entries(catalogs)
    .map(([name, catalog]) => `${name} ${catalog.entries.size}`)
    .join(", ");
  console.log(`UI contracts hold at baseline: ${RULES.map((rule) => `${rule.id} ${totals[rule.id]}`).join(" · ")}`);
  console.log(`Catalogs consistent: ${catalogSummary} keys`);
  return 0;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
const isMain = process.platform === "win32" ? invokedPath.toLowerCase() === scriptPath.toLowerCase() : invokedPath === scriptPath;
if (isMain) {
  main(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
