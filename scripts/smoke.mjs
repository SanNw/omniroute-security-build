import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";

const root = resolve(process.argv[2]);
const data = await mkdtemp(join(tmpdir(), "omniroute-remote-smoke-"));
const server = spawn(process.execPath, ["server.js"], {
  cwd: root, stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env, NODE_OPTIONS: "--max-old-space-size=768", PORT: "20130",
    HOSTNAME: "127.0.0.1", DATA_DIR: data, REQUIRE_API_KEY: "true",
    NEXT_TELEMETRY_DISABLED: "1", DISABLE_SQLITE_AUTO_BACKUP: "true" },
});
let logs = "";
for (const stream of [server.stdout, server.stderr]) stream.on("data", chunk => {
  logs = (logs + chunk).slice(-200000);
});
const ended = new Promise(resolve => server.once("exit", resolve));
try {
  let health;
  for (let i = 0; i < 90; i++) {
    assert(server.exitCode === null, "Candidate server exited early");
    try {
      health = await fetch("http://127.0.0.1:20130/api/monitoring/health", { signal: AbortSignal.timeout(5000) });
      if (health.ok) break;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  assert(health?.ok, "Candidate health failed");
  const page = await fetch("http://127.0.0.1:20130/", { signal: AbortSignal.timeout(15000) });
  assert.equal(page.status, 200);
  const html = await page.text();
  const asset = html.match(/(?:src|href)="([^" ]*\/_next\/static\/[^" ]+)"/);
  assert(asset, "No compiled dashboard asset found");
  const assetURL = new URL(asset[1].replaceAll("&amp;", "&"), page.url);
  assert.equal(assetURL.origin, new URL(page.url).origin);
  const media = await fetch(assetURL, { signal: AbortSignal.timeout(15000) });
  assert.equal(media.status, 200);
  const unauthorized = await fetch("http://127.0.0.1:20130/v1/chat/completions", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: "auto/fast", messages: [{ role: "user", content: "OK" }], max_tokens: 4 }),
    signal: AbortSignal.timeout(15000),
  });
  assert.equal(unauthorized.status, 401, "API authentication is not enforced");
  console.log("Remote smoke passed: health, dashboard, static asset, unauthenticated API 401.");
} finally {
  server.kill("SIGTERM");
  const timer = setTimeout(() => server.kill("SIGKILL"), 10000);
  await ended;
  clearTimeout(timer);
  await writeFile(join(data, "server.log"), logs);
}
