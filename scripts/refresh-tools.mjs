#!/usr/bin/env node
/**
 * Rewrite the tool reference in README.md from the LIVE server.
 *
 * Why a script and not a hand-maintained table: a copied list is a second definition, and the
 * second one is always the one that goes stale. This repo advertises a server it does not contain,
 * so the only honest source for what the server offers is the server.
 *
 *   node scripts/refresh-tools.mjs            # against production
 *   node scripts/refresh-tools.mjs http://localhost:3000/api/mcp
 *
 * It replaces whatever sits between the two markers in README.md and leaves the rest alone.
 */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ENDPOINT = process.argv[2] ?? "https://cromanion.com/api/mcp";
const START = "<!-- tools:start -->";
const END = "<!-- tools:end -->";

const README = join(dirname(fileURLToPath(import.meta.url)), "..", "README.md");

const response = await fetch(ENDPOINT, {
  method: "POST",
  headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
});
if (!response.ok) throw new Error(`${ENDPOINT} answered ${response.status}`);

const { result, error } = await response.json();
if (error) throw new Error(`${ENDPOINT} refused: ${error.message}`);

const tools = result.tools ?? [];
if (!tools.length) throw new Error("the server returned no tools — refusing to write an empty table");

/** What a host needs at a glance: does it write, and can it be repeated safely. */
const effect = (a = {}) => {
  if (a.readOnlyHint) return "read";
  if (a.destructiveHint) return "**replaces**";
  return "writes";
};

const rows = tools.map((tool) => {
  const a = tool.annotations ?? {};
  // The first sentence only. The full description is in the server's own `tools/list`, and a table
  // that reproduces all of it stops being a table.
  // `|` would end the cell; `<` would be parsed as HTML — several descriptions mention `<meta>` and
  // `</body>`, which GitHub silently swallows rather than rendering.
  const summary = (tool.description ?? "")
    .split(". ")[0]
    .replace(/\|/g, "\\|")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `| \`${tool.name}\` | ${effect(a)} | ${a.idempotentHint ? "yes" : "no"} | ${summary}. |`;
});

const table = [
  `_${tools.length} tools, read from ${ENDPOINT} on ${new Date().toISOString().slice(0, 10)}._`,
  "",
  "| Tool | Effect | Repeatable | What it does |",
  "| --- | --- | --- | --- |",
  ...rows,
].join("\n");

const readme = await readFile(README, "utf8");
const before = readme.indexOf(START);
const after = readme.indexOf(END);
if (before === -1 || after === -1) throw new Error("README.md is missing the tools:start / tools:end markers");

await writeFile(README, `${readme.slice(0, before + START.length)}\n\n${table}\n\n${readme.slice(after)}`);
console.log(`wrote ${tools.length} tools into README.md`);
