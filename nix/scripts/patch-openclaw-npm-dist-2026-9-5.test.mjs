import assert from "node:assert/strict";
import test from "node:test";
import { change, fixture, patch } from "./patch-openclaw-npm-dist.fixtures.mjs";

test("accepts the 2026.9.5 canonical-realpath cache contract", (t) => {
  const f = fixture(t, "mjs");
  change(
    f,
    f.dependency,
    "function pluginCacheRealpathSync(targetPath, native = false) {",
    `function resolveRealpath(targetPath) {
\tconst absolute = path.resolve(targetPath);
\ttry {
\t\tif (absolute === targetPath && fs.realpathSync.native(targetPath) === targetPath) return targetPath;
\t} catch {}
\treturn fs.realpathSync(targetPath);
}
function pluginCacheRealpathSync(targetPath, native = false) {`,
  );
  change(
    f,
    f.dependency,
    'facts[key] = native ? fs.realpathSync.native(targetPath) : fs.realpathSync(targetPath);',
    'facts[key] = native ? fs.realpathSync.native(targetPath) : resolveRealpath(targetPath);',
  );

  const result = patch(f);
  assert.equal(result.status, 0, result.stderr);
});
