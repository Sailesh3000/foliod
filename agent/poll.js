#!/usr/bin/env node
/**
 * Portfolio auto-update agent.
 *
 * Pipeline (all-or-nothing: git commit/push happens only after every step succeeds):
 *   1. load agent/state.json (seen repos / seen Medium posts)
 *   2. GitHub: new public non-fork repos for Sailesh3000
 *   3. Medium: new posts from the RSS feed
 *   4. nothing new -> exit silently
 *   5. draft each new repo as a portfolio entry via local Ollama (skipped + logged on failure)
 *   6. map each new Medium post straight from feed metadata
 *   7. merge into data/portfolio.json (prepend)
 *   8. regenerate config.js via scripts/generate-config.js
 *   9. save agent/state.json
 *  10. git add -A && commit && push  <- triggers Vercel/Netlify redeploy
 *
 * Usage:
 *   node agent/poll.js            real run
 *   node agent/poll.js --dry-run  detect + draft + log only, writes nothing
 */

const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

const ROOT = path.resolve(__dirname, "..");
const DATA_FILE = path.join(ROOT, "data", "portfolio.json");
const STATE_FILE = path.join(__dirname, "state.json");

const github = require("./github");
const medium = require("./medium");
const ollama = require("./ollama");
const { generateConfig } = require("../scripts/generate-config");

// ---------------------------------------------------------------- env & utils

