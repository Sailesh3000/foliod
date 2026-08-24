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
const HTML_FILE = path.join(ROOT, "index.html");

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

// -------------------------------------------------------------------------
// index.html: the <title>/meta/og tags, favicon initials, and nav-logo
// initials are crawler-facing fallbacks rendered before app.js runs, so they
// can't be filled in at runtime — they're regenerated here from the same
// data/portfolio.json instead of being hand-typed (and personally-identifying)
// in the HTML source. Replaces only the content between the `gen:*` marker
// comments; everything else in index.html is untouched.

function escapeHtmlAttr(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function escapeHtmlText(s) {
  return String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}

function initialsOf(name) {
  const letters = String(name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return letters || "??";
}

function faviconHref(initials) {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
    `<stop offset='0' stop-color='#a78bfa'/><stop offset='1' stop-color='#22d3ee'/>` +
    `</linearGradient></defs>` +
    `<rect width='64' height='64' rx='14' fill='#090912'/>` +
    `<text x='32' y='43' font-family='Arial,sans-serif' font-size='26' font-weight='700' fill='url(#g)' text-anchor='middle'>${initials}</text>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function replaceBlock(html, marker, inner, { inline = false } = {}) {
  const re = new RegExp(`(<!-- gen:${marker}:start -->)[\\s\\S]*?(<!-- gen:${marker}:end -->)`);
  if (!re.test(html)) {
    throw new Error(`index.html is missing the gen:${marker} marker comments`);
  }
  // Block markers sit on their own lines (meta tags, the favicon <link>);
  // inline markers sit inside visible text (nav-logo initials) where added
  // whitespace would render as a stray space.
  const replacement = inline ? `$1${inner}$2` : `$1\n${inner}\n  $2`;
  return html.replace(re, replacement);
}

function generateIndexHtml({ dataFile = DATA_FILE, htmlFile = HTML_FILE } = {}) {
  const data = JSON.parse(fs.readFileSync(dataFile, "utf8"));
  const meta = data.meta || {};
  const title = escapeHtmlText(meta.title || "Portfolio");
  const description = escapeHtmlAttr(meta.description || "Personal portfolio.");
  const keywords = escapeHtmlAttr(meta.keywords || "Portfolio");
  const initials = initialsOf(data.hero?.name);

  let html = fs.readFileSync(htmlFile, "utf8");

  html = replaceBlock(
    html,
    "seo",
    [
      `  <title>${title}</title>`,
      `  <meta name="description" content="${description}" />`,
      `  <meta name="keywords" content="${keywords}" />`,
      `  <meta property="og:type" content="website" />`,
      `  <meta property="og:title" content="${title}" />`,
      `  <meta property="og:description" content="${description}" />`,
    ].join("\n")
  );

  html = replaceBlock(html, "favicon", `  <link rel="icon" href="${faviconHref(initials)}" />`);
  html = replaceBlock(html, "initials", escapeHtmlText(initials), { inline: true });

  fs.writeFileSync(htmlFile, html, "utf8");
  return { htmlFile };
}

module.exports = { generateConfig, generateIndexHtml };

if (require.main === module) {
  try {
    const { sections, outFile } = generateConfig();
    console.log(`[generate-config] wrote ${path.relative(ROOT, outFile)} (${sections.length} sections: ${sections.join(", ")})`);
    generateIndexHtml();
    console.log(`[generate-config] updated ${path.relative(ROOT, HTML_FILE)} (title/meta/favicon/initials)`);
  } catch (err) {
    console.error(`[generate-config] FAILED: ${err.message}`);
    process.exit(1);
  }
}
