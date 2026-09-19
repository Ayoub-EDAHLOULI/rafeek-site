# Rafeeq Site

Marketing and documentation site for [Rafeeq](https://github.com/Ayoub-EDAHLOULI/rafeeq-desktop), a fully offline desktop AI assistant. Built with Next.js (App Router) and deployed on Vercel.

## Pages

- **Home** — product overview and hero
- **Features** — chat, model manager, code help, document Q&A, RAG, sessions, offline verification
- **Download** — standard and bundled-model build variants
- **Docs** — getting started guide

## Internationalization

The site is available in 6 languages via [`next-intl`](https://next-intl.dev), with URL-prefixed routes (`/en`, `/fr`, `/es`, `/de`, `/ar`, `/zh`):

- English (default)
- French
- Spanish
- German
- Arabic (right-to-left layout)
- Chinese

Translation files live in [`messages/`](messages/), one JSON file per locale. Routing config is in [`src/i18n/routing.ts`](src/i18n/routing.ts).

## Design tokens

Colors and theming reuse the same design tokens as the desktop app (brand blue `#1d63ed` light / `#0a84ff` dark), defined in [`src/app/[locale]/globals.css`](src/app/%5Blocale%5D/globals.css) using Tailwind v4's `@theme` syntax, with light/dark variants keyed on `prefers-color-scheme` and a manual `data-theme` override.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it redirects to the default locale (`/en`).

## Scripts

- `npm run dev` — start the dev server (Turbopack)
- `npm run build` — production build
- `npm run start` — serve the production build
- `npm run lint` — run ESLint

## Deployment

The site deploys to [Vercel](https://vercel.com). Pushing to the main branch triggers a production deploy.
