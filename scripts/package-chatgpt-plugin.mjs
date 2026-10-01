// Build a separate public-upload copy without changing the original plugin source.
import { readFile, copyFile, mkdir, mkdtemp, cp, readdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import assert from "node:assert/strict";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "heptacert", "chatgpt-plugin");
const requireFrontend = createRequire(join(root, "heptacert", "frontend", "package.json"));
const sharp = requireFrontend("sharp");
const manifest = JSON.parse(await readFile(join(source, "plugin.json"), "utf8"));
const mcp = JSON.parse(await readFile(join(source, "mcp.json"), "utf8"));
const openai = manifest.extensions["com.openai"];
const listing = openai.interface;
assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
assert.equal(manifest.apps ?? openai.apps ?? null, null);
assert(listing.displayName.length <= 30);
assert(listing.shortDescription.length <= 30);
assert(listing.longDescription.length <= 4000);
assert(listing.defaultPrompt.length <= 3);
assert.equal(new Set(listing.defaultPrompt.map(value => value.trim().replace(/\s+/g, " "))).size,
             listing.defaultPrompt.length);
for (const prompt of listing.defaultPrompt) {
  assert(prompt.trim() && prompt.length <= 128 && !/[\r\n]/.test(prompt));
}
for (const field of ["websiteURL", "supportURL", "privacyPolicyURL", "termsOfServiceURL"]) {
  const url = new URL(listing[field]);
  assert.equal(url.protocol, "https:");
  assert(!url.username && !url.password);
}
assert.equal(Object.keys(mcp.mcpServers).length, 1);
assert.equal(mcp.mcpServers.heptacert.type, "streamable-http");
assert.equal(mcp.mcpServers.heptacert.url, "https://heptacert.com/mcp");
assert.equal(openai.review.test_cases.positive.length, 5);
assert.equal(openai.review.test_cases.negative.length, 3);
for (const test of openai.review.test_cases.positive) {
  for (const key of ["description", "prompt", "tools_triggered", "expected_behavior"]) {
    assert.equal(typeof test[key], "string");
    assert(test[key].trim());
  }
}

// Rasterize the existing brand SVG at a portal-compatible size. The original
// 6250px logo stays in the source but is not included in the public-upload copy.
await sharp(join(root, "heptacert", "frontend", "public", "favicon.svg"))
  .resize(512, 512).png().toFile(join(source, "assets", "icon.png"));
const icon = await sharp(join(source, "assets", "icon.png")).metadata();
assert.equal(icon.format, "png");
assert.equal(icon.width, 512);
assert.equal(icon.height, 512);

const staging = await mkdtemp(join(tmpdir(), "heptacert-plugin-"));
const upload = join(staging, manifest.name);
await mkdir(join(upload, "assets"), { recursive: true });
for (const file of ["plugin.json", "mcp.json", "assets/icon.png"]) {
  await copyFile(join(source, file), join(upload, file));
}
const skills = await readdir(join(source, "skills"));
assert.equal(skills.length, 8, "Preserve all eight skills from the owned plugin");
await cp(join(source, "skills"), join(upload, "skills"), { recursive: true });
for (const skill of skills) {
  assert((await readFile(join(upload, "skills", skill, "SKILL.md"), "utf8")).startsWith("---"));
}
const archive = join(staging, `${manifest.name}-${manifest.version}-draft.zip`);
const quotePowerShell = value => "'" + value.replaceAll("'", "''") + "'";
const zipOutput = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command",
  `Compress-Archive -LiteralPath ${quotePowerShell(upload)} -DestinationPath ${quotePowerShell(archive)};
  Add-Type -AssemblyName System.IO.Compression.FileSystem;
  $draftZip = [IO.Compression.ZipFile]::OpenRead(${quotePowerShell(archive)});
  try {
    $entryNames = @($draftZip.Entries | ForEach-Object { $_.FullName });
    $manifestEntry = $draftZip.Entries | Where-Object { $_.FullName -match '[/\\\\]plugin.json$' };
    $draftReader = [IO.StreamReader]::new($manifestEntry.Open());
    try { $savedManifest = $draftReader.ReadToEnd() | ConvertFrom-Json } finally { $draftReader.Dispose() }
    [PSCustomObject]@{entries=$entryNames;version=$savedManifest.version;
      positive=$savedManifest.extensions.'com.openai'.review.test_cases.positive.Count;
      negative=$savedManifest.extensions.'com.openai'.review.test_cases.negative.Count} | ConvertTo-Json -Compress
  } finally { $draftZip.Dispose() }`
], { encoding: "utf8" });
const inspected = JSON.parse(zipOutput.trim());
inspected.entries = inspected.entries.map(name => name.replaceAll("\\", "/"));
assert.equal(inspected.version, manifest.version);
assert.equal(inspected.positive, 5);
assert.equal(inspected.negative, 3);
assert.equal(inspected.entries.filter(name => /[/\\]SKILL\.md$/.test(name)).length, 8);
assert(inspected.entries.some(name => name.endsWith("agents/openai.yaml")));
assert(inspected.entries.some(name => name.endsWith("lookup/knowledge-index.json")));
assert(inspected.entries.every(name => !name.includes(".app.json")));
console.log(JSON.stringify({ archive, inspected, skills, readiness: "draft",
  missing: ["verified publisher identity", "portal verification of country targeting",
            "verified demo recording URL", "host review-case execution",
            "reviewer access and policy review"] }, null, 2));
