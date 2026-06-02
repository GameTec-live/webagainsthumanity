# Web Against Humanity

A private browser-based party card game for people with questionable taste.

aka. Cards Against Humanity online.

## Local development

Requires [Bun](https://bun.sh/) and Node.js 20 or newer.

```bash
bun install
bun run dev
```

The Cloudflare Vite plugin starts the SPA and local Worker runtime together.

## Deploy

Authenticate with Cloudflare once:

```bash
bunx wrangler login
```

Deploy the game:

```bash
bunx wrangler deploy
```

## Commands

```bash
bun run test
bun run lint
bun run typecheck
bun run build
bun run preview
```