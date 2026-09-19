import { describe, expect, it } from "vitest";

import {
  RULES,
  checkCatalogs,
  cleanPathViolations,
  countRule,
  evaluate,
  parseCatalog,
  parseRoutingLocales,
} from "../../scripts/check-ui-contracts.mjs";

function count(ruleId: string, text: string) {
  const rule = RULES.find((candidate) => candidate.id === ruleId);
  if (!rule) throw new Error(`unknown rule ${ruleId}`);
  return countRule(rule, text);
}

const catalog = (body: string) => parseCatalog(`export const x = {\n${body}\n};`);

describe("UI contract rules", () => {
  it("flags binary language checks but not full locale tags or catalog lookups", () => {
    expect(count("lang-binary-check", `lang === "tr" ? a : b; lang !== 'en'; locale.startsWith("tr")`)).toBe(3);
    expect(count("lang-binary-check", `lang === "tr-TR"; t("home_title"); language.length`)).toBe(0);
  });

  it("flags lookups indexed by lang, but not dependency arrays or the ?? stopgap", () => {
    expect(count("lang-indexed-lookup", `({ tr: "a", en: "b" })[lang]; label[lang]; item?.[lang]`)).toBe(3);
    expect(count("lang-indexed-lookup", `useMemo(() => x, [lang]); label[lang] ?? label.en`)).toBe(0);
  });

  it("flags binary and hardcoded locale tags", () => {
    expect(count("locale-tag-ternary", `lang === "tr" ? "tr-TR" : "en-US"`)).toBe(1);
    expect(count("locale-tag-literal", `d.toLocaleDateString("tr-TR"); x === 'en-US'`)).toBe(2);
    expect(count("locale-tag-literal", `d.toLocaleDateString(localeTag(lang))`)).toBe(0);
  });

  it("flags every native date and time input type", () => {
    const inputs = `<input type="date" /><input type='datetime-local' /><input type={"time"} /><input type="month" />`;
    expect(count("native-date-input", inputs)).toBe(4);
    expect(count("native-date-input", `<input type="text" /><input type="email" />`)).toBe(0);
  });

  it("flags raw hex colors but not anchors or plain text", () => {
    expect(count("raw-hex-color", `className="bg-[#fafafa] text-[#111]" color="#111827" c={'#fff'}`)).toBe(4);
    expect(count("raw-hex-color", `href="#faq" href="#" label="#1 choice"`)).toBe(0);
  });

  it("flags light-only color utilities, including variants and opacity", () => {
    const classes = `bg-white hover:bg-white/95 text-gray-500 dark:border-slate-200 ring-gray-950`;
    expect(count("light-only-color", classes)).toBe(5);
    expect(count("light-only-color", `bg-surface-50 text-white text-surface-900 border-brand-200`)).toBe(0);
  });
});

describe("catalog validation", () => {
  const tr = catalog(`  greeting: "Merhaba {name}",\n  bye: "Hoşça kal",`);

  it("accepts catalogs with matching keys and placeholders", () => {
    const en = catalog(`  greeting: "Hello {name}",\n  bye: "Goodbye",`);
    expect(checkCatalogs({ tr, en }).problems).toEqual([]);
  });

  it("reports missing keys, extra keys, empty values and placeholder drift", () => {
    const en = catalog(`  greeting: "Hello {user}",\n  extra: "",`);
    const { problems } = checkCatalogs({ tr, en });
    expect(problems.some((p) => p.includes("placeholders {user}"))).toBe(true);
    expect(problems.some((p) => p.includes("extra does not exist"))).toBe(true);
    expect(problems.some((p) => p.includes("extra is empty"))).toBe(true);
    expect(problems.some((p) => p.includes("missing 1 key(s): bye"))).toBe(true);
  });

  it("only warns about incomplete locales that are not advertised", () => {
    const en = catalog(`  greeting: "Hello {name}",\n  bye: "Goodbye",`);
    const de = catalog(`  greeting: "Hallo {name}",`);
    expect(checkCatalogs({ tr, en, de }).problems).toEqual([]);
    expect(checkCatalogs({ tr, en, de }).warnings).toHaveLength(1);
    expect(checkCatalogs({ tr, en, de }, { required: ["tr", "en", "de"] }).problems).toHaveLength(1);
  });

  it("reports lines that break the one-entry-per-line format", () => {
    const broken = catalog(`  greeting: \`Hello {name}\`,`);
    expect(broken.unparsed).toEqual([2]);
  });

  it("reads the advertised locales from routing.ts", () => {
    expect(parseRoutingLocales(`export const locales = ["tr", "en", "de"] as const;`)).toEqual(["tr", "en", "de"]);
  });
});

describe("baseline ratchet", () => {
  const counts = Object.fromEntries(RULES.map((rule) => [rule.id, 5]));

  it("passes at the baseline", () => {
    expect(evaluate(counts, { counts })).toEqual({ failures: [], improvements: [] });
  });

  it("fails when a count rises", () => {
    const { failures } = evaluate({ ...counts, "lang-binary-check": 6 }, { counts });
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain("lang-binary-check: 6 (baseline 5)");
  });

  it("reports drops so they can be locked in", () => {
    const { improvements } = evaluate({ ...counts, "native-date-input": 2 }, { counts });
    expect(improvements).toEqual(["native-date-input: 5 → 2"]);
  });

  it("requires clean paths to have zero matches", () => {
    const perFile = {
      "src/app/[locale]/page.tsx": { "light-only-color": 2 },
      "src/app/admin/page.tsx": { "light-only-color": 9 },
    };
    expect(cleanPathViolations(perFile, ["src/app/[locale]"])).toEqual([
      "src/app/[locale]/page.tsx: 2 × light-only-color in a path that must stay clean",
    ]);
  });
});
