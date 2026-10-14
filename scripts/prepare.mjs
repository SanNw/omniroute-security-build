import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export function preparePackage(input) {
  assert.equal(input.name, "omniroute");
  assert.equal(input.version, "3.8.51");
  const pkg = structuredClone(input);
  assert(pkg.devDependencies.jsdom, "Missing upstream docs sanitizer dependency");
  Object.assign(pkg.dependencies, {
    next: "16.3.8", dompurify: "3.4.17", "smol-toml": "1.9.1",
    sharp: "0.35.5", "@modelcontextprotocol/sdk": "1.32.1",
    jsdom: pkg.devDependencies.jsdom,
  });
  Object.assign(pkg.overrides, {
    katex: "0.18.2", "fast-uri": "3.1.8", "fast-copy": "4.2.0",
    "proxy-addr": "2.0.8", "source-map-js": "1.2.2", sharp: "0.35.5",
    undici: "8.12.1",
    "monaco-editor": { dompurify: "3.4.17" },
  });
  const tools = ["@tailwindcss/postcss", "babel-plugin-react-compiler", "fumadocs-mdx",
    "typescript", "esbuild", "cross-env", "@types/react", "@types/react-dom",
    "@types/node", "@types/better-sqlite3", "@types/safe-regex", "@types/ws"];
  pkg.devDependencies = Object.fromEntries(tools.map(name => {
    assert(pkg.devDependencies[name], `Missing upstream build tool: ${name}`);
    return [name, pkg.devDependencies[name]];
  }));
  return pkg;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const path = resolve(process.argv[2], "package.json");
  const pkg = preparePackage(JSON.parse(await readFile(path, "utf8")));
  await writeFile(path, JSON.stringify(pkg, null, 2) + "\n");
  console.log("Pinned security dependencies and retained only required build tools.");
}
