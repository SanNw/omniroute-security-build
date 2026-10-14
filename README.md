# OmniRoute Security Build

Independent remote build recipe for OmniRoute 3.8.51. Not an official upstream release.
Only public source, dependency patches and tests belong in this repository.
No API keys, provider accounts, Codex configuration or runtime databases are needed.

GitHub Actions checks out the pinned upstream commit, fixes dependency versions,
applies a tested local braces recursion bound, and builds on Ubuntu 22.04 with Node 24.
The output is a self-contained server archive with SHA-256 integrity manifest.
Installing that archive does not require npm install or a local compilation.

The braces package has no published patched version. Its version remains 3.0.3,
and npm audit still reports that advisory and its two dependent packages. This
recipe does not suppress those warnings or claim a clean audit. Patterns nested
beyond the local limit are rejected. Dependency reinstall discards the local patch.

Remote smoke tests cover startup, health, dashboard assets and API authentication.
No provider credentials are configured in CI; authenticated inference must be
verified locally before replacing an existing service. Preserve original data and
keep the old runtime available for rollback. Do not replace data with test snapshots.

The archive targets Linux x64 / WSL with Node 24.21.0. Start the compiled server
with a private DATA_DIR, loopback HOSTNAME, REQUIRE_API_KEY=true and the existing
private environment file. Never upload that environment file to GitHub.

Recipe license: MIT. Upstream and bundled third-party licenses remain applicable.
