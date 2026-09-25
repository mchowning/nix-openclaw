import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { jsonText, packageLock, tempDir, writeJson } from "./openclaw-runtime-plugin-package-locks.fixtures.mjs";

const script = fileURLToPath(new URL("./openclaw-runtime-plugin-prepare-npm.mjs", import.meta.url));

test("prepares the 2026.9.6 ACPX manifest to match published dependency evidence", (t) => {
  const directory = tempDir(t);
  const root = path.join(directory, "package");
  fs.mkdirSync(root);
  const lock = packageLock();
  lock.version = lock.packages[""].version = "2026.9.6";
  lock.packages[""].dependencies.acpx = "0.19.1";
  lock.packages["node_modules/acpx"].version = "0.19.1";
  const evidence = path.join(directory, "evidence.package-lock.json");
  writeJson(evidence, lock);
  writeJson(path.join(root, "package.json"), {
    name: "@openclaw/acpx", version: "2026.9.6", dependencies: { acpx: "0.19.0" },
  });
  const result = spawnSync(process.execPath, [script], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      OPENCLAW_RUNTIME_PLUGIN_DEPENDENCY_MODE: "package-lock",
      OPENCLAW_RUNTIME_PLUGIN_PACKAGE_LOCK_FILE: evidence,
      OPENCLAW_RUNTIME_PLUGIN_PACKAGE_NAME: "@openclaw/acpx",
      OPENCLAW_RUNTIME_PLUGIN_VERSION: "2026.9.6",
    },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, "package.json"))).dependencies.acpx, "0.19.1");
  assert.equal(fs.readFileSync(evidence, "utf8"), jsonText(lock));
});
