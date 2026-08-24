/**
 * Thin wrapper around the local Ollama REST API.
 * Docs: https://github.com/ollama/ollama/blob/main/docs/api.md
 *
 * CLI test hook:
 *   node agent/ollama.js            -> lists local models (connectivity check)
 *   node agent/ollama.js --generate -> sends a tiny prompt to the default model
 */

const fs = require("fs");
const path = require("path");

const DEFAULT_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || "qwen3:8b";

const ACCENT_PALETTE = ["#a78bfa", "#38bdf8", "#34d399", "#fb923c", "#f472b6", "#facc15"];
const FILTER_GROUPS = ["ai", "systems"];

async function chat({ prompt, system, host = DEFAULT_HOST, model = DEFAULT_MODEL, temperature = 0.2 } = {}) {
  const body = {
    model,
    messages: system ? [{ role: "system", content: system }, { role: "user", content: prompt }] : [{ role: "user", content: prompt }],
    stream: false,
    format: "json",
    options: { temperature, num_predict: 800 },
  };

  const res = await fetch(`${host.replace(/\/$/, "")}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(300000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Ollama /api/chat failed (${res.status}): ${detail.slice(0, 300)}`);
  }

  const data = await res.json();
  return data?.message?.content ?? "";
}

async function listModels(host = DEFAULT_HOST) {
  const res = await fetch(`${host.replace(/\/$/, "")}/api/tags`, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Ollama /api/tags failed (${res.status})`);
  const data = await res.json();
  return (data.models || []).map((m) => m.name);
}

/**
 * Best-effort JSON extraction from an LLM response:
 * strips markdown fences, then slices the first balanced {...} block.
 */
function extractJson(text) {
  if (!text) throw new Error("empty response");
  let t = String(text).trim();
  t = t.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();

  const start = t.indexOf("{");
  if (start === -1) throw new Error(`no JSON object found in: ${t.slice(0, 120)}`);

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < t.length; i++) {
    const ch = t[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        const slice = t.slice(start, i + 1);
        try {
          return JSON.parse(slice);
        } catch {
          return JSON.parse(slice.replace(/,\s*([}\]])/g, "$1"));
        }
      }
    }
  }
  throw new Error("unbalanced JSON object in model response");
}

function inferFilterGroup(text) {
  const t = text.toLowerCase();
  if (/\b(rag|llm|agent|neural|transformer|vision|nlp|ml\b|machine learning|deep learning|diffusion|embedding|vector)/.test(t)) return "ai";
  return "systems";
}

/**
 * Turns a raw repo + README excerpt into a validated portfolio entry.
 * Throws on unusable output so poll.js can skip instead of pushing junk.
 */
async function draftProjectEntry({ repo, readme = "" }, { host, model, accentIndex = 0 } = {}) {
  const system =
    "You are a precise portfolio copywriter for a software engineer. " +
    "You respond with a single valid JSON object and nothing else.";

  const prompt = [
    "Summarize this GitHub repository as a portfolio project entry.",
    "",
    `Repository name: ${repo.name}`,
    `Description: ${repo.description || "(none)"}`,
    `Primary language: ${repo.language || "(unknown)"}`,
    `Topics: ${(repo.topics || []).join(", ") || "(none)"}`,
    "",
    "README excerpt:",
    readme.slice(0, 4000) || "(no README)",
    "",
    "Respond with JSON exactly matching this shape:",
    "{",
    '  "category": "short category label, e.g. \'LLM Agents / RAG\' or \'Distributed Systems\'",',
    '  "description": "2-3 sentence technical summary of what it does and how it is built",',
    '  "tech": ["up to 8 most important technologies"],',
    '  "highlight": "one-line standout feature, max 70 chars",',
    `  "filterGroup": one of ${JSON.stringify(FILTER_GROUPS)} (ai = AI/ML-centric, systems = backend/infra/web)`,
    "}",
  ].join("\n");

  const raw = await chat({ prompt, system, host, model });
  const parsed = extractJson(raw);

  const name = typeof parsed.name === "string" && parsed.name.trim() ? parsed.name.trim() : repo.name;
  const description = typeof parsed.description === "string" ? parsed.description.trim() : "";
  if (description.length < 20) {
    throw new Error(`drafted description too short for ${repo.fullName}`);
  }

  const tech = Array.isArray(parsed.tech)
    ? [...new Set(parsed.tech.filter((x) => typeof x === "string" && x.trim()).map((x) => x.trim()))].slice(0, 8)
    : [];
  if (!tech.length && repo.language) tech.push(repo.language);

  let filterGroup = FILTER_GROUPS.includes(parsed.filterGroup) ? parsed.filterGroup : null;
  if (!filterGroup) filterGroup = inferFilterGroup([repo.description, readme.slice(0, 1500)].join(" "));

  return {
    name,
    category: typeof parsed.category === "string" && parsed.category.trim() ? parsed.category.trim() : "Project",
    description,
    tech,
    link: repo.url,
    highlight: typeof parsed.highlight === "string" ? parsed.highlight.trim().slice(0, 90) : "",
    accentColor: ACCENT_PALETTE[accentIndex % ACCENT_PALETTE.length],
    icon: "sparkle",
    filterGroup,
  };
}

module.exports = { chat, listModels, extractJson, draftProjectEntry, ACCENT_PALETTE, DEFAULT_HOST, DEFAULT_MODEL };

if (require.main === module) {
  (async () => {
    try {
      const models = await listModels();
      console.log(`[ollama] reachable at ${DEFAULT_HOST}, models: ${models.join(", ") || "(none pulled)"}`);
      if (process.argv.includes("--generate")) {
        const reply = await chat({ prompt: 'Reply with JSON {"ok": true}' });
        console.log("[ollama] generate ok:", reply.trim());
        console.log("[ollama] parsed:", extractJson(reply));
      }
    } catch (err) {
      console.error(`[ollama] FAILED: ${err.message}`);
      process.exit(1);
    }
  })();
}
