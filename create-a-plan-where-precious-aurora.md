# Portfolio Site + Ollama Auto-Update Agent

## Context

Static portfolio site (config-driven, `CONFIG` object given by user) needs to go live, and stay live without manual edits. New GitHub repos and new Medium posts should get picked up automatically, turned into portfolio entries by a local Ollama model, and pushed so Vercel/Netlify redeploys. User confirmed: agent-only (no chat widget), source = GitHub + Medium RSS polling, host = Vercel/Netlify (git-push-triggers-deploy).

## UI direction (added per user request)

Modern, Gen-AI-coded dark theme — not a generic template. Concretely:
- Dark base (near-black), gradient accent (violet→cyan, matching `accentColor` values already used per-project in the given CONFIG), glassmorphism cards (translucent + blur) for experience/project/paper cards.
- Hero: subtle animated background motif suggesting AI/neural nets (CSS-only animated gradient mesh or lightweight canvas particle/graph effect — no heavy JS libs, keep it a zero-build static site for Vercel).
- Typography: one modern sans (e.g. Inter/Space Grotesk via Google Fonts) + a monospace accent font for tags/tech-stack chips.
- Project cards: accent-colored left border/glow driven by each project's `accentColor`; tech chips as pills; filter tabs driven by `filterGroup` (ai/systems/etc.).
- Scroll-triggered fade/slide-in on sections (IntersectionObserver, vanilla JS, no framework).
- Fully responsive (mobile stacked single-column), dark-only (no light mode toggle needed unless requested later).
- Stack stays plain HTML/CSS/vanilla JS (`index.html`, `styles.css`, `app.js`) — matches the existing config.js pattern, keeps Vercel/Netlify deploy build-free.

## New section: Research Papers

Added to `data/portfolio.json` / generated `config.js`, rendered as its own section between Projects and Writing:

```js
research: {
  heading: "Research",
  description: "Published and preprint work.",
  papers: [
    { title: "...", venue: "e.g. arXiv / conference name", date: "2026", url: "...", abstract: "1-2 line summary" }
  ],
},
```

Rendered as its own card grid (reuses the project-card visual style, distinct accent), each card linking out to the paper (arXiv/DOI/PDF). Content seeded manually from whatever papers the user provides at build time — the polling agent only auto-adds GitHub projects and Medium posts (per earlier answers), not papers, since there's no reliable auto-discovery source for those. User can hand-edit `data/portfolio.json`'s `research.papers[]` and re-run `scripts/generate-config.js` to add a paper later.

## Repo layout (new, dir currently empty)

```
portfolio_agent/
  index.html, styles.css, app.js       # site shell (already implied by user's config.js)
  config.js                            # GENERATED file — do not hand-edit projects/writing
  data/portfolio.json                  # canonical source data (hero, experience, projects, writing, footer)
  scripts/generate-config.js           # data/portfolio.json -> config.js (deterministic template)
  agent/
    poll.js                            # main automation: GitHub + Medium check -> Ollama draft -> update json -> regenerate config.js -> git commit/push
    state.json                         # seen repo names + seen Medium post URLs (dedup)
    ollama.js                          # thin wrapper around local Ollama REST API
    github.js                          # GET /users/Sailesh3000/repos, filter new/non-fork
    medium.js                          # fetch + parse https://medium.com/feed/@saileshhedu
  vercel.json                          # static site, no build step
  package.json
  README.md
```

Rationale for `data/portfolio.json` + generated `config.js`: the user's `config.js` is a plain JS literal (`const CONFIG = {...}`), not JSON — safe for a script to hand-edit only via a template regeneration step, not regex-patching JS. Keeping a JSON source of truth means the agent only ever does structured JSON edits, then regenerates `config.js` in one deterministic pass. `scripts/generate-config.js` is reused by both first-time setup and every agent run.

## Agent workflow (`agent/poll.js`)

