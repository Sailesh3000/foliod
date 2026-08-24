# Foliod

Chandra Sailesh's self-curating portfolio: a config-driven static site (plain
HTML/CSS/vanilla JS, zero build) plus a local **Ollama-powered agent** that
watches GitHub and Medium, drafts portfolio entries for new repos/posts, updates
the site data, and opens a PR for review — merging it is what triggers a
Vercel/Netlify redeploy.

```
portfolio_agent/
├── index.html                  site shell
├── styles.css                  design system (dark, glassmorphism, gradient accents)
├── app.js                      rendering, filter tabs, scroll reveals, neural canvas
├── config.js                   GENERATED from data/portfolio.json — do not hand-edit
├── data/
│   └── portfolio.json          ★ single source of truth for all site content
├── scripts/
│   └── generate-config.js      data/portfolio.json -> config.js (deterministic)
├── agent/
│   ├── poll.js                 main automation pipeline (--dry-run supported)
│   ├── github.js               repo discovery + README fetch   (node agent/github.js to test)
│   ├── medium.js               RSS fetch + parser              (node agent/medium.js to test)
│   ├── ollama.js               local LLM wrapper               (node agent/ollama.js to test)
│   └── state.json              dedup memory: seen repos / seen posts
├── vercel.json                 static hosting config (no build step)
└── package.json                zero runtime dependencies (Node >= 18)
```

## Using this as your own portfolio (template setup)

This repo is not hardcoded to one person — GitHub/Medium sources are read from
env vars, and all content comes from one JSON file. To make it yours:

1. **Fork or copy this repo.**
2. **Replace your content** in `data/portfolio.json` — `meta`, `hero` (name, bio,
   contact, socials), `experience`, `projects`, `research.papers` (leave `[]` to
   keep the section hidden), `writing.featured`, `footer`. Then:
   ```bash
   node scripts/generate-config.js
   ```
3. **Point the agent at your own accounts** — copy `.env.example` to `.env` and set:
   ```bash
   GITHUB_USERNAME=your-github-handle
   MEDIUM_USERNAME=your-medium-handle       # or MEDIUM_FEED_URL for a custom domain
   ```
   Nothing else in `agent/` needs editing — `github.js` and `medium.js` both read
   these at startup.
4. **Reset the dedup memory** so the agent doesn't skip your existing repos/posts
   on the first run — either delete `agent/state.json` or empty its two arrays.
   Run `node agent/poll.js --dry-run` once to confirm it now sees your real repos.
5. Follow **One-time setup** below (Ollama, git remote, Vercel/Netlify import).

## Editing site content

All content lives in **`data/portfolio.json`** (meta, hero, experience, projects,
research, writing, footer). After editing:

```bash
node scripts/generate-config.js     # regenerate config.js
```

Then open `index.html` in a browser and commit + push both files.

### Adding a research paper

Papers are **not** auto-discovered (no reliable public feed) — add them by hand:

```js
// data/portfolio.json -> research.papers[]
{
  "title": "Paper title",
  "venue": "arXiv / conference name",
  "date": "2026",
  "url": "https://arxiv.org/abs/...",
  "abstract": "1-2 line summary"
}
```

Rerun `node scripts/generate-config.js`. The Research section appears automatically
once at least one paper exists (it is hidden while `papers` is empty).

## How the agent works

`node agent/poll.js` runs this all-or-nothing pipeline:

1. Load `agent/state.json` (dedup memory).
2. **PR mode only:** if an agent PR is already open, stop — no duplicate work
   until it's merged or closed.
3. Fetch public non-fork repos for the configured GitHub user; keep unseen ones.
4. Fetch the Medium RSS feed; keep unseen post URLs.
5. Nothing new → exit (no commit, no deploy).
6. Each new repo: README excerpt → local Ollama → validated JSON project entry.
   Failures are logged and skipped, never pushed malformed.
7. Each new Medium post: `{title, date, url}` straight from feed metadata.
8. Prepend entries into `data/portfolio.json`, regenerate `config.js`.
9. Update `state.json`.
10. Publish, per `PUSH_MODE`:
    - **`pr`** (default): commit on branch `agent/auto-update`, push it, open a
      PR via `gh` against the branch you ran the agent from. That base branch is
      left untouched — nothing redeploys until you review and merge. Merging is
      also what applies the new `state.json`, so an unmerged PR means the same
      items get proposed again next run.
    - **`direct`**: commit and push straight to the current branch (old
      behavior) — set `PUSH_MODE=direct` if you'd rather skip review.
11. Any error before step 10 aborts with no partial commits.

Preview without writing/pushing/opening anything:

```bash
node agent/poll.js --dry-run
```

## One-time setup

