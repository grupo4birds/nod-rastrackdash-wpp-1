# VPS — recomendacao de sizing

Nao e um provisionador automatico. Use para escolher maquina antes do deploy.

## Perguntas iniciais

1. Quantos clientes/workspaces voce pretende rodar?
2. Quantos leads por dia, em media, espera receber?

## Faixas

| Clientes/workspaces | Leads/dia | Tier |
|---|---|---|
| ate 5 | < 500 | **Minima** — 2 vCPU / 2GB RAM / 80GB disco |
| 5 a 20 | ate 5.000 | **Recomendada** — 4 vCPU / 8GB RAM / 160GB disco |
| > 20 | > 5.000 | Sob medida / falar com suporte |

Stack tipica na VPS: Dokploy + API Nest + PostgreSQL + Redis (+ workers BullMQ). Web Next pode ficar na Vercel.

## Providers (links de afiliado)

Substitua pelos links reais da PalmUP quando disponiveis:

- HostGator: `[AFILIADO_HOSTGATOR]`
- DigitalOcean: `[AFILIADO_DIGITALOCEAN]`
- Contabo: `[AFILIADO_CONTABO]`
