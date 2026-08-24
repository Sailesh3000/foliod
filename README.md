# Chandra Sailesh — Portfolio + Auto-Update Agent

Config-driven static portfolio (plain HTML/CSS/vanilla JS, zero build) plus a local
**Ollama-powered agent** that watches GitHub and Medium, drafts portfolio entries for
new repos/posts, updates the site data, and pushes to git so Vercel/Netlify redeploys
automatically.

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
2. Fetch public non-fork repos for `@Sailesh3000`; keep unseen ones.
3. Fetch the Medium RSS feed (`@saileshhedu`); keep unseen post URLs.
4. Nothing new → exit (no commit, no deploy).
5. Each new repo: README excerpt → local Ollama → validated JSON project entry.
   Failures are logged and skipped, never pushed malformed.
6. Each new Medium post: `{title, date, url}` straight from feed metadata.
7. Prepend entries into `data/portfolio.json`, regenerate `config.js`.
8. Update `state.json`.
9. `git add -A && git commit -m "chore: auto-add ..." && git push` → redeploy.
10. Any error before step 9 aborts with no partial commits.

Preview without writing/pushing anything:

```bash
node agent/poll.js --dry-run
```

## One-time setup

1. **Node >= 18** and **git** installed.
2. Install Ollama and pull a model:
   ```bash
   ollama pull qwen3:8b
   curl http://localhost:11434/api/tags   # confirm it is up
   ```
3. Configure secrets (optional but recommended):
   ```bash
   cp .env.example .env    # then edit:
   # GITHUB_TOKEN   optional — raises API rate limit 60 -> 5000/h
   # OLLAMA_MODEL   default qwen3:8b
   # OLLAMA_HOST    default http://localhost:11434
   ```
4. Create a GitHub repo for this folder and push it (first deploy):
   ```bash
   git init && git add -A && git commit -m "feat: initial portfolio + agent"
   git remote add origin git@github.com:Sailesh3000/<repo>.git
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
| push fails in scheduled runs | Run `git push` manually once; check remote/auth |
| section missing on site | Did you rerun `node scripts/generate-config.js` after editing JSON? |

## Manual verification checklist

```bash
node scripts/generate-config.js        # regenerate, open index.html locally
node agent/github.js                   # lists repos vs state.json
node agent/medium.js                   # parses live feed
node agent/ollama.js --generate        # end-to-end LLM connectivity check
node agent/poll.js --dry-run           # full pipeline preview, writes nothing
```