function loadDotEnv() {
  const envFile = path.join(ROOT, ".env");
  if (!fs.existsSync(envFile)) return;
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith("#")) continue;
    const key = m[1];
    let value = m[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

const DRY_RUN = process.argv.includes("--dry-run");

function log(tag, msg) {
  console.log(`[${new Date().toISOString()}] [${tag}] ${msg}`);
}

function fail(msg) {
  log("fatal", msg);
  process.exit(1);
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------- git helpers

async function git(cwd, args) {
  const { stdout } = await execFileAsync("git", args, { cwd, windowsHide: true });
  return stdout.trim();
}

async function gitCommitAndPush(counts) {
  const inside = await git(ROOT, ["rev-parse", "--is-inside-work-tree"]).catch(() => "false");
  if (inside !== "true") {
    throw new Error("not a git work tree — init the repo before enabling auto-push");
  }

  await git(ROOT, ["add", "-A"]);

  const status = await git(ROOT, ["status", "--porcelain"]);
  if (!status) {
    log("git", "nothing to commit (unexpected — skipping)");
    return;
  }

  const parts = [];
  if (counts.projects) parts.push(`${counts.projects} project${counts.projects === 1 ? "" : "s"}`);
  if (counts.posts) parts.push(`${counts.posts} post${counts.posts === 1 ? "" : "s"}`);
  const message = `chore: auto-add ${parts.join(", ")}`;

  await git(ROOT, ["commit", "-m", message]);
  log("git", `committed: ${message}`);

  try {
    await git(ROOT, ["push"]);
    log("git", "pushed — hosting provider will redeploy");
  } catch (err) {
    throw new Error(
      `commit succeeded but push failed (${String(err.stderr || err.message).trim().slice(0, 200)}). Push manually with: git push`
    );
  }
}

// ---------------------------------------------------------------- main

async function main() {
  loadDotEnv();

  if (!DRY_RUN) {
    const inside = await git(ROOT, ["rev-parse", "--is-inside-work-tree"]).catch(() => "false");
    if (inside !== "true") {
      fail("not a git work tree — init the repo (and add a remote) before running for real");
    }
  }

  const token = process.env.GITHUB_TOKEN || undefined;
  const ollamaHost = process.env.OLLAMA_HOST || ollama.DEFAULT_HOST;
  const ollamaModel = process.env.OLLAMA_MODEL || ollama.DEFAULT_MODEL;

  const state = await readJson(STATE_FILE, { seenRepos: [], seenPosts: [] });
  state.seenRepos = Array.isArray(state.seenRepos) ? state.seenRepos : [];
  state.seenPosts = Array.isArray(state.seenPosts) ? state.seenPosts : [];

  // ---- discover ------------------------------------------------------------
  log("poll", `checking GitHub (@${github.USERNAME}) and Medium feed...`);

  const repos = (await github.fetchRepos({ token })).filter(github.isTrackableRepo);
  const newRepos = repos.filter((r) => !state.seenRepos.includes(r.full_name));
  log("github", `${repos.length} trackable repos, ${newRepos.length} new`);

  const feedXml = await medium.fetchFeed();
  const posts = medium.parseFeed(feedXml);
  const newPosts = posts.filter((p) => !state.seenPosts.includes(p.url));
  log("medium", `${posts.length} feed posts, ${newPosts.length} new`);

  if (!newRepos.length && !newPosts.length) {
    log("poll", "nothing new — exiting");
    return;
  }

  // ---- draft (in memory; nothing written until all drafting settles) -------
  const draftedProjects = [];
  let accentIndex = 0;

  for (const repo of newRepos) {
    try {
      log("github", `drafting ${repo.full_name} via ${ollamaModel}...`);
      const readme = await github.fetchReadme(repo.full_name, { token });
      const entry = await ollama.draftProjectEntry(
        { repo: { ...repo, fullName: repo.full_name }, readme },
        { host: ollamaHost, model: ollamaModel, accentIndex: accentIndex++ }
      );
      draftedProjects.push(entry);
      log("ollama", `drafted "${entry.name}" [${entry.category}] (${entry.tech.length} tech chips, group=${entry.filterGroup})`);
    } catch (err) {
      log("ollama", `SKIP ${repo.full_name}: ${err.message}`);
    }
  }

  const mappedPosts = newPosts.map((p) => ({ title: p.title, date: p.date, url: p.url }));

  if (!draftedProjects.length && !mappedPosts.length) {
    log("poll", "new items found but none usable — exiting without changes");
    return;
  }

  if (DRY_RUN) {
    log("dry-run", `would prepend ${draftedProjects.length} project(s):`);
    for (const p of draftedProjects) {
      log("dry-run", `  project -> ${p.name} | ${p.category} | ${p.filterGroup} | tech: ${p.tech.join(", ")}`);
      log("dry-run", `            "${p.description.slice(0, 110)}..."`);
    }
    log("dry-run", `would prepend ${mappedPosts.length} post(s):`);
    for (const p of mappedPosts) log("dry-run", `  post -> [${p.date}] ${p.title}`);
    log("dry-run", "would regenerate config.js, update state.json, then git commit + push");
    return;
  }

  // ---- merge + regenerate --------------------------------------------------
  const portfolio = await readJson(DATA_FILE, null);
  if (!portfolio || !Array.isArray(portfolio.projects) || !portfolio.writing?.featured) {
    fail(`${DATA_FILE} missing or malformed`);
  }

  portfolio.projects.unshift(...draftedProjects);
  portfolio.writing.featured.unshift(...mappedPosts);
  fs.writeFileSync(DATA_FILE, JSON.stringify(portfolio, null, 2) + "\n", "utf8");
  log("poll", `updated ${path.relative(ROOT, DATA_FILE)}`);

  generateConfig();
  log("poll", "regenerated config.js");

  state.seenRepos.push(...newRepos.map((r) => r.full_name));
  state.seenPosts.push(...mappedPosts.map((p) => p.url));
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + "\n", "utf8");
  log("poll", `updated agent/state.json (${state.seenRepos.length} repos, ${state.seenPosts.length} posts seen)`);

  // ---- publish -------------------------------------------------------------
  await gitCommitAndPush({
    projects: draftedProjects.length,
    posts: mappedPosts.length,
  });

  log("poll", "done");
}

main().catch((err) => {
  fail(err.stack || err.message);
});
