import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fixture, patch } from "./patch-openclaw-npm-dist.fixtures.mjs";

test("patches regular modules without modifying the sealed package recovery worker", (t) => {
  const f = fixture(t, "mjs");
  const worker = path.join(f.dist, "package-update-activation-recovery.mjs");
  const bytes = [f.policy, f.discovery, f.packageEntry, f.install]
    .map((name) => fs.readFileSync(path.join(f.dist, name), "utf8")).join("\n");
  fs.writeFileSync(worker, bytes);
  const result = patch(f);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.readFileSync(worker, "utf8"), bytes);
  assert.match(fs.readFileSync(path.join(f.dist, f.policy), "utf8"), /isTrustedNixStorePluginRoot/);
});

test("still rejects an unrecognized duplicate policy owner", (t) => {
  const f = fixture(t, "mjs");
  fs.copyFileSync(path.join(f.dist, f.policy), path.join(f.dist, "another-worker.mjs"));
  const result = patch(f);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /expected exactly one bundled hardlink policy chunk, found 2/);
});
