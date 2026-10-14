import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { preparePackage } from "../scripts/prepare.mjs";

test("pins fixes without mutating input or retaining unrelated dev tools", async () => {
  const input = JSON.parse(await readFile(new URL("../upstream-package.fixture.json", import.meta.url)));
  const before = structuredClone(input);
  const result = preparePackage(input);
  assert.deepEqual(input, before);
  assert.equal(result.dependencies.next, "16.3.8");
  assert.equal(result.dependencies.jsdom, input.devDependencies.jsdom);
  assert.equal(result.dependencies.sharp, result.overrides.sharp);
  assert.equal(result.overrides["monaco-editor"].dompurify, "3.4.17");
  assert.equal(result.overrides["proxy-addr"], "2.0.8");
  assert.equal(result.overrides.undici, "8.12.1");
  assert.equal(result.dependencies.undici, result.overrides.undici);
  assert.equal(result.overrides.jsdom.undici, result.overrides.undici);
  assert.equal(result.devDependencies.promptfoo, undefined);
  assert(result.devDependencies["fumadocs-mdx"]);
  assert.throws(() => preparePackage({ ...input, version: "unexpected" }));
});
