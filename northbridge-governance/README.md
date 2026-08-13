# AI Governance Readiness Assessment — Northbridge (Portfolio Demo)

A five-question, industry-branched (BFSI / Healthcare) regulatory exposure
quiz built as a Next.js App Router page. Scores a fictitious enterprise's AI
governance posture, models a directional dollar exposure figure, renders a
radar chart of risk categories, and gates a "request a demo" lead form behind
the completed report.

**Northbridge is a fictitious company.** This project is a portfolio and
educational demonstration only. All exposure figures, scores, and
recommendations are illustrative — see the in-app disclaimer.

Built by **Kartikeya Awasthi** · © 2026

## What changed in this pass (portfolio rebrand)

- **Rebranded end-to-end** — Synthetix Labs → Northbridge, throughout the
  topbar wordmark, report copy ("Where Northbridge closes your governance
  gaps"), gap-card labels ("Northbridge guardrail"), CTA copy, page metadata,
  and `package.json`.
- **Both HubSpot integrations removed.** The original had two:
  1. A **silent submission log** that POSTed every completed assessment to a
     second HubSpot form — full Q&A, score, and exposure figure — *before the
     visitor ever saw the lead-capture form or agreed to anything.* This has
     been deleted outright rather than swapped for another backend; a
     portfolio demo shouldn't replicate a track-without-consent pattern.
  2. The **visible "Request my demo" form**, which posted to HubSpot's Forms
     API. This now relays to `awasthikartikeya92@gmail.com` via FormSubmit
     instead — see "Form submissions" below. This is the *only* thing that
     leaves the browser, and only when the visitor explicitly submits it.
- **Footer** now carries `© 2026 Northbridge · Designed & developed by
  Kartikeya Awasthi`, a contact link, and a disclaimer paragraph (fictitious
  company, portfolio/educational only, not affiliated with any real
  organization) alongside the original methodology note.
- **Header** gets a small "Portfolio demo" pill next to the existing
  "Governed Agentic Execution" tag.
- **Cleaned up the project structure.** The original zip had duplicate
  `page.jsx` / `layout.jsx` / `AssessmentApp.jsx` / `governance-assessment/page.jsx`
  files sitting at the repo root, outside `app/` — Next.js App Router only
  reads from `app/`, so those were dead weight (and confusing to open). This
  version keeps only the working `app/` tree.

## Form submissions

The "Request my demo" form relays to `awasthikartikeya92@gmail.com` via
[FormSubmit](https://formsubmit.co) — a free, no-account AJAX relay, no
server or API key involved. The email includes the visitor's contact details
plus their risk score, estimated exposure, and the full question-by-question
report (`serializeAnswers()` builds this).

**One-time activation (required):**

1. Deploy the site (FormSubmit needs a real `http(s)` origin — `next dev` on
   `localhost` or a deployed Vercel URL both work; opening the built HTML
   directly via `file://` will not)
2. Submit the form once with any details
3. FormSubmit emails `awasthikartikeya92@gmail.com` a confirmation link —
   click it
4. Every submission after that arrives silently

**Optional hardening.** That confirmation email includes a hashed endpoint
URL. Swap it in to keep the raw address out of the client bundle:

```js
// app/AssessmentApp.jsx — near the top
const LEAD_ENDPOINT = "https://formsubmit.co/ajax/YOUR_HASHED_TOKEN";
```

If the relay is unreachable, the form falls back to opening the visitor's own
mail client with the report pre-filled, so a submission is never silently
lost.

## Running locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` — it redirects to `/governance-assessment`.

## Deploying to Vercel

1. Push this folder to GitHub
2. Vercel → **New Project** → import the repo
3. Framework preset: **Next.js** (auto-detected). No config needed.
4. Deploy, then complete the FormSubmit activation step above.

## Files

```
app/
  layout.jsx                      Root layout, page metadata
  page.jsx                        Redirects "/" -> "/governance-assessment"
  governance-assessment/page.jsx  Route entry, per-page metadata
  AssessmentApp.jsx                Everything else: questions, scoring,
                                    radar chart, report, lead form, styles
package.json
next.config.js
```

## How the scoring works

Each track (`BFSI`, `HEALTHCARE`) has 5 scenario questions in `QUESTIONS`,
each option worth 1–3 points (governed → high-vulnerability). `computeResults()`
turns total points into a 0–100 risk score, a per-category radar breakdown,
and a directional exposure figure built from `EXPOSURE` base rates scaled by
that same factor. None of the dollar bases are sourced benchmark data — they're
illustrative planning inputs, labelled as such in the report and footer.
