import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const source = resolve(process.argv[2]);
const destination = resolve(process.argv[3]);
await mkdir(destination);
await cp(source, join(destination, "server"), { recursive: true, dereference: true });
const files = [];
async function scan(directory, prefix = "server") {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    const name = `${prefix}/${entry.name}`;
    assert(!entry.isSymbolicLink(), `Unexpected artifact symlink: ${name}`);
    assert(!/^\.env(?:\.|$)/.test(entry.name) || entry.name === ".env.example", `Environment file: ${name}`);
    assert(!/^(?:storage|opencode)\.(?:sqlite|db)(?:-wal|-shm)?$/.test(entry.name), `Runtime database: ${name}`);
    if (entry.isDirectory()) await scan(path, name);
    else {
      assert(entry.isFile(), `Nonregular artifact file: ${name}`);
      const bytes = await readFile(path);
      files.push({ path: name, sha256: createHash("sha256").update(bytes).digest("hex") });
    }
  }
}
await scan(join(destination, "server"));
assert(files.some(f => f.path === "server/server.js"), "Missing compiled server");
const next = JSON.parse(await readFile(join(destination, "server/node_modules/next/package.json"), "utf8"));
assert.equal(next.version, "16.3.8", "Packaged Next version differs from the patched runtime");
await writeFile(join(destination, "MANIFEST.json"), JSON.stringify({
  upstream: "c1e30b7676975feb298b49eff6ff58923c04b89e", node: process.version,
  build_commit: process.env.GITHUB_SHA ?? null, braces_local_patch: true,
  authenticated_inference_verified: false, files,
}, null, 2) + "\n");
console.log(`Packaged ${files.length} runtime files without private data.`);