1. **Node >= 18**, **git**, and the **[GitHub CLI](https://cli.github.com/)** (`gh`)
   installed — `gh` is required for the default PR-first publish mode. Authenticate
   once: `gh auth login`.
2. Install Ollama and pull a model:
   ```bash
   ollama pull qwen3:8b
   curl http://localhost:11434/api/tags   # confirm it is up
   ```
3. Configure secrets and identity:
   ```bash
   cp .env.example .env    # then edit:
   # GITHUB_USERNAME  the GitHub account the agent polls (defaults to Sailesh3000)
   # GITHUB_TOKEN     optional — raises API rate limit 60 -> 5000/h
   # MEDIUM_USERNAME  the Medium handle the agent polls (defaults to saileshhedu)
   # OLLAMA_MODEL     default qwen3:8b
   # OLLAMA_HOST      default http://localhost:11434
   # PUSH_MODE        "pr" (default, opens a PR for review) or "direct" (old push behavior)
   ```
   If you skip this file entirely the agent still runs — it just polls the
   defaults baked into `agent/github.js` / `agent/medium.js`.
4. Create a GitHub repo for this folder and push it (first deploy) — `gh` (already
   installed for PR mode) can do this in one step:
   ```bash
   git init && git add -A && git commit -m "feat: initial portfolio + agent"
   gh repo create foliod --public --source=. --remote=origin --push
   ```
   or manually:
   ```bash
   git remote add origin git@github.com:<you>/foliod.git
   git push -u origin main
   ```
5. Import the repo on [Vercel](https://vercel.com/new) (or Netlify): framework preset
   **Other**, no build command, output dir root. Every future push redeploys.

> `agent/state.json` ships pre-seeded with everything currently public, so the first
> scheduled run only reacts to genuinely new repos/posts. Delete its arrays (or the
> file) to make the agent treat *everything* as new again.

## Scheduling (Windows Task Scheduler)

The agent must run where Ollama is reachable. Simplest reliable setup is a scheduled
task every 6 hours (adjust the path):

```bat
schtasks /Create /TN "Portfolio Poller" ^
  /TR "cmd /c cd /d C:\My_Agentic_Projects\portfolio_agent && node agent\poll.js >> agent\poll.log 2>&1" ^
  /SC HOURLY /MO 6 /F
```

Useful commands:

```bat
schtasks /Run   /TN "Portfolio Poller"   :: trigger immediately
schtasks /Query /TN "Portfolio Poller" /V :: inspect last result
schtasks /Delete /TN "Portfolio Poller"  :: remove
```

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `ollama` module errors | Is Ollama running? `curl http://localhost:11434/api/tags` |
| model not found | `OLLAMA_MODEL` must match an installed model (`ollama list`) |
| GitHub 403/429 | Add `GITHUB_TOKEN` to `.env` |
| `gh: command not found` / PR step fails | Install the [GitHub CLI](https://cli.github.com/) and run `gh auth login`, or set `PUSH_MODE=direct` to skip PRs entirely |
| agent says "PR already open, skipping" every run | Merge or close the open `agent/auto-update` PR — that's what unblocks the next run |
| push fails in scheduled runs | Run `git push` manually once; check remote/auth |
| section missing on site | Did you rerun `node scripts/generate-config.js` after editing JSON? |

## Ideas for extending the agent

Not built, but natural next steps on this architecture:

- **Self-critique pass** — a second Ollama call that fact-checks the drafted
  `description`/`tech` against the raw README before accepting it, catching
  invented claims the first pass made up.
- **Dead-link sweep** — before each push, `HEAD`-request every `link`/`url` in
  `data/portfolio.json` and warn (or block) on 404s, including Medium posts that
  get unpublished.
- **Stale-tech nudges** — periodically diff each project's `tech[]` against
  the repo's *current* `package.json`/`requirements.txt`, flagging entries that
  drifted out of sync with the real stack.
- **Star/activity-weighted ordering** — sort `projects[]` by GitHub stars or
  last-push recency instead of pure prepend-newest-first.
- **Run notification** — a webhook/email/Discord ping summarizing what a given
  `poll.js` run added, so you get an audit trail even though the push already
  happened.
- **GitHub Actions runner option** — document a self-hosted Actions runner
  variant of the scheduling step for anyone who'd rather not depend on their
  own machine being awake (still needs Ollama reachable from that runner).

## Manual verification checklist

```bash
node scripts/generate-config.js        # regenerate, open index.html locally
node agent/github.js                   # lists repos vs state.json
node agent/medium.js                   # parses live feed
node agent/ollama.js --generate        # end-to-end LLM connectivity check
node agent/poll.js --dry-run           # full pipeline preview, writes nothing
```
