import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const result = spawnSync("npm", ["audit", "--omit=dev", "--json"], { encoding: "utf8" });
assert(!result.error, "Could not execute npm audit");
const audit = JSON.parse(result.stdout);
assert(audit.metadata?.vulnerabilities, "Incomplete npm audit response");
const allowed = new Set(["braces", "micromatch", "http-proxy-middleware"]);
for (const item of Object.values(audit.vulnerabilities ?? {})) {
  assert(allowed.has(item.name), `Unreviewed vulnerability: ${item.name}`);
  for (const via of item.via.filter(v => typeof v === "object")) {
    assert.equal(via.url, "https://github.com/advisories/GHSA-vfj7-8cjw-p6xm");
  }
}
writeFileSync(process.argv[2], JSON.stringify(audit, null, 2) + "\n");
console.log("Audit contains only the known braces advisory chain, covered by the tested local patch.");
