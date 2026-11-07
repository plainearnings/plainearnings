# Plain Earnings

Earnings reports, in plain English. Interactive charts that trace each dollar from revenue to net profit, written for learners — not investors.

## How this repo works

- `site/` is the entire website. GitHub Pages publishes it via the workflow in `.github/workflows/pages.yml` (Settings → Pages → Source must be "GitHub Actions").
- Content layout inside `site/`:
  - `index.html` — landing page (search, popular companies, subscribe)
  - `feed.xml` — site-wide RSS feed (per-company feeds live beside each company)
  - `assets/` — shared CSS and the interactive chart engine
  - `earnings/{company}/index.html` — a company's page (latest quarter + history)
  - `earnings/{company}/{quarter}/index.html` — one quarter's interactive earnings page
  - `earnings/{company}/{quarter}/data.json` — that report's source data (the single source of truth; HTML is generated from it)
  - `earnings/{company}/{quarter}/chart.png` — the static chart, used as the share image
- New reports arrive as pull requests. Merging a PR publishes it.

Educational only — not financial advice.
