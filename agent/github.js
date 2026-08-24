/**
 * GitHub API helpers: list public repos for a user + fetch READMEs.
 *
 * CLI test hook:
 *   node agent/github.js            -> lists public non-fork repos (vs state.json)
 */

const fs = require("fs");
const path = require("path");

const API = "https://api.github.com";
const USERNAME = process.env.GITHUB_USERNAME || "Sailesh3000";

function headers(token) {
  const h = {
    Accept: "application/vnd.github+json",
    "User-Agent": "portfolio-auto-agent",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function ghFetch(url, token) {
  const res = await fetch(url, { headers: headers(token), signal: AbortSignal.timeout(30000) });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`GitHub ${url} failed (${res.status}): ${detail.slice(0, 200)}`);
  }
  return res;
}

/** All public repos for the user, paginated, newest first. */
async function fetchRepos({ username = USERNAME, token } = {}) {
  const repos = [];
  for (let page = 1; page <= 10; page++) {
    const res = await ghFetch(
      `${API}/users/${username}/repos?sort=created&direction=desc&per_page=100&page=${page}`,
      token
    );
    const batch = await res.json();
    repos.push(...batch);
    if (batch.length < 100) break;
  }
  return repos;
}

function isTrackableRepo(repo) {
  return !repo.fork && !repo.archived && !repo.disabled;
}

/** Raw README text for a repo (empty string if the repo has none). */
async function fetchReadme(fullName, { token } = {}) {
  try {
    const res = await fetch(`${API}/repos/${fullName}/readme`, {
      headers: { ...headers(token), Accept: "application/vnd.github.raw+json" },
      signal: AbortSignal.timeout(30000),
    });
    if (res.status === 404) return "";
    if (!res.ok) throw new Error(`README fetch failed (${res.status})`);
    return await res.text();
  } catch (err) {
    console.warn(`[github] readme unavailable for ${fullName}: ${err.message}`);
    return "";
  }
}

module.exports = { fetchRepos, fetchReadme, isTrackableRepo, USERNAME };

if (require.main === module) {
  (async () => {
    try {
      const stateFile = path.join(__dirname, "state.json");
      let seen = [];
      if (fs.existsSync(stateFile)) {
        seen = JSON.parse(fs.readFileSync(stateFile, "utf8")).seenRepos || [];
      }
      const repos = await fetchRepos();
      const trackable = repos.filter(isTrackableRepo);
      const fresh = trackable.filter((r) => !seen.includes(r.full_name));
      console.log(`[github] ${trackable.length} public non-fork repos, ${fresh.length} not yet in state.json:`);
      for (const r of fresh) console.log(`  - ${r.full_name}  (${r.created_at?.slice(0, 10)}) ${(r.description || "").slice(0, 80)}`);
    } catch (err) {
      console.error(`[github] FAILED: ${err.message}`);
      process.exit(1);
    }
  })();
}
