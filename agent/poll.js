#!/usr/bin/env node
/**
 * Portfolio auto-update agent.
 *
 * Pipeline (all-or-nothing: git/gh steps happen only after every prior step succeeds):
 *   1. load agent/state.json (seen repos / seen Medium posts)
 *   2. PR mode only: if an agent PR is already open, stop (avoid duplicate work)
 *   3. GitHub: new public non-fork repos for the configured username
 *   4. Medium: new posts from the RSS feed
 *   5. nothing new -> exit silently
 *   6. draft each new repo as a portfolio entry via local Ollama (skipped + logged on failure)
 *   7. map each new Medium post straight from feed metadata
 *   8. merge into data/portfolio.json (prepend)
 *   9. regenerate config.js via scripts/generate-config.js
 *  10. save agent/state.json
 *  11. publish, per PUSH_MODE (default "pr"):
 *        pr     - commit on a dedicated branch, push it, open a PR via `gh` for
 *                 review. Nothing lands on the base branch (so nothing redeploys)
 *                 until a human merges it. Requires the `gh` CLI, authenticated,
 *                 against a GitHub remote.
 *        direct - commit and push straight to the current branch, same as before.
 *
 * Usage:
 *   node agent/poll.js            real run
 *   node agent/poll.js --dry-run  detect + draft + log only, writes nothing
 *
 * PUSH_MODE=direct node agent/poll.js   to bypass PR review and push directly
 */

const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

const ROOT = path.resolve(__dirname, "..");
const DATA_FILE = path.join(ROOT, "data", "portfolio.json");
const STATE_FILE = path.join(__dirname, "state.json");

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

// Load .env BEFORE requiring github/medium — their USERNAME/feed defaults are
// read from process.env at module-load time.
loadDotEnv();

const github = require("./github");
const medium = require("./medium");
const ollama = require("./ollama");
const { generateConfig, generateIndexHtml } = require("../scripts/generate-config");

const DRY_RUN = process.argv.includes("--dry-run");
const AGENT_BRANCH = "agent/auto-update";
const PUSH_MODE = ["pr", "direct"].includes((process.env.PUSH_MODE || "").toLowerCase())
  ? process.env.PUSH_MODE.toLowerCase()
  : "pr";

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

async function gh(args) {
  const { stdout } = await execFileAsync("gh", args, { cwd: ROOT, windowsHide: true });
  return stdout.trim();
}

/** Returns the open agent PR ({ number, url }) if one exists, else null. */
async function findOpenAgentPR() {
  try {
    const out = await gh(["pr", "list", "--head", AGENT_BRANCH, "--state", "open", "--json", "number,url"]);
    const list = JSON.parse(out || "[]");
    return list[0] || null;
  } catch (err) {
    log("gh", `could not check for an existing PR (${err.message}) — proceeding anyway`);
    return null;
  }
}

function commitMessage(counts) {
  const parts = [];
  if (counts.projects) parts.push(`${counts.projects} project${counts.projects === 1 ? "" : "s"}`);
  if (counts.posts) parts.push(`${counts.posts} post${counts.posts === 1 ? "" : "s"}`);
  return { parts, message: `chore: auto-add ${parts.join(", ")}` };
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

  const { message } = commitMessage(counts);

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

/**
 * PR-first publish: commit on AGENT_BRANCH, push it, open a PR against the
 * branch the agent was run from. The base branch is left untouched — nothing
 * redeploys until a human merges the PR. Requires `gh` (authenticated).
 */
async function gitCommitAndPR(counts) {
  const baseBranch = await git(ROOT, ["rev-parse", "--abbrev-ref", "HEAD"]);
  if (baseBranch === AGENT_BRANCH) {
    throw new Error(
      `currently checked out on ${AGENT_BRANCH} itself — run the agent from your base branch (e.g. main)`
    );
  }

  await git(ROOT, ["add", "-A"]);
  const status = await git(ROOT, ["status", "--porcelain"]);
  if (!status) {
    log("git", "nothing to commit (unexpected — skipping)");
    return;
  }

  const { parts, message } = commitMessage(counts);

  await git(ROOT, ["checkout", "-B", AGENT_BRANCH]);
  await git(ROOT, ["commit", "-m", message]);
  log("git", `committed on ${AGENT_BRANCH}: ${message}`);

  try {
    await git(ROOT, ["push", "-u", "origin", AGENT_BRANCH, "--force-with-lease"]);
  } catch (err) {
    await git(ROOT, ["checkout", baseBranch]).catch(() => {});
    throw new Error(
      `commit succeeded but push failed (${String(err.stderr || err.message).trim().slice(0, 200)}). ` +
        `${AGENT_BRANCH} has the commit locally — push manually or rerun.`
    );
  }

  await git(ROOT, ["checkout", baseBranch]);
  log("git", `pushed ${AGENT_BRANCH}; switched back to ${baseBranch} (base branch left untouched until merge)`);

  const body = [
    "Auto-drafted by the local Ollama portfolio agent.",
    "",
    `- ${parts.join("\n- ")}`,
    "",
    "Review the diff — especially Ollama-drafted project descriptions — before merging.",
    "Merging is what applies the new dedup state (`agent/state.json`); an unmerged PR",
    "means the same repos/posts get proposed again on the next scheduled run.",
  ].join("\n");

  try {
    const url = await gh([
      "pr",
      "create",
      "--head",
      AGENT_BRANCH,
      "--base",
      baseBranch,
      "--title",
      message,
      "--body",
      body,
    ]);
    log("gh", `opened PR: ${url}`);
  } catch (err) {
    log(
      "gh",
      `push succeeded but PR creation failed (${err.message}). Open it manually: gh pr create --head ${AGENT_BRANCH} --base ${baseBranch}`
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
    if (PUSH_MODE === "pr") {
      const openPR = await findOpenAgentPR();
      if (openPR) {
        log("poll", `agent PR #${openPR.number} already open (${openPR.url}) — merge or close it before the next run; skipping`);
        return;
      }
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
  const draftedRepoNames = [];
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
      draftedRepoNames.push(repo.full_name);
      log("ollama", `drafted "${entry.name}" [${entry.category}] (${entry.tech.length} tech chips, group=${entry.filterGroup})`);
    } catch (err) {
      // Deliberately NOT marked seen: a repo that fails to draft (e.g. a
      // transient Ollama crash) should get another chance on the next run,
      // not be silently blacklisted forever.
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
    log("dry-run", `would regenerate config.js, update state.json, then publish via PUSH_MODE=${PUSH_MODE}`);
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
  generateIndexHtml();
  log("poll", "regenerated config.js and index.html");

  state.seenRepos.push(...draftedRepoNames);
  state.seenPosts.push(...mappedPosts.map((p) => p.url));
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + "\n", "utf8");
  log("poll", `updated agent/state.json (${state.seenRepos.length} repos, ${state.seenPosts.length} posts seen)`);

  // ---- publish -------------------------------------------------------------
  const publish = PUSH_MODE === "direct" ? gitCommitAndPush : gitCommitAndPR;
  await publish({
    projects: draftedProjects.length,
    posts: mappedPosts.length,
  });

  log("poll", "done");
}

main().catch((err) => {
  fail(err.stack || err.message);
});
