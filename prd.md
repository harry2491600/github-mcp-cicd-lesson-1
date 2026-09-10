# CA Buddy PRD

## One paragraph
CA Buddy is a simple, single-screen chatbot for small-business owners in India who need quick answers to everyday GST, TDS, ITR deadline, and audit-basics questions. It gives plain-language guidance within a defined scope, keeps context during the current conversation, and clearly tells the user when to consult a Chartered Accountant.

## User
The user is an Indian small-business owner who wants a fast first explanation of a tax or audit topic before deciding whether professional help is needed.

## Happy path (this is the three-minute demo)
1. Open CA Buddy and see the header, chat panel, message input, New chat button, and one-line disclaimer.
2. Ask an everyday question such as, "What is TDS and when does it usually apply?" and receive a concise, plain-language answer.
3. Ask a follow-up that depends on the first question; the answer uses the current conversation context.
4. Ask for a personalized filing decision or a question outside the supported scope; CA Buddy explains the limit and says to consult a CA.
5. Select New chat; the visible conversation and conversation context reset, with no history saved.

## Out of scope
Login, saved history, settings, a backend, a server, a database, tax filing or submission, personalized professional advice, and any topic outside everyday Indian GST, TDS, ITR deadlines, and audit basics.

## Architecture
- Design: modern, attractive and simple. One screen: a header, one chat panel, an input, a "New chat" button, a one-line disclaimer. No login, no saved history, no settings.
- Frontend only. React + TypeScript + Vite. No backend, no server, no database. The browser calls Google Gemini directly through LangChain.js (@langchain/google-genai). The API key is read from VITE_GOOGLE_API_KEY — a local .env during development, a GitHub Actions secret when built in CI.

The React screen owns transient input and messages. A ChatService interface separates the UI from the model, with a LangChain + Gemini implementation for the browser and a fake implementation for unit tests. The current message list is the conversation memory; New chat clears it.

## Functional requirements FR-1 to FR-8
- **FR-1:** The first screen shows exactly the CA Buddy header, one chat panel, one message input, a New chat button, and a one-line disclaimer; a UI test can locate each element.
- **FR-2:** Entering a non-empty message and submitting it adds the user message to the chat and renders the returned assistant response.
- **FR-3:** The UI calls ChatService for each submitted message, and the production service sends the request directly to Google Gemini through LangChain.js.
- **FR-4:** Questions about everyday Indian GST, TDS, ITR deadlines, or audit basics receive an answer in plain language without pretending to replace professional advice.
- **FR-5:** A question outside that scope, or one requiring individualized professional judgment, receives a clear "consult a CA" fallback.
- **FR-6:** The one-line disclaimer is visible on the single screen while the user chats.
- **FR-7:** Follow-up messages include the current conversation context; selecting New chat clears the messages and context, and no history is saved.
- **FR-8:** The browser reads the Gemini API key from VITE_GOOGLE_API_KEY and does not use a hard-coded key.

## The model (provider, model name, where the system prompt lives, max tokens)
Provider: Google Gemini through LangChain.js (@langchain/google-genai). Model name: gemma-4-26b-a4b-it. The system prompt lives in src/prompts/ca-system-prompt.ts and defines the CA persona, supported scope, plain-language behavior, consult-a-CA fallback, and disclaimer. Max tokens: 512.

## Quality gates
- Testing: unit tests (Vitest + Testing Library) with the model faked; end-to-end tests (Playwright) with the Gemini request intercepted; both run in GitHub Actions on every push and pull request.
- Deployment: GitHub Pages through GitHub Actions. Tests must pass before anything deploys.

## The five tasks
- Exactly five tasks build the whole app, in this order, one GitHub issue and one pull request each:

  1. Chat UI shell, unit tests, and the CI workflow that runs them.

  2. ChatService interface; LangChain + Gemini implementation; a fake implementation for tests.

  3. The CA persona: system prompt in a file, scope rules, "consult a CA" fallback, disclaimer, conversation memory.

  4. Playwright end-to-end tests with the Gemini call intercepted, wired into CI.

  5. GitHub Pages deployment, gated on all tests passing.

## Acceptance walkthrough
Open the app, verify the single-screen layout and disclaimer, submit an in-scope GST, TDS, ITR deadline, or audit-basics question, and confirm that a response appears. Submit a contextual follow-up and confirm that the answer retains the current conversation. Submit an out-of-scope or individualized question and confirm that the response says to consult a CA. Select New chat and confirm that the messages and context are gone. Finally, verify that the push and pull-request workflows pass the fake-model unit tests and intercepted-Gemini Playwright tests before the GitHub Pages deployment job runs.
