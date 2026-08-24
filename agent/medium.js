/**
 * Medium RSS feed fetching + minimal dependency-free XML parsing.
 * Feed: https://medium.com/feed/@<MEDIUM_USERNAME> (see .env.example)
 *
 * CLI test hook:
 *   node agent/medium.js                    -> fetches live feed, prints parsed posts
 *   node agent/medium.js --file <path.xml>  -> parses a local fixture instead
 */

const fs = require("fs");

const MEDIUM_USERNAME = process.env.MEDIUM_USERNAME || null;
const DEFAULT_FEED =
  process.env.MEDIUM_FEED_URL || (MEDIUM_USERNAME ? `https://medium.com/feed/@${MEDIUM_USERNAME}` : null);

async function fetchFeed(url = DEFAULT_FEED) {
  if (!url) {
    throw new Error("MEDIUM_USERNAME or MEDIUM_FEED_URL is not set — add one to .env (see .env.example)");
  }
  const res = await fetch(url, {
    headers: { "User-Agent": "portfolio-auto-agent" },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`Medium feed fetch failed (${res.status})`);
  return res.text();
}

function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/** Pull inner text of a tag, unwrapping CDATA if present. */
function tagText(block, tag) {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  if (!m) return "";
  return decodeEntities(
    m[1]
      .replace(/^\s*<!\[CDATA\[/, "")
      .replace(/\]\]>\s*$/, "")
      .trim()
  );
}

/**
 * Parses a Medium RSS feed into post objects:
 * { title, url, guid, date (year string), pubDate (ISO) }
 */
function parseFeed(xml) {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
  return items.map((item) => {
    let url = tagText(item, "link") || tagText(item, "guid");
    url = url.split("?")[0].trim();
    const pubDate = tagText(item, "pubDate");
    const parsedDate = pubDate ? new Date(pubDate) : null;
    return {
      title: tagText(item, "title"),
      url,
      guid: tagText(item, "guid"),
      date: parsedDate && !Number.isNaN(parsedDate.getTime()) ? String(parsedDate.getUTCFullYear()) : "",
      pubDate: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : "",
    };
  }).filter((p) => p.title && p.url);
}

module.exports = { fetchFeed, parseFeed, DEFAULT_FEED };

if (require.main === module) {
  (async () => {
    try {
      const fileIdx = process.argv.indexOf("--file");
      const xml =
        fileIdx !== -1 && process.argv[fileIdx + 1]
          ? fs.readFileSync(process.argv[fileIdx + 1], "utf8")
          : await fetchFeed();
      const posts = parseFeed(xml);
      console.log(`[medium] ${posts.length} posts in feed:`);
      for (const p of posts) console.log(`  - [${p.date}] ${p.title}\n    ${p.url}`);
    } catch (err) {
      console.error(`[medium] FAILED: ${err.message}`);
      process.exit(1);
    }
  })();
}
