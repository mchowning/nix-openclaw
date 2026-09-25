import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fixture, patch } from "./patch-openclaw-npm-dist.fixtures.mjs";

test("patches 2026.9.6 hardlink policy when realpath comes from package-manifest", (t) => {
  const f = fixture(t, "mjs", { optimizedRealpath: true });
  const oldName = f.dependency;
  const newName = oldName.replace("plugin-cache-files", "package-manifest");
  const oldHelper = `function resolveRealpath(targetPath) {
\tconst absolute = path.resolve(targetPath);
\ttry {
\t\tif (absolute === targetPath && fs.realpathSync.native(targetPath) === targetPath) return targetPath;
\t} catch {}
\treturn fs.realpathSync(targetPath);
}`;
  const newHelper = `function resolveRealpath(targetPath) {
\tif (path.resolve(targetPath) === targetPath && pluginCacheRealpathSync(targetPath, true) === targetPath) return targetPath;
\treturn fs.realpathSync(targetPath);
}`;
  const source = fs.readFileSync(path.join(f.dist, oldName), "utf8");
  assert.ok(source.includes(oldHelper));
  fs.writeFileSync(path.join(f.dist, newName), source.replace(oldHelper, newHelper));
  const policyPath = path.join(f.dist, f.policy);
  fs.writeFileSync(policyPath, fs.readFileSync(policyPath, "utf8").replace(oldName, newName));
  const result = patch(f);
  assert.equal(result.status, 0, result.stderr);
  assert.match(fs.readFileSync(policyPath, "utf8"), /isTrustedNixStorePluginRoot/);
});
