# NNP Christian Union Website

The site is a static HTML, CSS, and vanilla JavaScript website with Vercel serverless routes for selected forms and the chatbot.

## Documentation

- [docs/WEBSITE_AUDIT.md](./docs/WEBSITE_AUDIT.md) — full technical, architectural, functional, and operational audit of the repository.

## File map

- `index.html` — homepage, events, contact and membership forms, and chatbot.
- `header.html`, `footer.html`, `js/components.js` — shared site chrome and form wiring.
- `library.html`, `ministry.html`, `gallery.html`, `contact.html` — supporting pages.
- `js/` — page-specific event, contact, gallery, library, and ministry behavior.
- `js/app.js` — homepage interactions and chatbot.
- `api/chat.js` — server-side OpenAI proxy.
- `api/submit.js` — ministry enrollment proxy to Google Apps Script.
- `api/youtube.js` — selects the current NNPCU Media live stream or latest public upload.
- `register_member.php` — standalone PHP/MySQL registration handler; no references were found in this repository.
- `*.css` — page and shared stylesheets.
- `sitemap.xml`, `robots.txt` — search engine crawl configuration.

## Run locally

For static page preview, run `python -m http.server 8000` from the repository root and visit `http://localhost:8000`. Static preview does not provide `/api` routes.

To exercise Vercel routes, install the Vercel CLI and run `vercel dev`. Set the environment variables listed below in the local Vercel environment; do not put credentials in source files.

## Deploy

Connect the repository to the Vercel project and deploy the reviewed branch through the project workflow. Configure the required environment variables in the Vercel project settings before enabling the chatbot. The PHP registration handler requires a PHP-capable host and database configuration; its hosting and deployment path are for the owner to confirm.

## Environment variables

Names only:

- `OPENAI_API_KEY`
- `YOUTUBE_API_KEY`
- `DB_HOST`
- `DB_USER`
- `DB_PASS`
- `DB_NAME`

`.env.example` is a names-only template. Never commit populated environment files.

## Forms and external services

- The homepage contact and membership forms submit to Formspree.
- The shared header membership form submits to Google Apps Script.
- Ministry enrollment passes through `/api/submit` to Google Apps Script.
- The gallery reads image listings through the GitHub contents API.
- Chatbot AI requests pass through `/api/chat`; chat history is stored in the visitor's browser.
- The homepage livestream checks the `@nnpcumedia` YouTube channel for a live broadcast, then falls back to its latest public embeddable upload. Enable YouTube Data API v3 and set `YOUTUBE_API_KEY` in Vercel project environment variables; restrict the key to that API and keep it server-side. The endpoint is cached for 20 minutes to limit API quota use.
- RSVP entries are stored on the visitor's device unless an owner-configured endpoint is supplied.
- Library borrow and suggestion requests are not sent by default. Configure a verified service before claiming receipt.
- `register_member.php` requires a separately configured MySQL-compatible database and currently has no detected in-repository callers.

## Known TODO(owner) items

- Revoke the exposed OpenAI key, create a replacement, and set `OPENAI_API_KEY` in Vercel.
- Rotate the previously committed database credential; set `DB_HOST`, `DB_USER`, `DB_PASS`, and `DB_NAME` on the PHP host.
- Confirm each ministry's verified contact email in `ministry.html`.
- Confirm the exact Mission event date and replace stale event listings with owner-approved current events.
- Confirm the general contact email in `contact.html`.
- Supply verified Facebook, Instagram, YouTube, and WhatsApp details for `footer.html`.
- Supply a real analytics measurement ID before enabling analytics in `index.html`.
- Decide whether RSVP, library borrowing, and book suggestions should connect to real services; configure their endpoint constants only after verification.
- Provide verified library contact details for the no-endpoint borrow and suggestion messages.
- Review `docs/PRIVACY_DRAFT.md` with the owner and legal counsel.
