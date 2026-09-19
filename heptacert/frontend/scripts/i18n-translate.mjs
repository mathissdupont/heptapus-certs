#!/usr/bin/env node
/**
 * i18n translation pipeline (WP18 Faz D, ADR-0021).
 *
 * Reads the English base catalog (src/locales/en.ts) and produces target-locale
 * catalogs (src/locales/<lang>.ts) via the DeepL API. Idempotent: keys already
 * present in a target file are kept (human-reviewed translations are never
 * overwritten) — only missing keys are translated. {placeholders} are protected
 * from translation.
 *
 * Usage:
 *   DEEPL_API_KEY=xxxx node scripts/i18n-translate.mjs            # all Tier-1 langs
 *   DEEPL_API_KEY=xxxx node scripts/i18n-translate.mjs de fr      # specific langs
 *   node scripts/i18n-translate.mjs --dry-run                     # parse only, no API
 *
 * Free DeepL keys (api-free.deepl.com) end with ":fx" and are auto-detected.
 * Legal pages (KVKK/terms) should NOT rely on machine translation — review them.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = join(__dirname, "..", "src", "locales");
const BASE_FILE = join(LOCALES_DIR, "en.ts");

// Target locale -> DeepL target_lang code. Add a locale here + register it in
// src/lib/i18n.tsx after its file is generated.
const TARGETS = {
  de: "DE",
  fr: "FR",
  es: "ES",
  nl: "NL",
  ru: "RU",
  it: "IT",
  pt: "PT-PT",
};

const KEY_LINE = /^(\s+)([a-zA-Z0-9_]+):\s*"((?:[^"\\]|\\.)*)"\s*,?\s*$/;

/** Parse a locale .ts file into an ordered list of {indent,key,value} + a key->value map. */
function parseLocale(path) {
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  const entries = [];
  const map = new Map();
  for (const line of lines) {
    const m = line.match(KEY_LINE);
    if (m) {
      const [, indent, key, value] = m;
      entries.push({ indent, key, value });
      map.set(key, value);
    }
  }
  return { entries, map };
}

/** Protect {placeholders} so DeepL leaves them intact (xml ignore tags). */
function protect(text) {
  return text.replace(/\{[a-zA-Z0-9_]+\}/g, (m) => `<x>${m}</x>`);
}
function unprotect(text) {
  return text.replace(/<x>(\{[a-zA-Z0-9_]+\})<\/x>/g, "$1").replace(/<\/?x>/g, "");
}

async function deeplTranslate(texts, targetLang, apiKey) {
  const host = apiKey.endsWith(":fx") ? "api-free.deepl.com" : "api.deepl.com";
  const body = new URLSearchParams();
  body.set("source_lang", "EN");
  body.set("target_lang", targetLang);
  body.set("tag_handling", "xml");
  body.set("ignore_tags", "x");
  body.set("preserve_formatting", "1");
  for (const t of texts) body.append("text", protect(t));

  const res = await fetch(`https://${host}/v2/translate`, {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${apiKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) {
    throw new Error(`DeepL ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const data = await res.json();
  return data.translations.map((t) => unprotect(t.text));
}

function renderLocaleFile(code, baseEntries, translatedMap) {
  const lines = [
    `import type { TranslationKey } from "./tr";`,
    ``,
    `export const ${code}: Record<TranslationKey, string> = {`,
  ];
  for (const { key } of baseEntries) {
    const value = translatedMap.get(key) ?? "";
    lines.push(`  ${key}: "${value.replace(/"/g, '\\"')}",`);
  }
  lines.push(`};`, ``);
  return lines.join("\n");
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const requested = args.filter((a) => !a.startsWith("--"));
  const langs = requested.length ? requested : Object.keys(TARGETS);

  const base = parseLocale(BASE_FILE);
  console.log(`Base (en): ${base.entries.length} keys`);

  for (const code of langs) {
    const targetLang = TARGETS[code];
    if (!targetLang) {
      console.warn(`! Unknown target "${code}" — add it to TARGETS. Skipping.`);
      continue;
    }
    const outPath = join(LOCALES_DIR, `${code}.ts`);
    const existing = existsSync(outPath) ? parseLocale(outPath).map : new Map();

    // Only translate keys missing (or empty) in the existing target file.
    const todo = base.entries.filter(({ key }) => {
      const cur = existing.get(key);
      return cur === undefined || cur === "";
    });
    console.log(`\n[${code}] ${existing.size} existing, ${todo.length} to translate`);

    if (dryRun) continue;

    const apiKey = process.env.DEEPL_API_KEY;
    if (!apiKey) {
      console.error("✗ DEEPL_API_KEY not set — run with --dry-run or provide a key.");
      process.exit(1);
    }

    const translatedMap = new Map(existing);
    const BATCH = 45; // DeepL allows up to 50 texts/request; stay under.
    for (let i = 0; i < todo.length; i += BATCH) {
      const slice = todo.slice(i, i + BATCH);
      const out = await deeplTranslate(slice.map((e) => e.value), targetLang, apiKey);
      slice.forEach((e, idx) => translatedMap.set(e.key, out[idx]));
      console.log(`  ${Math.min(i + BATCH, todo.length)}/${todo.length}`);
    }

    writeFileSync(outPath, renderLocaleFile(code, base.entries, translatedMap), "utf8");
    console.log(`✓ wrote ${outPath}`);
  }

  if (dryRun) console.log("\n(dry run — no API calls, no files written)");
  console.log("\nNext: register generated locales in src/lib/i18n.tsx (import + LOCALES + LANG_LABELS + Lang union).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
