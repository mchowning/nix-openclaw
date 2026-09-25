#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function fail(message) {
  console.error(message);
  process.exit(1);
}
function unique(values, label) {
  if (values.length !== 1) fail(`expected exactly one ${label}, found ${values.length}`);
  return values[0];
}
function requireContract(condition, label) {
  if (!condition) fail(`OpenClaw ${label} contract is unsupported or already patched`);
}
function declaration(source, name) {
  return unique(
    [...source.matchAll(new RegExp(`^(?:async )?function ${name}\\([^\\n]*\\) \\{\\n[\\s\\S]*?^\\}`, "gm"))],
    name,
  )[0];
}

const root = process.env.OPENCLAW_PACKAGE_ROOT;
if (!root) fail("OPENCLAW_PACKAGE_ROOT is required");
const distDir = path.join(root, "dist");
if (!fs.existsSync(distDir)) fail(`OpenClaw dist directory missing: ${distDir}`);
// The sealed worker is another build graph. Only regular root modules own these transforms.
const modules = new Map(
  fs
    .readdirSync(distDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.m?js$/.test(entry.name))
    .map((entry) => [entry.name, fs.readFileSync(path.join(distDir, entry.name), "utf8")]),
);
const owner = (marker, label) =>
  unique(
    [...modules].filter(([, source]) => source.includes(marker)),
    label,
  );
const [policyName, policy] = owner("function shouldRejectHardlinkedPluginFiles", "bundled hardlink policy chunk");
const old = policyName.endsWith(".js");
const ext = old ? "js" : "mjs";
const cacheArg = old ? ", realpathCache" : "";
const paramsCache = old ? ", params.realpathCache" : "";
const realpath = old ? "safeRealpathSync" : "pluginCacheRealpathSync";