1. Load `agent/state.json` (`{ seenRepos: [], seenPosts: [] }`).
2. **GitHub**: `GET https://api.github.com/users/Sailesh3000/repos?sort=created` (optional `GITHUB_TOKEN` env var for rate limit). Filter out forks and anything in `seenRepos`.
3. **Medium**: fetch `https://medium.com/feed/@saileshhedu`, parse RSS/XML, filter out URLs already in `seenPosts`.
4. If nothing new on both → exit (no commit, no deploy).
5. For each new repo: fetch its README, send repo name + description + README excerpt to local Ollama (`agent/ollama.js`, model configurable via `OLLAMA_MODEL` env, default e.g. `llama3.1:8b`) with a prompt asking for JSON matching the `projects[]` entry shape (`name, category, description, tech[], link, highlight, accentColor, icon, filterGroup`). Validate/repair JSON before use; skip entry + log on failure rather than pushing malformed data.
6. For each new Medium post: append `{ title, date, url }` directly from feed metadata (no Ollama needed — feed already has the fields `writing.featured[]` wants).
7. Merge results into `data/portfolio.json` (new projects prepended to `projects[]`, new posts prepended to `writing.featured[]`).
8. Run `scripts/generate-config.js` to rewrite `config.js` from the updated JSON.
9. Update and save `agent/state.json` with newly seen repo names / post URLs.
10. `git add -A && git commit -m "chore: auto-add <n> project(s)/post(s)" && git push` — push is what triggers Vercel/Netlify redeploy.
11. Wrap steps 2-10 in try/catch; on any failure, log and exit non-zero without partial commits (git add/commit only after full success).

## Scheduling

Ollama is local-only, so the agent must run somewhere Ollama is installed and reachable (user's machine or a server with Ollama). Recommended: Windows Task Scheduler runs `node agent/poll.js` on an interval (e.g. every 6 hours) — no daemon needed, simplest to reason about and restart. Document the `schtasks` command in README; do not set this up as a Claude Code cron (this must survive independent of any Claude session).

## Config / secrets

- `.env` (git-ignored): `GITHUB_TOKEN` (optional, raises rate limit), `OLLAMA_MODEL`, `OLLAMA_HOST` (default `http://localhost:11434`).
- `vercel.json`: static build, no framework — just serves root files.

## Build order

1. Scaffold repo: `package.json`, `.gitignore`, `index.html`/`styles.css`/`app.js` (site shell around the given CONFIG shape — reuse structure from user's supplied config exactly).
2. `data/portfolio.json` seeded **verbatim** from the user's pasted CONFIG (meta, hero, experience, projects, writing, footer) — no rewriting/rephrasing of existing content, only reshaping JS→JSON. `research.papers[]` starts empty (user adds papers later).
3. `scripts/generate-config.js` — write, then run once to produce `config.js`, diff against the hand-written shape to confirm fidelity.
4. `agent/github.js`, `agent/medium.js`, `agent/ollama.js` — each independently testable (small `--test` CLI hook or plain function export).
5. `agent/poll.js` wiring the above, with `--dry-run` flag that logs what it would add/commit without writing/pushing.
6. Init git repo, first commit, push to GitHub; connect repo in Vercel/Netlify dashboard (manual step, one-time, done by user since it needs their account).
7. Verify a real push redeploys correctly.
8. Register the Task Scheduler job.

## Verification

- `node scripts/generate-config.js` then open `index.html` locally — visual check against original CONFIG.
- `node agent/poll.js --dry-run` with a temporary empty `state.json` — confirms it detects existing repos/posts as "new" and drafts sane project JSON via Ollama without committing.
- `curl http://localhost:11434/api/tags` — confirm Ollama is up and target model is pulled before first real run.
- Manual: temporarily clear one entry from `state.json`, run `node agent/poll.js` for real, confirm `config.js` updated, commit pushed, and Vercel/Netlify shows a new deployment.
