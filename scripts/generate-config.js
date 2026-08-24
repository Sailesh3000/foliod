#!/usr/bin/env node
/**
 * Deterministic generator: data/portfolio.json -> config.js
 *
 * data/portfolio.json is the single source of truth. This script reshapes it
 * into the plain-JS literal (`const CONFIG = {...}`) that index.html loads.
 * Never hand-edit generated sections in config.js — edit the JSON and rerun:
 *
 *   node scripts/generate-config.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DATA_FILE = path.join(ROOT, "data", "portfolio.json");
const OUT_FILE = path.join(ROOT, "config.js");

// Canonical section order (research sits between projects and writing).
// Any extra keys found in the JSON are appended after these, so nothing is lost.
const SECTION_ORDER = [
  "meta",
  "hero",
  "experience",
  "projects",
  "research",
  "writing",
  "footer",
];

function orderSections(data) {
  const ordered = {};
  const missing = SECTION_ORDER.filter((k) => !(k in data));
  if (missing.length) {
    throw new Error(`data/portfolio.json is missing required section(s): ${missing.join(", ")}`);
  }
  for (const key of SECTION_ORDER) ordered[key] = data[key];
  for (const key of Object.keys(data)) {
    if (!(key in ordered)) ordered[key] = data[key];
  }
  return ordered;
}

function generateConfig({ dataFile = DATA_FILE, outFile = OUT_FILE } = {}) {
  const raw = fs.readFileSync(dataFile, "utf8");
  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Could not parse ${dataFile}: ${err.message}`);
  }

  const ordered = orderSections(data);

  const banner =
    "// GENERATED FILE — do not hand-edit.\n" +
    "// Source of truth: data/portfolio.json — edit that, then run: node scripts/generate-config.js\n" +
    "// Last generated: placeholder\n";

  // Timestamp would break determinism (noisy git diffs); keep output byte-stable.
  const body = `const CONFIG = ${JSON.stringify(ordered, null, 2)};\n`;

  const contents =
    banner.replace("// Last generated: placeholder\n", "") +
    body +
    "\nif (typeof module !== \"undefined\") module.exports = CONFIG;\n";

  fs.writeFileSync(outFile, contents, "utf8");
  return { sections: Object.keys(ordered), outFile };
}

module.exports = { generateConfig };

if (require.main === module) {
  try {
    const { sections, outFile } = generateConfig();
    console.log(`[generate-config] wrote ${path.relative(ROOT, outFile)} (${sections.length} sections: ${sections.join(", ")})`);
  } catch (err) {
    console.error(`[generate-config] FAILED: ${err.message}`);
    process.exit(1);
  }
}
