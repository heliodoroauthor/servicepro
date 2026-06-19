// Prebuild patcher: route every direct browser call to the Anthropic API
// through the secure server-side proxy (/api/ai-suggest), so the
// ANTHROPIC_API_KEY is never shipped to the client bundle.
// Mirrors the project's existing add-*.mjs prebuild patchers.
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = new URL('../src/ServiceProApp.jsx', import.meta.url);
let src = readFileSync(FILE, 'utf8');
const NEEDLE = 'https://api.anthropic.com/v1/messages';
const before = src.split(NEEDLE).length - 1;
if (before > 0) {
  src = src.split(NEEDLE).join('/api/ai-suggest');
  writeFileSync(FILE, src);
}
console.log(`[route-ai-proxy] rerouted ${before} direct Anthropic call(s) -> /api/ai-suggest`);
