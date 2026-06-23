# Andy Agentic — Frontend

Angular 19 single-page application for the Andy Agentic platform. Authenticates
users via Microsoft Entra (MSAL), streams chat over Server-Sent Events,
subscribes to RAG progress over SignalR, and renders rich markdown (Mermaid +
Prism + clipboard) for chat messages.

> See `../ARCHITECTURE.md` for the system-level view and
> `../IMPROVEMENT_PLAN.md` for the active roadmap. This README focuses on the
> frontend project specifically.

## Tech stack

- **Angular 19.2** (NgModule-based, not standalone components)
- **MSAL Angular 4** for Entra ID authentication
- **SignalR client 10** for the `/documentRagHub` connection
- **TailwindCSS 3** + `@tailwindcss/forms` + `@tailwindcss/typography`
- **Angular Material 19** for a small set of widgets
- **ngx-markdown** + **marked** + **Prism** + **Mermaid** for chat rendering
- **RxJS 7**
- **Jest** + **jest-preset-angular** for unit tests

## Prerequisites

- Node 20+ (`.nvmrc` will be added once the team standardises on a version)
- npm 10+
- A running backend at the URL you configure in `assets/config.json`

## Run it

```bash
cp src/assets/config.sample.json src/assets/config.json
# edit src/assets/config.json — see "Runtime configuration" below
npm ci
npm start                           # http://localhost:4200
```

`npm start` is wrapped in a small shell to free port 4200 if a stray dev
server is still bound — see the `scripts` section of `package.json`.

## Available scripts

| Command                  | Purpose                                                  |
|--------------------------|----------------------------------------------------------|
| `npm start`              | Dev server with HMR on port 4200                         |
| `npm run build`          | Production build to `dist/agentic-app/`                  |
| `npm run watch`          | Dev build, watching                                      |
| `npm test`               | Jest unit tests                                          |
| `npm run test:ci`        | Jest with `--ci --coverage --maxWorkers=50%`             |
| `npm run test:watch`     | Jest in watch mode                                       |
| `npm run lint`           | ESLint (`@angular-eslint`, `@typescript-eslint`)         |

> There is **no** `e2e` script today; the historical mention in older docs
> was aspirational. See `../IMPROVEMENT_PLAN.md` §3.2 for plans.

## Runtime configuration

Settings are loaded at startup from **`src/assets/config.json`** (served as
`/assets/config.json`). The same build is shipped to every environment;
only this file differs per deployment. Angular `environment.ts`
file-replacements are intentionally **not** used.

`src/assets/config.sample.json` shows the expected shape:

```json
{
  "production": true,
  "apiUrl": "https://your-api-host.example/api",
  "signalRUrl": "https://your-api-host.example/documentRagHub",
  "azureAd": {
    "clientId": "your-app-registration-client-id",
    "tenantId": "your-tenant-id",
    "redirectUri": "https://your-spa-host.example",
    "scope": "api://your-api-app-id/Api.Access"
  }
}
```

Loading is gated by `APP_INITIALIZER` (`AppConfigService.load()` in
`src/app/core/config/`), which runs *before* the MSAL `IPublicClientApplication`
is constructed. If the file is missing or malformed, bootstrap throws — the
console will show "Failed to load assets/config.json".

## Auth model

1. `AuthGuard` runs on every protected route; it asks `AuthService` whether
   MSAL has an active account.
2. If not, the guard redirects to `/login`, which kicks off an MSAL
   `loginRedirect()` against the tenant from `config.json`.
3. `AuthInterceptor` (`src/app/core/interceptors/auth.interceptor.ts`) calls
   `acquireTokenSilent({ scopes: [config.azureAd.scope] })` for every
   outgoing API request and attaches the bearer token.
4. `WriteRoleGuard` additionally protects routes that mutate data; it
   inspects the `Api.Write` role claim.
5. The backend `/api/auth/sync` endpoint is called on first sign-in to
   upsert the user row.

## Project structure

```
FrontEnd/
├── angular.json
├── tailwind.config.js
├── tsconfig*.json
├── jest.config.cjs
├── setup-jest.ts
├── .eslintrc.json
├── .prettierrc
├── Dockerfile
├── docker-compose.yml
├── devops/
│   └── azure-pipeline.yml
└── src/
    ├── main.ts                          bootstraps AppModule
    ├── styles.css                       Tailwind layer imports
    ├── assets/
    │   ├── config.json                  ← per-env runtime config (not committed for real values)
    │   ├── config.sample.json
    │   ├── agentic-mark.svg
    │   └── prism-config.js
    └── app/
        ├── app.module.ts                root NgModule (APP_INITIALIZER chain)
        ├── app-routing.module.ts        route table + guards
        ├── app.component.{ts,html,css}
        ├── core/
        │   ├── auth/
        │   │   ├── auth.module.ts       MSAL provider wiring
        │   │   ├── services/            AuthService
        │   │   ├── guards/              AuthGuard
        │   │   └── components/          Login / Logout / UserProfile
        │   ├── config/                  AppConfigService + model
        │   ├── interceptors/            AuthInterceptor (bearer token)
        │   ├── guards/                  ApiStatusGuard, WriteRoleGuard
        │   └── services/                api, agent, chat, llm, tool, document,
        │                                signalr, tag, notification, theme,
        │                                copy, markdown, role, api-status
        ├── features/
        │   ├── agents/                  list + form + detail
        │   ├── tools/                   list + form + detail
        │   ├── llm/                     list + form + detail
        │   ├── chatbot/                 streaming chat UI (needs decomposition)
        │   └── orchestration/
        ├── shared/
        │   ├── components/              notification-toast, theme-toggle,
        │   │                            loading-overlay, tool-execution-{display,summary}
        │   └── pipes/                   role pipes
        ├── layout/
        │   ├── app-header/
        │   └── app-sidebar/
        └── models/                      TS interfaces
```

## Build budgets

`angular.json` ships with `initial` warning 6 MB / error 10 MB. This is
generous — `IMPROVEMENT_PLAN.md` §5.5 tracks tightening these and
lazy-loading Mermaid + Prism.

## Running with Docker

```bash
docker-compose up -d --build       # Nginx serves the built SPA on port 80
```

For production deployments the Nginx config should set `Cache-Control:
no-store` on `/assets/config.json` and `immutable` on hashed bundles. The
current image uses the stock Nginx config — adequate for hash-routed Angular
but not optimised.

## Contributing

- Stick to Angular's lint rules — `npm run lint` must pass.
- Run `prettier` (it's hooked via `lint-staged` once Husky is installed —
  see `../IMPROVEMENT_PLAN.md` §3.6).
- Add a Jest spec for every new service. Today the project has effectively
  no test coverage; new code should not make that worse.
- Follow the existing folder convention: feature modules under
  `src/app/features/`, cross-cutting code under `src/app/core/`, reusable
  UI under `src/app/shared/`.

## License

Apache License 2.0 — see `../Backend/LICENSE`.
