import { describe, expect, it } from "vitest";
import { languageBranchInventory } from "../../scripts/audit-language-branches.mjs";

describe("alias-aware language inventory", () => {
  it("counts a large alias copy object rather than its one comparison", () => {
    const result = languageBranchInventory(`const isTr = lang === "tr";
      const copy = isTr ? { title: "Başlık", save: "Kaydet" } : { title: "Title", save: "Save" };`);
    expect(result.branches).toHaveLength(1);
    expect(result.rawCandidates).toBe(4);
  });
  it("follows chained and negated aliases and ignores translated branches", () => {
    const result = languageBranchInventory(`const isTr = "tr" === locale; const english = !isTr;
      const label = english ? "Title" : "Başlık";
      const migrated = isTr ? t("key") : translate(lang, "other_key");`);
    expect(result.branches).toHaveLength(1);
    expect(result.rawCandidates).toBe(2);
  });
  it("respects local and parameter shadowing", () => {
    const result = languageBranchInventory(`const isTr = lang === "tr";
      function outer() { return isTr ? "Yes" : "Evet"; }
      function other(isTr: boolean) { return isTr ? "technical" : "value"; }
      function local() { const isTr = flag; return isTr ? "one" : "two"; }`);
    expect(result.branches).toHaveLength(1);
    expect(result.rawCandidates).toBe(2);
  });
  it("counts if branches and template copy without double counting nested strings", () => {
    const result = languageBranchInventory('const isTr = language.startsWith("tr"); if (isTr) { const x = isTr ? `Merhaba ${name}` : "Hello"; } else { show("Welcome"); }');
    expect(result.branches).toHaveLength(2);
    expect(result.rawCandidates).toBe(3);
  });
  it("does not guess through cycles, non-language flags or full locale tags", () => {
    const result = languageBranchInventory(`const a = b; const b = a;
      const x = a ? "one" : "two"; const y = dark ? "Light" : "Dark";
      const z = lang === "tr-TR" ? "local" : "other";`);
    expect(result.branches).toHaveLength(0);
  });
});
