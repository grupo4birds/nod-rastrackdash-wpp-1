# VPS — recomendacao de sizing (baseada em pesquisa)

Nao e um provisionador automatico. Use para escolher maquina **antes** do deploy.
Web Next.js pode (e na arquitetura PalmUP costuma) ficar na **Vercel**; a VPS carrega principalmente **Dokploy + API Nest + Postgres + Redis + workers**.

## Fontes

1. **Dokploy (oficial)** — docs de instalacao:
   > "To ensure a smooth experience with Dokploy, your server should have at least **2GB of RAM** and **30GB of disk space**. This specification helps to handle the resources consumed by Docker during builds and prevents system freezes."
   - Fonte: [Dokploy Installation — Requirements](https://github.com/Dokploy/website/blob/main/apps/docs/content/docs/core/installation.mdx)
   - Portas: 80, 443, 3000 (painel Dokploy)
2. **Stack RastrackDash / WppTrack** (codigo real):
   - API NestJS (Node 22) + Prisma
   - PostgreSQL 16
   - Redis 7 + BullMQ (filas: e-mail, meta sync, webhooks, CAPI, etc.)
   - Builds Docker no proprio host (pico de RAM/CPU na hora do deploy)
3. **Carga de produto** (ordem de grandeza, nao benchmark de lab):
   - 500 leads/dia ≈ **~0,35 lead/min** media (bursts no horario de anuncio)
   - Cada lead tipico: 1–N webhooks Uazapi/WA + parse + write Postgres + possivel regra de conversao + enqueue CAPI/Meta
   - Em regime baixo/medio o gargalo raramente e CPU sustentada; e **RAM** (Node + Postgres + Redis + Dokploy/Traefik) e **I/O de disco** em build/migrate

## O que roda na VPS (cenario aluno padrao)

| Componente | Papel | RAM ordem de grandeza (idle/leve) |
|---|---|---|
| Dokploy + Traefik + Docker overhead | PaaS / proxy | ~400–800 MB |
| API Nest (+ workers no mesmo processo ou sidecar) | webhooks, CAPI, auth | ~300–700 MB |
| PostgreSQL 16 | dados | ~200–500 MB (+ shared_buffers sob carga) |
| Redis 7 | filas/cache | ~50–150 MB |
| Pico de **build** Docker/pnpm | deploy | +1–2 GB temporarios |

Conclusao: **2 GB totais e o piso do Dokploy sozinho para nao travar no build** — nao e um piso confortavel para Dokploy **+** app completo sob build simultaneo. Por isso a faixa "minima viavel do produto" sobe.

## Perguntas iniciais (IA deve fazer)

1. Quantos **clientes/workspaces** pretende rodar nesta instancia?
2. Quantos **leads/dia** em media (e no pico de campanha)?
3. Vai rodar **build na mesma VPS** (Dokploy build local) ou tem build server separado?
4. Web fica na **Vercel** (recomendado) ou tambem na VPS?

## Faixas recomendadas (RastrackDash)

| Perfil | Workspaces | Leads/dia (media) | Pico webhooks (ordem) | Tier | Spec sugerida | Observacao |
|---|---|---|---|---|---|---|
| **So Dokploy (referencia oficial)** | — | — | — | Piso Dokploy | **2 GB RAM / 30 GB disco** | So o painel; **nao** recomenda rodar o app completo com folga |
| **Minima do produto** | 1–5 | ate ~500 | dezenas/min em burst curto | Minima | **2 vCPU / 4 GB RAM / 60–80 GB SSD** | Dokploy + API + PG + Redis; web na Vercel; evitar build pesado + trafego no mesmo instante |
| **Recomendada** | 5–20 | ate ~5.000 | centenas/min em campanha | Padrao | **4 vCPU / 8 GB RAM / 120–160 GB SSD** | Folga para workers BullMQ, Postgres, deploys e picos CTWA |
| **Alta** | 20+ ou multiplas instancias WA | >5.000 ou picos fortes | alto e sustentado | Alta | **4–8 vCPU / 16 GB RAM / 200 GB+ SSD** | Separar PG ou workers; considerar build server Dokploy remoto |
| **Nao fazer** | — | — | — | — | 1 GB RAM / HDD lento | Dokploy oficialmente ja avisa freeze em build |

### Por que 500 leads/dia nao exige maquina enorme?

- 500/dia e carga **baixa** se bem enfileirada (BullMQ) e com webhooks idempotentes.
- O que drena maquina pequena:
  - **Build Docker** na mesma VPS (pnpm + Prisma)
  - Sync Meta Graph em fan-out
  - Falta de indices / queries pesadas no reporting
  - Muitas instancias WhatsApp com QR/reconnect loops
- Por isso a **minima do produto e 4 GB**, nao 2 GB: 2 GB e o minimo Dokploy; o app precisa de teto acima do piso do PaaS.

### Separacao recomendada (igual PalmUP)

- **Vercel:** frontend Next
- **VPS:** API + DB + Redis + Dokploy
- Opcional depois: Postgres gerenciado / Redis gerenciado / build server Dokploy

## Providers (links de afiliado PalmUP)

Placeholders ate o Samuel fornecer URLs reais:

- HostGator: `[AFILIADO_HOSTGATOR]`
- DigitalOcean: `[AFILIADO_DIGITALOCEAN]`
- Contabo: `[AFILIADO_CONTABO]`

Dokploy tambem cita Hetzner como bom custo-beneficio na doc oficial (referencia de mercado, nao afiliado PalmUP).

## Checklist rapido pos-deploy

- RAM disponivel em idle > 25%
- Disco livre > 20%
- Deploy nao mata o host (se matar, subir RAM ou build remoto)
- Webhooks com p95 aceitavel (sem fila crescendo sem parar no Redis/BullMQ)
