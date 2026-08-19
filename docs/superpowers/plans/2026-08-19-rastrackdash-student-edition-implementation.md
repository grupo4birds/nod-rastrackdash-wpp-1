# RastrackDash Student Edition - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar o RastrackDash (edicao aluno): license server + notificacoes no WppTrack (`dash-com-ia`), template publico sanitizado em `nod-rastrackdash-wpp`, client de licenca, multi-provider WhatsApp, backoffice simplificado, whitelabel e docs AI-first.

**Architecture:** Dois repositorios. `dash-com-ia` (privado) hospeda license server, webhook Guru, admin de licencas, notificacoes e broker NOD API. `nod-rastrackdash-wpp` (publico) e o template sanitizado que o aluno clona: multi-tenant, Meta manual, providers WhatsApp BYO + client de licenca, sem secrets PalmUP. Publicacao do template e um processo de sanitizacao + secret scan, nao um fork continuo automatico.

**Tech Stack:** pnpm monorepo, Next.js 15, NestJS, Prisma, PostgreSQL, Redis, BullMQ, Zod, Vitest, Ed25519 (cache de licenca), Guru webhooks, SMTP/Brevo (e-mail), Uazapi (WhatsApp admin PalmUP + BYO aluno).

**Spec:** `docs/superpowers/specs/2026-08-19-nod-rastrackdash-wpp-student-edition-design.md` (APROVADA 2026-08-19)

## Global Constraints

- Spec aprovada pelo Samuel; nao reabrir decisoes fechadas sem gate humano.
- Zero secrets no frontend; backend-only para tokens Meta/Uazapi/WAHA/Z-API/NOD/Asaas/Guru/license private key.
- License server e notificacoes **nunca** vao para o repo publico.
- Soft-lock padrao; hard-lock so fraude confirmada via admin PalmUP.
- 1 licenca = 1 conta (enforced); instancias do mesmo aluno ilimitadas (telemetria).
- Assinatura anual (`interval=annual`, `expiresAt`); renovacao estende a mesma License.
- Grace 72h em falha de heartbeat; revogacao confirmada sobrescreve cache.
- Footer residual fixo: `{Agencia} · RastrackDash · powered by PalmUP`.
- Docs AI-first (AGENTS.md/CLAUDE.md + prompt de partida).
- Commit/push/migration/deploy/publicacao publica = gates humanos separados do Samuel ("autorizado").
- Fail-closed + checklist Mano Deyvin em auth/licenca/webhooks.
- Idioma do codigo/docs: PT-BR no padrao do repo (sem acentos obrigatorios no corpo tecnico).
- Nao misturar com branch `feat/xmax-unified-conversions` sem decisao explicita na Fase 3.

## Defaults adotados ate Samuel sobrescrever

| # | Tema | Default no plano |
|---|---|---|
| 1 | Webhook Guru assinatura | Shared secret header na v1 de dev; confirmar mecanismo oficial Guru antes de prod |
| 2 | Algoritmo cache licenca | **Ed25519** assimetrico |
| 3 | Cadencia release template | Sob demanda, no maximo mensal |
| 4 | URLs afiliado VPS | Placeholders `[AFILIADO_HOSTGATOR|DIGITALOCEAN|CONTABO]` |
| 5 | NOD API modelagem | Entitlement na mesma License: `nodApiEnabled` + `nodApiExpiresAt` (add-on), cobranca Asaas R$20 operada na PalmUP |
| 6 | WhatsApp notificacao PalmUP | Instancia **Uazapi administrativa dedicada** da PalmUP (nao broker NOD no dia 1) |
| 7 | Sizing VPS | Ver secao **VPS sizing (pesquisa)** abaixo + `docs/setup/vps.md` (nao usar numeros aleatorios) |
| 8 | Aviso desconexao WhatsApp | **Implementar primeiro no WppTrack (`dash-com-ia`)** em producao; portar para o template na F5. Nao bloquear F1 |

## VPS sizing (pesquisa) — substitui faixas aleatorias

