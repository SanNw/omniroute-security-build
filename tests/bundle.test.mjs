import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

test("bundle records hashes and rejects private environment files", async () => {
  const root = await mkdtemp(join(tmpdir(), "omniroute-recipe-test-"));
  const source = join(root, "source");
  try {
    await mkdir(join(source, "node_modules/next"), { recursive: true });
    await writeFile(join(source, "server.js"), "// fixture\n");
    await writeFile(join(source, "node_modules/next/package.json"), JSON.stringify({ version: "16.3.8" }));
    const script = resolve("scripts/bundle.mjs");
    const output = join(root, "output");
    const ok = spawnSync(process.execPath, [script, source, output], { encoding: "utf8" });
    assert.equal(ok.status, 0, ok.stderr);
    const manifest = JSON.parse(await readFile(join(output, "MANIFEST.json"), "utf8"));
    assert.equal(manifest.authenticated_inference_verified, false);
    assert.equal(manifest.files.find(f => f.path === "server/server.js").sha256,
      createHash("sha256").update("// fixture\n").digest("hex"));
    await writeFile(join(source, ".env"), "TEST_SECRET=fixture\n");
    const bad = spawnSync(process.execPath, [script, source, join(root, "rejected")], { encoding: "utf8" });
    assert.notEqual(bad.status, 0);
    assert.match(bad.stderr, /Environment file/);
    assert(!bad.stderr.includes("TEST_SECRET=fixture"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
