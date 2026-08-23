# RastrackDash student self-host template

`nod-rastrackdash-wpp` is a self-hosted, multi-tenant dashboard for agencies that run WhatsApp lead campaigns with Meta Ads. It brings together campaign performance, WhatsApp leads, conversion events, and operational diagnostics.

## Status

**G4 code landed.** This public student template is a sanitized export of the private WppTrack codebase. PalmUP's license server remains private; no PalmUP license server, Guru, or Asaas billing integration is included in this repository. A license **client** is planned for F4.

## Quick start

Prerequisites: Node.js 20+, pnpm, Docker, and Docker Compose.

```bash
pnpm install
docker compose up -d postgres redis
cp .env.example .env
pnpm --filter @wpptrack/api prisma:generate
pnpm --filter @wpptrack/api exec prisma migrate dev --schema prisma/schema.prisma
```

Start the API and web app in separate terminals:

```bash
pnpm --filter @wpptrack/api dev
pnpm --filter @wpptrack/web dev
```

The web app runs at `http://localhost:3000` and the API at `http://localhost:3333` by default.

## Bring your own services

- SMTP provider for email delivery
- Uazapi instance for WhatsApp connectivity
- Meta System User access token, configured manually

## Security

- Never commit your `.env` file.
- Replace and rotate every `replace-me-*` placeholder before deploying.
- Keep service credentials and Meta tokens on the server; do not expose them to the frontend.

## Documentation

- [Student edition design spec](docs/superpowers/specs/2026-08-19-nod-rastrackdash-wpp-student-edition-design.md)
- [Implementation plan](docs/superpowers/plans/2026-08-19-rastrackdash-student-edition-implementation.md)
- [Guide for AI agents](docs/AI_AGENTS.md)
- [Setup guides](docs/setup/README.md)
- [Customization guide](docs/CUSTOMIZATION.md)
