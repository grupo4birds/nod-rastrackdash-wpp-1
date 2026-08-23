# RastrackDash

Template educacional da PalmUP — base multi-tenant para o aluno operar rastreamento WhatsApp → Meta CAPI para os próprios clientes.

> **Status:** design **aprovado** + plano de implementação publicado.  
> Este repositório ainda está em fase de documentação. O **código do produto** entra a partir da Fase 3 do plano (export sanitizado do WppTrack).

## Documentos

| Doc | Descrição |
|---|---|
| [Design Spec (APROVADA)](./docs/superpowers/specs/2026-08-19-nod-rastrackdash-wpp-student-edition-design.md) | Decisões de produto e arquitetura |
| [Implementation Plan](./docs/superpowers/plans/2026-08-19-rastrackdash-student-edition-implementation.md) | Plano faseado F0–F7 |
| [AI Agents guide](./docs/AI_AGENTS.md) | Memória para IAs (vibe coding) |
| [Setup](./docs/setup/README.md) | Guias de instalação |
| [Customization](./docs/CUSTOMIZATION.md) | O que é seguro editar |

## Nomes

- **Produto:** RastrackDash  
- **Repositório:** `nod-rastrackdash-wpp`

## Licença de uso

Acesso ao código exige **assinatura ativa** (chave após compra na Guru). Detalhes na design spec.

## Próximo passo de engenharia

Fase 1 do plano: license server no WppTrack (`dash-com-ia`, privado), em branch limpa a partir de `main`.
