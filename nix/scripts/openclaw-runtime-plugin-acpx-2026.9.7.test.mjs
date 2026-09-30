import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { tempDir, writeJson } from "./openclaw-runtime-plugin-package-locks.fixtures.mjs";

const script = fileURLToPath(new URL("./openclaw-runtime-plugin-prepare-npm.mjs", import.meta.url));
const publishedDependencies = {
  "@agentclientprotocol/claude-agent-acp": "0.76.0",
  "@agentclientprotocol/codex-acp": "1.11.0",
  acpx: "0.19.1", "smol-toml": "1.8.0", zod: "4.6.5",
};
const evidenceDependencies = {
  ...publishedDependencies,
  "@agentclientprotocol/claude-agent-acp": "0.79.0",
  "@agentclientprotocol/codex-acp": "1.12.0",
  "@openclaw/fs-safe": "0.21.1",
};

function prepare(t, { version = "2026.9.7", dependencies = publishedDependencies, lockedDependencies = evidenceDependencies } = {}) {
  const directory = tempDir(t);
  const root = path.join(directory, "package");
  fs.mkdirSync(root);
  const manifest = { name: "@openclaw/acpx", version, dependencies };
  const lock = {
    name: manifest.name, version, lockfileVersion: 3,
    packages: {
      "": { ...manifest, dependencies: lockedDependencies },
      ...Object.fromEntries(Object.entries(lockedDependencies).map(([name, lockedVersion]) => [
        `node_modules/${name}`, { version: lockedVersion },
      ])),
    },
  };
  const evidence = path.join(directory, "evidence.package-lock.json");
  writeJson(evidence, lock);
  const originalEvidence = fs.readFileSync(evidence, "utf8");
  writeJson(path.join(root, "package.json"), manifest);
  const result = spawnSync(process.execPath, [script], {
    cwd: root, encoding: "utf8",
    env: {
      ...process.env,
      OPENCLAW_RUNTIME_PLUGIN_DEPENDENCY_MODE: "package-lock",
      OPENCLAW_RUNTIME_PLUGIN_PACKAGE_LOCK_FILE: evidence,
      OPENCLAW_RUNTIME_PLUGIN_PACKAGE_NAME: manifest.name,
      OPENCLAW_RUNTIME_PLUGIN_VERSION: version,
    },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.readFileSync(evidence, "utf8"), originalEvidence);
  return JSON.parse(fs.readFileSync(path.join(root, "package.json"))).dependencies;
}

test("prepares the 2026.9.7 ACPX manifest against unchanged release evidence", (t) => {
  assert.deepEqual(prepare(t), evidenceDependencies);
});

for (const [label, options] of [
  ["another release", { version: "2026.9.8" }],
  ["unexpected published version", { dependencies: { ...publishedDependencies, acpx: "0.20.0" } }],
  ["unexpected evidence version", { lockedDependencies: { ...evidenceDependencies, "@agentclientprotocol/claude-agent-acp": "0.80.0" } }],
  ["additional published dependency", { dependencies: { ...publishedDependencies, extra: "1.0.0" } }],
]) {
  test(`leaves ACPX manifest unchanged for ${label}`, (t) => {
    assert.deepEqual(prepare(t, options), options.dependencies ?? publishedDependencies);
  });
}
