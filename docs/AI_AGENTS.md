# Guia para agentes de IA (vibe coding)

Este arquivo e a memoria principal para agentes (Claude Code, Codex, Grok, etc.) que ajudam o aluno a configurar o RastrackDash.

> Nota: o conteudo equivalente a um `AGENTS.md`/`CLAUDE.md` de raiz vive aqui por enquanto.

## O que e este projeto

- **Produto:** RastrackDash
- **Repo:** `nod-rastrackdash-wpp`
- **Dono do codigo-base:** PalmUP
- **Usuario deste clone:** o **aluno** (agencia/dev) que opera uma plataforma multi-tenant para os **clientes dele**

Nao confundir:
- **Aluno** = quem comprou a licenca e hospeda a instancia
- **Cliente do aluno** = workspace/empresa final dentro do painel do aluno
- **PalmUP** = emite licenca, opera license server, opcionalmente NOD API

## Documentos obrigatorios

1. `docs/superpowers/specs/2026-08-19-nod-rastrackdash-wpp-student-edition-design.md` (spec APROVADA)
2. `docs/superpowers/plans/2026-08-19-rastrackdash-student-edition-implementation.md` (plano faseado)
3. `docs/CUSTOMIZATION.md` (o que o aluno pode editar)
4. `docs/setup/` (guias passo a passo — evoluem com as fases)

## Estado atual do repositorio

- G4: codigo sanitizado do produto esta presente, junto com a spec e o plano
- F4: o cliente de licenca sera adicionado depois; o license server PalmUP continua privado e esta fora deste repo
- Use os comandos de app, migrations e verificacoes descritos no README e nos guias de setup

## Regras inegociaveis

- Nunca commitar `.env` com secrets
- Nunca remover footer `RastrackDash · powered by PalmUP`
- Nenhuma chave de servico no frontend
- 1 licenca = 1 conta de aluno (anti-share); instancias do mesmo aluno ilimitadas
- Soft-lock quando licenca bloqueada: leitura ok, escrita bloqueada
- Nao hardcodar secrets PalmUP (Asaas, UAZAPI_ADMIN, license private key, Guru)

## Prompt de partida (aluno cola na IA)

```text
Voce vai me ajudar a configurar o RastrackDash.
1) Leia docs/AI_AGENTS.md, a design spec e o plano em docs/superpowers/.
2) Confirme que o repositorio esta em G4: codigo sanitizado presente; cliente de licenca previsto para F4.
3) Siga docs/setup/ na ordem: env -> banco -> cliente de licenca quando F4 estiver disponivel -> admin -> primeiro cliente -> Meta manual -> WhatsApp -> deploy.
4) Em cada passo, rode a verificacao e so avance se passar.
5) Nunca remova o footer RastrackDash/PalmUP e nunca coloque secrets no frontend.
Pergunte agora: chave de licenca, email da conta, quantos clientes pretendo rodar e leads/dia medios (para recomendar VPS).
```

## Stack atual

- `apps/web` Next.js
- `apps/api` NestJS + Prisma + PostgreSQL + Redis + BullMQ
- `packages/shared` contratos Zod
- Deploy aluno: Vercel (web) + VPS/Dokploy (api/db/redis)
