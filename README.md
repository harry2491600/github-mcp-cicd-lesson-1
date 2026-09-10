# CA Buddy

CA Buddy is a single-screen React application that gives Indian small-business owners
plain-language first explanations for everyday GST, TDS, ITR deadlines, and audit-basics
questions. It is general information, not professional tax advice.

## Local development

Prerequisites: Node.js 22.22.2 and npm 10.9.7, or a compatible Node.js 22.12+
environment.

```bash
npm install
cp .env.example .env.local
npm run dev
```

To start the app with the repository runner, use `./run.sh`. This project has no
separate backend process; Gemini requests are made by the browser. If a `backend` npm
script is added later, `run.sh` starts it alongside Vite. A custom backend can be
started with `BACKEND_COMMAND="..." BACKEND_DIR="..." ./run.sh`.

For live local answers, replace the placeholder in `.env.local` with a Gemini API key
restricted to the Gemini API and the local or deployed site origin. The direct browser
architecture exposes a `VITE_` value in the built application, so do not use an
unrestricted key and do not commit `.env.local`.

## Validation commands

```bash
npm install
npm run test:unit
npx playwright install chromium
npm run test:e2e
npm run build
npm run preview
```

Unit tests use the deterministic fake service. Playwright tests intercept every Gemini
request and do not require a live key or provider quota.

## Privacy and scope

Messages live only in the current browser memory. CA Buddy does not use login, saved
history, browser storage, a database, or a server-side session. New chat clears the
visible messages and the context sent to Gemini. Unsupported topics and
business-specific filing decisions receive a recommendation to consult a Chartered
Accountant.

## GitHub Actions and Pages

Pushes and pull requests run the unit and Playwright jobs in
`.github/workflows/test.yml`. A push to `main` runs the same required checks in
`.github/workflows/deploy.yml`; its deployment job has `needs: [unit, e2e]` and publishes
the `dist/` artifact through the official GitHub Pages Actions.

Before the first deployment:

1. Enable GitHub Pages with GitHub Actions as the publishing source.
2. Add a repository secret named `VITE_GOOGLE_API_KEY` containing a restricted Gemini
   key.
3. Keep the `github-pages` environment available for the deployment job.

Workflow steps never print the key. Remember that a browser-exposed key is not a server
secret; restrict, monitor, and rotate it according to the provider's controls.