function importedOwner(source, local, prefix) {
  const match = unique(
    [
      ...source.matchAll(
        new RegExp(`^import \\{ (\\w+) as ${local} \\} from "\\./(${prefix}-[\\w-]+\\.${ext})";$`, "gm"),
      ),
    ],
    `${local} import`,
  );
  const dependency = modules.get(match[2]);
  requireContract(dependency !== undefined, `${local} regular root dependency`);
  const exports = unique([...dependency.matchAll(/^export \{ ([^\n]+) \};$/gm)], `${local} exports`)[1].split(", ");
  requireContract(exports.includes(`${local} as ${match[1]}`), `${local} export binding`);
  return dependency;
}
const envSource = importedOwner(policy, "resolveIsNixMode", "paths");
requireContract(
  declaration(envSource, "resolveIsNixMode") ===
    `function resolveIsNixMode(env = process.env) {
\treturn env.OPENCLAW_NIX_MODE === "1";
}`,
  "Nix environment resolver",
);
const realpathSource = importedOwner(policy, realpath, old ? "path" : "(?:plugin-cache-files|package-manifest)");
const optimizedRealpath = !old && realpathSource.includes("function resolveRealpath(");
if (optimizedRealpath) {
  requireContract(
    [
      `function resolveRealpath(targetPath) {
\tconst absolute = path.resolve(targetPath);
\ttry {
\t\tif (absolute === targetPath && fs.realpathSync.native(targetPath) === targetPath) return targetPath;
\t} catch {}
\treturn fs.realpathSync(targetPath);
}`,
      `function resolveRealpath(targetPath) {
\tif (path.resolve(targetPath) === targetPath && pluginCacheRealpathSync(targetPath, true) === targetPath) return targetPath;
\treturn fs.realpathSync(targetPath);
}`,
    ].includes(declaration(realpathSource, "resolveRealpath")),
    "canonical realpath helper",
  );
}
const realpathDeclaration = declaration(realpathSource, realpath);
const directRealpathDeclaration = old
  ? `function safeRealpathSync(targetPath, cache) {
\tconst cached = cache?.get(targetPath);
\tif (cached) return cached;
\ttry {
\t\tconst resolved = fs.realpathSync(targetPath);
\t\tcache?.set(targetPath, resolved);
\t\tcache?.set(resolved, resolved);
\t\treturn resolved;
\t} catch {
\t\treturn null;
\t}
}`
  : `function pluginCacheRealpathSync(targetPath, native = false) {
\tconst facts = pathFacts(targetPath);
\tconst key = native ? "nativeRealpath" : "realpath";
\tif (facts[key] === void 0) try {
\t\tfacts[key] = native ? fs.realpathSync.native(targetPath) : ${optimizedRealpath ? "resolveRealpath" : "fs.realpathSync"}(targetPath);
\t\tpathFacts(facts[key])[key] = facts[key];
\t} catch {
\t\tfacts[key] = null;
\t}
\treturn facts[key];
}`;
requireContract(realpathDeclaration === directRealpathDeclaration, "realpath/cache");
// Match complete decisions, retaining newlines (including JavaScript return/ASI semantics).
const policyBody = policy
  .replace(
    /^import \{ \w+ as (?:resolveIsNixMode|safeRealpathSync|pluginCacheRealpathSync) \} from "\.\/[\w-]+\.m?js";\n/gm,
    "",
  )
  .replace(/^import "\.\/path-safety-[\w-]+\.js";\n/gm, "")
  .replace(/^import path from "node:path";\n/gm, "")
  .replace(/^\/\/#(?:end)?region[^\n]*\n/gm, "")
  .replace(/^\/\*\* [^\n]* \*\/\n/gm, "")
  .trim();
requireContract((policy.match(/^import path from "node:path";$/gm) ?? []).length === 1, "policy path import");
requireContract(
  policyBody ===
    `const NIX_STORE_ROOT = "/nix/store";
function isNixStorePluginRoot(rootDir${cacheArg}) {
\tconst rootRealPath = ${realpath}(rootDir${cacheArg}) ?? path.resolve(rootDir);
\treturn rootRealPath === NIX_STORE_ROOT || rootRealPath.startsWith(\`\${NIX_STORE_ROOT}/\`);
}
function shouldRejectHardlinkedPluginFiles(params) {
\tif (params.origin === "bundled") return false;
\tif (resolveIsNixMode(params.env) && isNixStorePluginRoot(params.rootDir${paramsCache})) return false;
\treturn true;
}
export { shouldRejectHardlinkedPluginFiles as t };`,
  "hardlink policy decisions",
);

const ownershipCheck =
  'params.origin !== "bundled" && params.uid !== null && typeof stat.uid === "number" && stat.uid !== params.uid && stat.uid !== 0';
const [ownershipName, ownership] = owner(ownershipCheck, "bundled ownership policy chunk");
const importLine = `import { t as shouldRejectHardlinkedPluginFiles } from "./${policyName}";`;
requireContract(
  ownershipName.endsWith(`.${ext}`) && ownership.split("\n").filter((line) => line === importLine).length === 1,
  "ownership policy import",
);
requireContract(
  ownership.split(ownershipCheck).length === 2 && !ownership.includes("isTrustedNixStorePluginRoot"),
  "ownership condition",
);
const patchedOwnership = ownership.replace(
  ownershipCheck,
  ownershipCheck.replace(
    "params.uid !== null && ",
    "params.uid !== null && shouldRejectHardlinkedPluginFiles(params) && ",
  ),
);

let patchedPolicy = policy;
let packageEntryTransform;
if (!old) {
  const [packageEntryName, packageEntry] = owner(
    "async function validatePackageExtensionEntry",
    "package entry validation chunk",
  );
  requireContract(
    packageEntryName.endsWith(`.${ext}`) && !packageEntry.includes("isTrustedNixStorePluginRoot"),
    "package entry Nix hardlink policy",
  );
  const openCall = `const opened = await openRootFile({
\t\tabsolutePath,
\t\trootPath: params.packageDir,
\t\tboundaryLabel: "plugin package directory"
\t});`;
  const validator = declaration(packageEntry, "validatePackageExtensionEntry");
  requireContract(validator.split(openCall).length === 2, "package entry root open");
  const trustedRootHelper = `function isTrustedNixStorePluginRoot(params) {
\treturn resolveIsNixMode(params.env) && isNixStorePluginRoot(params.rootDir);
}
`;
  patchedPolicy = policy
    .replace(
      "resolveIsNixMode(params.env) && isNixStorePluginRoot(params.rootDir)",
      "isTrustedNixStorePluginRoot(params)",
    )
    .replace(
      "function shouldRejectHardlinkedPluginFiles(params) {",
      `${trustedRootHelper}function shouldRejectHardlinkedPluginFiles(params) {`,
    )
    .replace(
      "export { shouldRejectHardlinkedPluginFiles as t };",
      "export { isTrustedNixStorePluginRoot as i, shouldRejectHardlinkedPluginFiles as t };",
    );
  requireContract(patchedPolicy !== policy, "Nix hardlink helper transform");
  const patchedPackageEntry =
    `import { i as isTrustedNixStorePluginRoot } from "./${policyName}";\n` +
    packageEntry.replace(
      openCall,
      openCall.replace(
        '\n\t});',
        ',\n\t\trejectHardlinks: !isTrustedNixStorePluginRoot({ rootDir: params.packageDir, env: process.env })\n\t});',
      ),
    );
  packageEntryTransform = [packageEntryName, patchedPackageEntry];
}

const loop = "for (const candidate of collectDownloadableInstallCandidates({";
const [installName, install] = owner(
  'Failed to install missing configured plugin "',
  "missing configured plugin install chunk",
);
requireContract(ownershipName !== installName, "distinct transform owners");
const functions = old
  ? ["collectUpdateDeferredPluginIds", "detectConfiguredPluginInstallHealthIssues", "repairMissingPluginInstalls"]
  : ["detectConfiguredPluginInstallHealthIssues", "repairMissingPluginInstallsWithLease"];
requireContract(
  installName.endsWith(`.${ext}`) && install.split(loop).length === functions.length + 1,
  "missing-install loop count",
);
for (const name of functions) {
  const body = declaration(install, name);
  requireContract(body.split(loop).length === 2 && body.includes(`\n\t${loop}`), `${name} candidate loop`);
}
// Preserve the existing health/deferred suppression and recorded-update limitations.
// This adapter does not add an all-effects install gate or propagate caller env.
const patchedInstall = install.replaceAll(loop, `if ((params.env ?? process.env).OPENCLAW_NIX_MODE !== "1") ${loop}`);

// No contract failure may leave the earlier ownership transform partially written.
const transforms = [
  [ownershipName, patchedOwnership],
  [installName, patchedInstall],
];
if (packageEntryTransform) {
  transforms.push([policyName, patchedPolicy], packageEntryTransform);
}
for (const [name, source] of transforms) {
  fs.writeFileSync(path.join(distDir, name), source);
}
