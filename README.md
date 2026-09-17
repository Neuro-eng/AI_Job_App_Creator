# AI Job Application Generator

Paste a CV + a job description → get back an ATS-tailored CV, a cover letter,
a skills-gap analysis, and likely interview questions. Built with Next.js and
the Claude API.

## What this costs to run

- **Hosting (Vercel):** $0 — free tier covers this easily at low traffic.
- **AI generation (Google Gemini API):** genuinely free — no credit card,
  no trial period that expires. Using the Gemini 2.5 Flash model (already
  set in the code), the free tier allows roughly 1,500 generations per day
  before any limit kicks in, which is far more than a new site needs.
- **Domain:** optional. You can launch on the free `your-project.vercel.app`
  URL before buying anything.

So: **genuinely $0 to launch and $0 to run**, at least until your traffic
grows well beyond what any new site sees in its first months. Two things
worth knowing about the free tier: Google may use free-tier prompts/outputs
to improve their models (their paid tier doesn't do this), and if you ever
outgrow the daily limit, upgrading just means enabling billing on the same
Google account.

## Deploy it in 15 minutes (no coding required)

1. **Create a free GitHub account** at github.com if you don't have one.
2. **Create a new repository** and upload all the files in this folder to it
   (drag-and-drop works on github.com, or use `git push` if you're
   comfortable with git).
3. **Get a free Gemini API key**: go to aistudio.google.com/apikey, sign
   in with any Google account, click "Create API key." No credit card,
   no payment info, nothing to add — copy the key it gives you.
4. **Create a free Vercel account** at vercel.com, sign in with GitHub.
5. Click **"Add New Project"**, select your repository, and click **Deploy**.
6. In the Vercel project settings, go to **Environment Variables** and add:
   - `GEMINI_API_KEY` = the key you got from Google AI Studio
7. Redeploy (Vercel does this automatically after you add the variable, or
   click "Redeploy" manually).
8. Your site is now live at `your-project-name.vercel.app`.

Every time you push a change to GitHub, Vercel rebuilds and redeploys
automatically — no manual server work.

## What this MVP does NOT include yet (on purpose)

This version is deliberately simple so you can launch fast and validate
whether people want it, before spending more time:

- **No login/accounts** — every visitor can generate freely right now.
- **No payment wall** — everything is free in this version.
- **No usage limits** — nothing stops someone from generating 100 times.
- **No file upload parsing** — users paste CV text rather than uploading a
  PDF/Word file.

## Suggested next steps, once you see real usage

Only build these once people are actually using the free version —
building them first is wasted effort if nobody wants the tool:

1. **Add a usage limit** so costs don't run away: track generations by
   browser (localStorage) or by email, and cap free use at e.g. 2/day.
2. **Add Supabase** (free tier) for accounts and to store a `generations`
   count per user.
3. **Add Stripe Checkout** for a paid tier (unlimited generations, or a
   premium template) — Stripe's hosted checkout means no custom payment
   UI to build.
4. **Add PDF/docx upload parsing** so users don't have to copy-paste.
5. **Add PDF export** of the generated CV/cover letter instead of plain
   text download.

## Realistic expectations

- This tool can run with **zero people paying you anything indefinitely**.
  Income only starts once real people find it, trust it, and prefer it
  over free alternatives — that takes marketing effort, not code.
- Start free, get feedback, and only add payment once you have evidence
  people value it enough to pay.