### Evidencia Dokploy (oficial)
Fonte: [Dokploy Installation Requirements](https://github.com/Dokploy/website/blob/main/apps/docs/content/docs/core/installation.mdx)

> server should have at least **2GB of RAM** and **30GB of disk space** … handle resources consumed by Docker during builds and prevents system freezes.

Isso e o **piso do PaaS Dokploy sozinho** (painel + Docker/Traefik + builds), **nao** o piso confortavel do app completo.

### Evidencia stack RastrackDash/WppTrack
- API NestJS (Node 22) + Prisma
- PostgreSQL 16 + Redis 7 + BullMQ (e-mail, meta sync, webhooks, CAPI…)
- Build Docker/pnpm no host = pico de RAM/CPU no deploy
- Web Next preferencialmente na **Vercel** (VPS fica API+DB+Redis+Dokploy)

### Carga 500 leads/dia (ordem de grandeza)
- 500/dia ≈ 0,35 lead/min media; o problema real sao **bursts de campanha** + **builds** + **sync Meta**
- Cada lead: webhook → parse → Postgres → regras → possivel CAPI enqueue
- Em regime baixo/medio, gargalo tipico e **RAM + I/O de build**, nao CPU media sustentada

### Faixas oficiais deste plano

| Perfil | Quando | Spec |
|---|---|---|
| Piso Dokploy (referencia) | so instalar Dokploy | 2 GB RAM / 30 GB disco |
| **Minima do produto** | 1–5 workspaces, ate ~500 leads/dia, web na Vercel | **2 vCPU / 4 GB RAM / 60–80 GB SSD** |
| **Recomendada** | 5–20 workspaces, ate ~5k leads/dia | **4 vCPU / 8 GB RAM / 120–160 GB SSD** |
| **Alta** | 20+ workspaces ou picos sustentados | **4–8 vCPU / 16 GB RAM / 200 GB+** |
| Evitar | qualquer perfil com app | 1 GB RAM / disco lento |

Detalhamento e checklist: `docs/setup/vps.md` no repo publico.

## Aviso de desconexao WhatsApp (produto WppTrack → depois template)

**Pedido do Samuel (revisao do plano):** o usuario cadastra um telefone para ser avisado quando o WhatsApp (NOD API / Uazapi) desconectar, para reconectar.

**Decisao de ordem (aprovada na revisao):**
1. **Implementar primeiro no `dash-com-ia` (WppTrack em producao para cliente)** — branch propria de produto, fora do trilho F1 license se necessario.
2. **Depois portar** para o RastrackDash no momento da F5 (multi-provider) / sanitizacao, reaproveitando o mesmo desenho.
3. Nao atrasa F1 (license server). Fica como **trilha paralela de produto WppTrack** + item explicito de porte na F5.

Escopo minimo quando for implementado no WppTrack:
- Campo(s) de telefone de alerta por workspace/instancia (opt-in)
- Detector de evento de desconexao (webhook Uazapi `connection` / status != connected)
- Debounce (nao spam a cada flap de QR)
- Envio WhatsApp (e opcional e-mail) para o numero cadastrado com link/instrucao de reconectar
- Secrets so backend; falha de envio nao derruba ingestao de leads
- Testes de debounce + idempotencia do alerta

## Scope Check

A spec cobre multiplos subsistemas. Este e um **plano mestre faseado**. Cada fase entrega software testavel sozinha. Nao executar fases seguintes sem aceite da anterior quando houver gate humano.

| Fase | Repo alvo | Entrega testavel | Executor |
|---|---|---|---|
| F0 Docs/repo | `nod-rastrackdash-wpp` | Spec+plano+README+VPS researched | Orquestrador / Claude docs |
| F1 License server | `dash-com-ia` | activate/heartbeat/webhook/admin | Codex backend |
| F2 Notificacoes chave | `dash-com-ia` | e-mail + WhatsApp delivery/reenvio | Codex backend |
| F3 Sanitizacao template | ambos | script export + secret scan + first code push | Codex + gate Samuel |
| F4 License client | `nod-rastrackdash-wpp` | estados ativo/grace/soft-lock | Codex backend + Claude UI |
| F5 WhatsApp multi-provider | ambos (broker no privado) | Uazapi/NOD/WAHA/Z-API + webhooks + **porte do aviso desconexao** | Codex backend |
| F6 Backoffice + whitelabel + AI docs | `nod-rastrackdash-wpp` | onboarding completo | Claude frontend + Codex |
| F7 Homologacao + tag v1.0.0 | ambos | matriz aceite spec §15 | Samuel + agentes |
| **P-WA** (paralela) | `dash-com-ia` WppTrack prod | aviso desconexao WhatsApp no produto cliente | Codex/Claude — **antes** do porte F5 |

## Gates humanos (Samuel)

- [ ] G1: commit/push F1-F2 em `dash-com-ia`
- [ ] G2: migration producao license tables em `dash-com-ia`
- [ ] G3: configurar webhook Guru (prod) apontando para license endpoint
- [ ] G4: primeiro push de **codigo** sanitizado para `nod-rastrackdash-wpp` publico
- [ ] G5: deploy producao API license/notificacao
- [ ] G6: cobranca real NOD API / Asaas add-on
- [ ] G7: tag `v1.0.0` e anuncio

---

## File Structure (alvo)

### dash-com-ia (privado) — novos

```txt
apps/api/src/licensing/
  licensing.module.ts
  licensing.controller.ts          # activate/heartbeat/public-key (public rate-limited)
  licensing.admin.controller.ts    # backoffice PalmUP
  licensing.service.ts
  license-crypto.service.ts        # Ed25519 sign/verify helpers (server signs)
  license-key.generator.ts
  guru-webhook.controller.ts
  guru-webhook.service.ts
  license-account-binding.service.ts
  dto/
  licensing.constants.ts
apps/api/src/notifications/        # ou estender apps/api/src/email + novo whatsapp-outbound
  license-notification.service.ts
  license-notification.processor.ts
  templates/license_key_delivery.*
apps/api/src/integrations/nod-api/ # broker NOD API autenticado por License
  nod-api.broker.controller.ts
  nod-api.broker.service.ts
apps/api/prisma/migrations/<ts>_licensing_foundation/
```

### nod-rastrackdash-wpp (publico) — apos F3

```txt
apps/api/src/license-client/       # so client
  license-client.module.ts
  license-client.service.ts
  license-state.service.ts         # tabela LicenseState local
  license-guard.ts                 # soft-lock writes
apps/api/src/integrations/
  uazapi/                          # BYO (sanitizado)
  waha/                            # novo adapter
  zapi/                            # novo adapter
  whatsapp-provider.registry.ts
apps/web/.../backoffice/license/
apps/web/.../branding/
docs/setup/
docs/CUSTOMIZATION.md
AGENTS.md
CLAUDE.md
scripts/setup.mjs
scripts/sanitize-from-wpptrack.mjs # vive no privado; output vai pro publico
```

---

# Fase 0 — Foundation docs/repo

**Repo:** `nod-rastrackdash-wpp`  
**Status parcial:** spec e README ja publicados.  
**Executor:** orquestrador / Claude docs  
**Gate:** nenhum critico

### Task 0.1: Status da spec = APROVADA

**Files:**
- Modify: `docs/superpowers/specs/2026-08-19-nod-rastrackdash-wpp-student-edition-design.md` (header Status)
- Modify: `README.md` (linkar plano quando existir)

- [ ] Garantir Status APROVADA no repo publico (sincronizar com copia local se necessario)
- [ ] Atualizar README com link do plano de implementacao
- [ ] Commit no repo publico (docs only) — pedir "autorizado" ao Samuel se ainda nao houver permissao aberta para docs

**Commit sugerido:** `docs: mark student edition spec approved and link implementation plan`

### Task 0.2: Esqueleto AI-first minimo

**Files:**
- Create: `AGENTS.md`
- Create: `CLAUDE.md` (pode apontar para AGENTS.md)
- Create: `docs/CUSTOMIZATION.md` (stub: o que e seguro editar)
- Create: `docs/setup/README.md` (indice dos guias futuros)

- [ ] Escrever AGENTS.md com: o que e RastrackDash, aluno vs cliente do aluno, stack, ordem de setup, proibicoes (nao commitar .env, nao remover footer)
- [ ] Incluir **prompt de partida** copiavel para Claude/Codex/Grok
- [ ] Nao inventar comandos de app que ainda nao existem; marcar "disponivel apos F3/F4"

**Aceite F0:**
- Repo publico tem spec aprovada + este plano + AGENTS.md basico
- Nenhum codigo de produto ainda (ok)

---

# Fase 1 — License server (`dash-com-ia`)

**Repo:** `dash-com-ia` (branch nova a partir de `main`, ex.: `feat/rastrackdash-licensing`)  
**Executor:** Codex backend  
**Gates:** G1 (push), G2 (migration prod)

### Task 1.1: Prisma models License*

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: migration `licensing_foundation`

**Modelos (campos minimos da spec §6.1):**
- `License`: id, keyHash, keyPrefix, buyerEmail, buyerName, guruTransactionId, productSku, interval, expiresAt, status, issuedAt, revokedAt, revokedReason, boundAccountEmail, boundAccountId, boundAt, nodApiEnabled, nodApiExpiresAt, createdAt, updatedAt
- `LicenseActivation`: id, licenseId, fingerprint, appVersion, deployLabel, firstActivatedAt, lastHeartbeatAt, lastHeartbeatStatus, ipAddress
- `LicenseWebhookEvent`: id, provider, eventType, externalTransactionId @unique, signatureValid, receivedAt, processedAt, resultStatus, rawPayloadSanitized

- [ ] Escrever teste de schema/migration smoke (prisma validate)
- [ ] Criar migration local (nao aplicar prod sem G2)
- [ ] Nunca persistir chave em texto puro apos emissao (so keyHash + keyPrefix para suporte)

**Commit sugerido:** `feat(api): add licensing prisma models`

### Task 1.2: Crypto Ed25519 + geracao de chave

**Files:**
- Create: `apps/api/src/licensing/license-crypto.service.ts`
- Create: `apps/api/src/licensing/license-key.generator.ts`
- Create: tests

- [ ] Gerar par Ed25519 em env: `LICENSE_SIGNING_PRIVATE_KEY` / `LICENSE_SIGNING_PUBLIC_KEY` (PEM ou base64)
- [ ] `signLicenseCache(payload) -> token`
- [ ] Payload: `{ licenseKeyHash, status, expiresAt, issuedAt, validUntil, iat, accountIdentityHash? }`
- [ ] `validUntil = now + 72h`
- [ ] Generator: formato `PALMUP-XXXX-XXXX-XXXX-XXXX` com entropia suficiente; armazenar so hash (sha256)
- [ ] Testes: sign/verify roundtrip; tamper fails; expired validUntil rejected pelo client helper

**Commit sugerido:** `feat(api): license key generation and ed25519 cache signatures`

### Task 1.3: LicensingService activate/heartbeat + binding

**Files:**
- Create: `apps/api/src/licensing/licensing.service.ts`
- Create: `apps/api/src/licensing/license-account-binding.service.ts`
- Create: `apps/api/src/licensing/dto/*.ts`
- Create: tests unitarios

**Regras:**
- activate(key, fingerprint, appVersion, accountIdentity, deployLabel?):
  - valida key -> license active e not expired (ou grace path calculado)
  - se boundAccount* null: bind accountIdentity
  - se bound e divergente: 403 + log abuso
  - upsert LicenseActivation by (licenseId, fingerprint)
  - retorna cache assinado + status derivado (`active|grace|blocked`) + softLock flags
- heartbeat(key, fingerprint):
  - atualiza lastHeartbeat*
  - se status revoked/refunded/chargeback -> revoked cache (validUntil=now)
  - se expiresAt passado: status grace/blocked conforme agora-expiresAt e ultima validacao
- Derivacao de estado:
  - revoked* => blocked (soft-lock; hard so se revokedReason=fraud e flag admin)
  - expiresAt < now => grace por 72h apos expiry, depois blocked soft
  - ok e expiresAt futuro => active

- [ ] Testes: primeiro bind; segundo activate mesma conta OK; conta diferente 403; refund bloqueia; expiry grace; multi fingerprint mesmo aluno OK

**Commit sugerido:** `feat(api): license activate/heartbeat with account binding`

### Task 1.4: Controllers publicos + rate limit

**Files:**
- Create: `apps/api/src/licensing/licensing.controller.ts`
- Modify: `apps/api/src/app.module.ts`
- Reuse rate-limit pattern existente no api se houver; senao ThrottlerGuard por IP+key

Endpoints:
- `POST /license/activate`
- `POST /license/heartbeat`
- `GET /license/public-key`

- [ ] Nao exigir auth de usuario WppTrack (sao endpoints publicos do produto aluno)
- [ ] Rate limit estrito
- [ ] Nunca logar key em texto puro
- [ ] Teste e2e/supertest basico

**Commit sugerido:** `feat(api): public license endpoints with rate limits`

### Task 1.5: Webhook Guru

**Files:**
- Create: `apps/api/src/licensing/guru-webhook.controller.ts`
- Create: `apps/api/src/licensing/guru-webhook.service.ts`
- Env: `GURU_WEBHOOK_SECRET`

Eventos minimos:
- `purchase_approved` -> cria License + enfileira notificacao (F2)
- `renewal_approved` -> estende expiresAt (mesma key)
- `refund` / `chargeback` -> status + revoke semantics

- [ ] Validar shared secret **antes** de processar
- [ ] Idempotencia por `externalTransactionId`
- [ ] Persistir LicenseWebhookEvent sempre (mesmo signature invalid)
- [ ] Sanitizar raw payload (sem dados extras desnecessarios em log)
- [ ] Testes: secret invalido nao emite; duplicate ignored; renewal extends; refund blocks

**Commit sugerido:** `feat(api): guru webhook issues and revokes licenses`

### Task 1.6: Admin interno PalmUP

**Files:**
- Create: `apps/api/src/licensing/licensing.admin.controller.ts`
- Modify: backoffice web routes (Claude se UI; Codex se so API)
- Proteger com o mesmo `platformAdmin` / owner master existente

API admin:
- list licenses (filtros email/status/sku)
- get license + activations
- revoke(reason)
- rebind account
- resend delivery (chama F2)
- set nodApiEnabled/nodApiExpiresAt (manual/ops)

- [ ] Testes de authz: nao-admin 403
- [ ] UI minima list+detail pode ficar para sub-task frontend

**Aceite F1:**
- Compra simulada Guru -> License criada
- activate/heartbeat funcionam com binding
- refund bloqueia no proximo heartbeat
- public-key exposta; private key so env server
- testes api verdes

---

# Fase 2 — Notificacoes de entrega (`dash-com-ia`)

**Executor:** Codex backend  
**Depende:** F1

### Task 2.1: Template e-mail license_key_delivery

**Files:**
- Modify: `apps/api/src/email/email.types.ts` (novo template union)
- Modify: `apps/api/src/email/email-message.renderer.ts`
- Create: renderer content com: key (so no envio), link repo, expiresAt, prompt partida IA, suporte

- [ ] Enfileirar via `email-queue.service.ts` existente apos purchase/renewal
- [ ] Falha de SMTP **nao** rollback License
- [ ] Audit via `email-delivery-audit.service.ts`
- [ ] Teste de render + enqueue

**Commit sugerido:** `feat(api): license key delivery email template`

### Task 2.2: Outbound WhatsApp admin PalmUP

**Files:**
- Create: `apps/api/src/integrations/uazapi/uazapi-outbound.adapter.ts` (sendText)
- Create: `apps/api/src/notifications/whatsapp-license.notifier.ts`
- Env: `LICENSE_NOTIFY_UAZAPI_BASE_URL`, `LICENSE_NOTIFY_UAZAPI_TOKEN`, `LICENSE_NOTIFY_UAZAPI_INSTANCE` (secrets PalmUP)

- [ ] Metodo sendText(phoneE164, message)
- [ ] Normalizar telefone do payload Guru quando existir; se nao houver phone, skip WA sem falhar e-mail
- [ ] Retry via BullMQ
- [ ] Nunca expor token no DTO/logs
- [ ] Testes com adapter mock

**Commit sugerido:** `feat(api): whatsapp outbound for license delivery`

### Task 2.3: Reenvio admin

- [ ] Endpoint admin `POST /backoffice/licenses/:id/resend` reusa e-mail+WA
- [ ] Rate limit reenvio
- [ ] Teste

**Aceite F2:**
- purchase_approved gera e-mail (e WA se phone)
- falha de canal nao apaga License
- reenvio admin funciona

---

# Fase 3 — Sanitizacao e geracao do template

**Repos:** `dash-com-ia` (script) + `nod-rastrackdash-wpp` (output)  
**Executor:** Codex  
**Gate critico:** G4 (push codigo publico)

### Task 3.1: Script sanitize-from-wpptrack

**Files:**
- Create no privado: `scripts/rastrackdash/sanitize-export.mjs` (ou .ts)
- Create: `scripts/rastrackdash/sanitize-allowdeny.yml` (listas)

**Remove do export (spec §3.1):**
- billing Asaas/split PalmUP modules e models exclusivos de cobranca PalmUP
- OAuth Meta (callback/state) — manter manual connections
- platform-owner support session / provisioning staff-only
- `apps/api/src/licensing` server completo
- notificacoes de licenca PalmUP
- `.env`, secrets, dados seed de clientes reais
- `assertProductionBrevoConfig` hardcode dominio rastrack -> generalizar BYO

**Mantem:**
- auth email/senha + Google login usuario
- workspaces multi-tenant
- meta manual
- uazapi adapter (BYO)
- inbound webhooks Umbler/Gupshup registry
- conversion rules/events/reporting
- diagnostics
- packages/shared (revisar exports)

- [ ] Dry-run gera pasta `/tmp/rastrackdash-export` 
- [ ] Roda gitleaks/secret patterns no output
- [ ] Falha o script se achar `UAZAPI_ADMIN_TOKEN`, private keys, `asaas` live keys, etc.

**Commit sugerido (privado):** `chore: add rastrackdash sanitize export script`

### Task 3.2: Generalizar Brevo/SMTP BYO no template

**Files no export:**
- Modify deployment-config para aceitar SMTP generico do aluno
- docs `.env.example` com SMTP_* comentado (Brevo recomendado)

- [ ] Teste: config health nao exige smtp-relay.brevo.com no template build

### Task 3.3: Primeira importacao no repo publico

- [ ] Aplicar export em worktree limpa de `nod-rastrackdash-wpp`
- [ ] Ajustar package names/branding strings WppTrack -> RastrackDash onde fizer sentido
- [ ] `pnpm install` + `pnpm test` + `pnpm typecheck` + `pnpm build` no template
- [ ] **PARAR e pedir G4 ao Samuel** antes de `git push` do codigo

**Aceite F3:**
- Export sem secrets (scan limpo)
- Template instala e builda
- Push publico so apos autorizado

---

# Fase 4 — License client no template

**Repo:** `nod-rastrackdash-wpp`  
**Executor:** Codex backend + Claude UI banner

### Task 4.1: Prisma LicenseState (Postgres do aluno)

Campos: id, fingerprint, accountIdentity, signedCache, cacheValidUntil, lastCheckedAt, licenseStatus, expiresAt

- [ ] Migration no template
- [ ] Service read/write state

### Task 4.2: LicenseClientService

Env template:
- `LICENSE_SERVER_URL` (API PalmUP)
- `LICENSE_KEY` (ou input first-boot, nao commitar)
- `LICENSE_ACCOUNT_IDENTITY` (email admin)

Fluxo:
- boot: se sem state -> exige activate
- verify local signature com public key (bootstrap fetch `/license/public-key`)
- se validUntil ok e nao revoked -> allow
- job BullMQ heartbeat 6-12h
- revoked response -> overwrite state blocked

### Task 4.3: Soft-lock guard

- [ ] Guard global em mutacoes (POST/PATCH/DELETE) quando blocked
- [ ] GET/leitura liberados
- [ ] Banner web: ativo / grace / bloqueado
- [ ] Testes

**Aceite F4:**
- app sobe so com licenca valida
- derrubar license server <72h mantem uso (grace)
- revoked soft-lock writes
- conta diferente 403

---

# Fase 5 — WhatsApp multi-provider

**Executor:** Codex backend

### Task 5.1: Registry de providers no template

Unificar conexoes WhatsApp:
- `uazapi_byo`
- `nod_api` (via broker)
- `waha`
- `zapi`
- manter inbound parsers Umbler/Gupshup

### Task 5.2: Uazapi BYO (sanitizado)

- [ ] Aluno informa baseUrl+token proprios
- [ ] Sem admin token PalmUP

### Task 5.3: Broker NOD API no dash-com-ia

**Files privados:**
- `apps/api/src/integrations/nod-api/*`

- [ ] Endpoints autenticados por License key + account binding + `nodApiEnabled`
- [ ] Proxy para operacoes de instancia Uazapi usando secrets PalmUP
- [ ] Cobra/ops Asaas R$20 fica manual/ops na v1 (G6) — flag nodApi* no admin
- [ ] Template chama broker, nunca ve admin token

### Task 5.4: Adapter WAHA (novo)

- [ ] Config BYO + testes contract com nock/msw
- [ ] Webhook inbound parser se payload difere

### Task 5.5: Adapter Z-API (novo)

- [ ] Config BYO + testes
- [ ] Webhook parser

### Task 5.6: Inbound webhooks sempre presentes

- [ ] Garantir registry Umbler/Gupshup nao removido na sanitizacao (teste de regressao no script F3)
- [ ] Docs de como plugar novo parser

### Task 5.7: Portar aviso de desconexao WhatsApp (depois do WppTrack)

**Pre-requisito:** feature ja estavel no `dash-com-ia` (trilha **P-WA** paralela — ver secao acima).

- [ ] Trazer modelo/API/UI de telefone de alerta + detector de disconnect + debounce
- [ ] Funcionar para NOD API e Uazapi BYO no template (e extensivel WAHA/Z-API)
- [ ] Docs no setup do aluno: "cadastre um numero para ser avisado se o WhatsApp cair"
- [ ] Testes de regressao do porte
- [ ] Se P-WA ainda nao tiver sido feita, **nao inventar** no template — completar P-WA primeiro

**Aceite F5:**
- pelo menos Uazapi BYO + NOD broker + 1 adapter novo (WAHA ou Z-API) testaveis
- webhooks multi-provider ok
- zero secret PalmUP no template
- aviso de desconexao portado **somente se** P-WA ja estiver em producao no WppTrack

---

# Trilha paralela P-WA — Aviso desconexao no WppTrack (antes do template)

**Repo:** `dash-com-ia` (produto cliente final em producao)  
**Ordem:** pode rodar **em paralelo a F1/F2**, mas **antes** da Task 5.7  
**Executor:** Codex backend + Claude UI  
**Gate:** commit/push/deploy WppTrack com "autorizado" separado

### Task P-WA.1: Desenho rapido no WppTrack
- [ ] Onde guardar telefone de alerta (workspace vs instancia WhatsApp)
- [ ] Qual evento Uazapi/NOD indica desconexao de forma confiavel
- [ ] Canal de envio (WA outbound admin PalmUP e/ou e-mail Brevo ja existente)
- [ ] Debounce (ex.: no maximo 1 alerta / N minutos por instancia)

### Task P-WA.2: Implementar + testar no WppTrack
- [ ] API + UI para cadastrar/editar telefone de alerta (opt-in)
- [ ] Handler de status/connection → enqueue alerta
- [ ] Mensagem clara: "WhatsApp desconectado — reconecte no painel"
- [ ] Testes unitarios + cenario de flap de conexao
- [ ] Homologar em staging/prod WppTrack com gate Samuel

### Task P-WA.3: So depois → Task 5.7 no RastrackDash

**Aceite P-WA:**
- cliente WppTrack cadastra telefone e recebe aviso real ao desconectar
- sem spam; sem secret no frontend; falha de alerta nao quebra webhook de leads

---

# Fase 6 — Backoffice aluno + whitelabel + onboarding AI-first

**Executor:** Claude frontend (UI) + Codex (API glue)

### Task 6.1: Backoffice simplificado

- [ ] Remover/ocultar billing split PalmUP e admin de outros tenants
- [ ] Manter clients/workspaces, diagnostics, webhooks
- [ ] Aba Licenca read-only (status, expiresAt, last heartbeat)
- [ ] Botao activation-link do cliente: reusar `issueClientOwnerActivationLink` com auth do owner da instancia (nao platform admin PalmUP)

### Task 6.2: Whitelabel

Env/painel:
- `BRAND_NAME`, `BRAND_LOGO_URL`, `BRAND_FAVICON_URL`, `BRAND_PRIMARY_COLOR`
- Footer fixo nao removivel com RastrackDash + powered by PalmUP
- Teste visual basico

### Task 6.3: pnpm setup + checklist in-app

- [ ] `scripts/setup.mjs`: .env from example, prisma migrate, create admin
- [ ] Checklist: db ok, license active, meta connected, first workspace
- [ ] Docs `docs/setup/*.md` com comandos e saida esperada
- [ ] `docs/setup/vps.md` com sizing **pesquisado** (Dokploy 2GB/30GB piso; produto minima 4GB; recomendada 8GB) + perguntas clientes/leads/dia + placeholders afiliado
- [ ] `docs/setup/billing/README.md` guia gateway
- [ ] `docs/setup/meta-manual.md` adaptado do existente
- [ ] Atualizar AGENTS.md/CLAUDE.md com fluxo real pos-F3

**Aceite F6:**
- aluno (ou IA) segue docs e sobe instancia
- whitelabel aplica sem remover footer
- cria cliente + link senha com SMTP BYO

---

# Fase 7 — Homologacao e release

**Executor:** Samuel + agentes

### Task 7.1: Matriz de aceite (spec §15)

Checklist executavel:
- [ ] compra Guru dev/homolog -> key entregue
- [ ] clone template -> setup -> activate
- [ ] grace <72h
- [ ] refund soft-lock
- [ ] expiry grace -> soft-lock -> renewal reabre
- [ ] multi instance mesmo aluno
- [ ] activate outra conta 403
- [ ] webhook sem secret nao emite
- [ ] secret scan template limpo
- [ ] provider WhatsApp BYO minimo
- [ ] whitelabel ok
- [ ] docs IA-first guiam setup

### Task 7.2: Tag v1.0.0

- [ ] CHANGELOG com BREAKING/NOTES
- [ ] Tag no `nod-rastrackdash-wpp`
- [ ] Runbook ops PalmUP (Guru, admin licencas, reenvio, NOD flag)

**Gate G7:** Samuel autoriza tag/anuncio

---

## Ordem de execucao recomendada (agora)

1. **Fechar F0** (docs no repo publico) — rapido
2. **Comecar F1** no `dash-com-ia` em branch limpa a partir de `main` (nao em cima de XMAX)
3. So depois F2 → F3 (G4) → F4...

## Notas de risco

- Branch atual de trabalho WppTrack pode estar em `feat/xmax-unified-conversions`. **F1 deve nascer de `main` atualizado** em worktree separada.
- XMAX: fora desta v1 do template ate decisao explicita na F3.
- Guru renewal event name: validar na F1.5 com doc oficial antes de prod (G3).
- Outbound WA: numero PalmUP e template de mensagem precisam compliance basica (opt-in do comprador).

## Self-review do plano vs spec

| Spec secao | Fase/Task |
|---|---|
| §2 decisoes 1-17 | cobertas nas fases |
| §3.1 remove | F3.1 |
| §3.2 mantem | F3/F5/F6 |
| §3.4 WhatsApp 5 caminhos | F5 |
| §4 repo/upstream/tags | F3 + F7 |
| §5-6 licenca L1 | F1 + F4 |
| §6.6 binding conta | F1.3 / F4 |
| §6.7 notificacoes | F2 |
| §7 Meta manual | F3 keep + F6 docs |
| §8 billing guia | F6.3 |
| §9 backoffice + 9.1 Brevo BYO | F3.2 + F6.1 |
| §10 AI-first + VPS | F0.2 + F6.3 + `docs/setup/vps.md` pesquisado |
| Aviso desconexao WA (Samuel revisao plano) | P-WA no WppTrack primeiro → Task 5.7 porte |
| §11 whitelabel | F6.2 |
| §12 seguranca | global + F1/F3 |
| §15 aceite | F7.1 |
| pendencias menores | defaults tabela topo |

## Proximo passo humano

Samuel: aprove este plano (ou peca ajustes).  
Com o ok, o primeiro codigo real comeca na **Fase 1 (license server)** em worktree limpa do `dash-com-ia` a partir de `main`, via Codex — **sem push/migration prod sem "autorizado"**.
