/** Supplement the direct-comparison ratchet with alias-aware syntax candidates.
 * Not a coverage certificate: technical strings and reviewed legal copy need triage;
 * unconditional literals, runtime assignments and imported aliases are not detected.
 */
import ts from "typescript";

const LANGUAGE_NAMES = new Set(["lang", "locale", "language"]);
const COMPARISONS = new Set([
  ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken,
]);
const isScope = (node) => ts.isSourceFile(node) || ts.isBlock(node) || ts.isFunctionLike(node);

export function languageBranchInventory(text, fileName = "source.tsx") {
  const source = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true);
  const bindings = new Map();
  function scopeOf(node) {
    for (let current = node.parent; current; current = current.parent) {
      if (isScope(current)) return current;
    }
    return source;
  }
  function bind(scope, name, initializer) {
    const names = bindings.get(scope) ?? new Map();
    // Multiple declarations/assignments are intentionally not inferred.
    names.set(name, names.has(name) ? null : initializer);
    bindings.set(scope, names);
  }
  function collect(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      bind(scopeOf(node), node.name.text, node.initializer ?? null);
    }
    if (ts.isParameter(node) && ts.isIdentifier(node.name)) {
      bind(scopeOf(node), node.name.text, null);
    }
    ts.forEachChild(node, collect);
  }
  collect(source);
  function resolve(identifier) {
    for (let current = identifier.parent; current; current = current.parent) {
      const names = bindings.get(current);
      if (names?.has(identifier.text)) return names.get(identifier.text);
    }
    return null;
  }
  function isLanguage(node) {
    return ts.isIdentifier(node) && LANGUAGE_NAMES.has(node.text);
  }
  function isLocale(node) {
    return ts.isStringLiteral(node) && ["tr", "en"].includes(node.text);
  }
  function languageCondition(node, visited = new Set()) {
    if (ts.isParenthesizedExpression(node)) return languageCondition(node.expression, visited);
    if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.ExclamationToken) {
      return languageCondition(node.operand, visited);
    }
    if (ts.isIdentifier(node)) {
      const initializer = resolve(node);
      if (!initializer || visited.has(initializer)) return false;
      return languageCondition(initializer, new Set([...visited, initializer]));
    }
    if (ts.isBinaryExpression(node)) {
      if (COMPARISONS.has(node.operatorToken.kind)) {
        return (isLanguage(node.left) && isLocale(node.right)) ||
          (isLanguage(node.right) && isLocale(node.left));
      }
      if ([ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken].includes(node.operatorToken.kind)) {
        return languageCondition(node.left, visited) || languageCondition(node.right, visited);
      }
    }
    return ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "startsWith" && isLanguage(node.expression.expression) &&
      node.arguments.length === 1 && isLocale(node.arguments[0]);
  }
  function rawStrings(root) {
    const strings = new Set();
    function visit(node) {
      // Translation keys/interpolation arguments are not raw branch copy.
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) &&
          ["t", "translate"].includes(node.expression.text)) return;
      if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) ||
          ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) &&
          node.text.trim() && /\p{L}/u.test(node.text)) strings.add(node.getStart(source));
      ts.forEachChild(node, visit);
    }
    if (root) visit(root);
    return strings;
  }
  const branches = [];
  const candidates = new Set();
  function visit(node) {
    const condition = ts.isConditionalExpression(node) ? node.condition :
      ts.isIfStatement(node) ? node.expression : null;
    if (condition && languageCondition(condition)) {
      const roots = ts.isConditionalExpression(node) ? [node.whenTrue, node.whenFalse] :
        [node.thenStatement, node.elseStatement];
      const strings = new Set(roots.flatMap((root) => [...rawStrings(root)]));
      if (strings.size) {
        strings.forEach((position) => candidates.add(position));
        branches.push({
          line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
          condition: condition.getText(source),
          rawCandidates: strings.size,
        });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return { branches, rawCandidates: candidates.size };
}

export async function reportLanguageBranches(files, frontendRoot) {
  const { readFile } = await import("node:fs/promises");
  const path = await import("node:path");
  const rows = [];
  for (const file of files) {
    const inventory = languageBranchInventory(await readFile(file, "utf8"), file);
    if (inventory.branches.length) rows.push({
      file: path.relative(frontendRoot, file).split(path.sep).join("/"), ...inventory,
    });
  }
  rows.sort((a, b) => b.rawCandidates - a.rawCandidates);
  console.log("\nAlias-aware syntax inventory (not a coverage certificate):");
  console.log(" raw candidates | branches | file (first branch line)");
  for (const row of rows) {
    console.log(`${String(row.rawCandidates).padStart(15)} | ${String(row.branches.length).padStart(8)} | ${row.file}:${row.branches[0].line}`);
  }
  const admin = rows.filter((row) => /^src\/(app\/admin\/|components\/Admin\/|lib\/assistant\/)/.test(row.file));
  console.log(`Admin: ${admin.length} files, ${admin.reduce((n, row) => n + row.branches.length, 0)} branches, ${admin.reduce((n, row) => n + row.rawCandidates, 0)} raw string candidates.`);
  console.log("Technical values/legal holds require triage; unconditional literals and imported/mutated aliases require manual review.");
}
