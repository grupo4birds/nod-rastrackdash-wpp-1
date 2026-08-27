# PLANO ATIVO — Melhorias da Student Edition

> **ARQUIVO CANÔNICO DE EXECUÇÃO**
>
> Este é o plano ativo para as melhorias observadas durante a instalação dos alunos.
> Não executar fases do plano mestre original sem decisão explícita de Samuel.
>
## Regra de continuidade

Antes de qualquer tarefa de código, o orquestrador deve:

1. ler este arquivo;
2. confirmar a fase ativa e o repositório correto;
3. confirmar o escopo permitido e o que está proibido;
4. executar Gate 1 (Claude ou Codex);
5. executar Gate 2 (modelo, reasoning/effort, arquivos e testes);
6. atualizar este arquivo quando a implementação começar;
7. atualizar novamente após testes, revisão, commit, PR e merge;
8. declarar o próximo passo somente depois de verificar o estado real.

Não iniciar escritor antes da aprovação dos dois gates. Não misturar dois escritores no mesmo worktree.

## Repositórios e responsabilidades

### Template público — `nod-rastrackdash-wpp`

É o repositório que o aluno clona. Contém o produto Student Edition, backoffice, workspaces, providers BYO e o cliente de licença. Não contém o license server privado PalmUP, billing privado, Guru, secrets PalmUP ou notificações de venda.

### Produto privado — `dash-com-ia`

É a aplicação principal da PalmUP/WppTrack. Contém o license server e os domínios privados. Não deve ser usado para executar as melhorias do template público, salvo quando uma tarefa indicar explicitamente esse repositório.

## O que NÃO faz parte deste plano

- Não reimplementar o license server.
- Não implementar entrega de license key por e-mail/WhatsApp.
- Não reabrir a Fase 2 de notificações do plano mestre original.
- Não criar QR Code, instância UAZAPI, assinatura de provider ou cobrança de WhatsApp.
- Não copiar billing/Asaas/Guru/provisionamento do produto privado.
- Não iniciar conectores ou UAZAPI antes das fases próprias deste plano.

## Política aprovada de entrega de e-mail

Para convites e ativações de responsáveis de clientes, `queued` significa somente que a tarefa foi aceita pela fila/SMTP configurado. A plataforma não promete nem confirma que o provedor entregou a mensagem na caixa do destinatário.

O fluxo operacional aprovado é:

1. tentar o envio automático;
2. permitir reenvio quando o cliente informar que não recebeu;
3. oferecer geração manual de um link de ativação/senha de uso único e com expiração, para o administrador copiar e enviar diretamente ao cliente;
4. deixar melhorias de confirmação por provedor, rastreamento de entrega e diagnóstico avançado para etapa posterior.

Falha de auditoria interna não deve ser confundida com falha de entrega do provedor. A auditoria deve registrar o melhor estado operacional conhecido, sem armazenar token bruto, senha ou segredo. A garantia de entrega na caixa de entrada é responsabilidade operacional do aluno junto ao cliente nesta etapa.

O arquivo histórico `docs/superpowers/plans/2026-08-19-rastrackdash-student-edition-implementation.md` é referência histórica/arquitetural, não é a fila atual de execução.

## Status oficial

| Etapa | Escopo | Repositório | Status | Evidência |
|---|---|---|---|---|
| Fase 0 | onboarding, Dokploy, Git/GitHub, envs, providers BYO e docs | público | **CONCLUÍDA** | PR #24, merge `7ba875a` |
| Fase 1 | bootstrap persistente, `platform_owner`, RBAC, convites e proteção de owner | público | **CONCLUÍDA** | PR #25, merge `6212b33` |
| Fase 2 | backoffice real multi-cliente, responsáveis, suporte escopado, anti-IDOR, ativação automática de licença e SMTP opcional | público | **IMPLEMENTADA LOCALMENTE — HOMOLOGAÇÃO INDIVIDUAL PENDENTE** | base mergeada em `374cc48`; commits locais `525886a`, `5d743d5`, `51781b1`; testes/builds locais verdes; sem push/deploy |
| Fase 3 | conectores externos MySQL/PostgreSQL com egress/SSRF seguro | público | **PENDENTE — ÚLTIMA FEATURE DE CÓDIGO** | necessária para conectar banco externo já populado, seguindo o padrão Dash com IA/Barbieri; executar somente depois do banner |
| Fase 4 | UAZAPI por conexão/workspace, webhook e gatilhos | público | **IMPLEMENTADA NO HISTÓRICO F5.1–F5.7** | registry, UAZAPI BYO, NOD API, WAHA, Z-API, parsers e alertas já estão no `main` |

### Estado atual detalhado

- Última fase aceita localmente: Fase 2 base, com hardening posterior ainda aguardando homologação individual.
- Commits da Fase 2 base: backend `6f5b6a3`; frontend `b4c31e7`; merge `374cc48`.
- Hardening local adicional: `525886a` (autoativação da licença), `5d743d5` (SMTP opcional no backend) e `51781b1` (UI/onboarding SMTP opcional).
- Gates locais: licensing 54 testes; backoffice workspace 19/19; web typecheck/build verdes; shared build verde; `git diff --check` verde. A suíte completa shared mantém 9 falhas baseline de exports não relacionados.
- Migrations: nenhuma.
- Commit/push/PR/merge/deploy: hardening foi publicado em `origin/main` até `108fbf6`; não houve deploy.
- Próxima prioridade: homologar a criação de workspace sem SMTP, ativação automática da licença e geração manual do link em uma instalação individual.
- Depois da homologação, consolidar/homologar WhatsApp BYO por instalação/workspace; em seguida implementar o banner de atualização; somente então executar a Fase 3 de conexão de banco externo como última feature de código.
- Fase 3 permanece obrigatória, mas foi movida para a última feature: conexão de banco externo MySQL/PostgreSQL já populado, seguindo o padrão de integração usado no Dash com IA/Barbieri.

### Decisão de ordenação — 2026-08-26

O modelo operacional confirmado por Samuel é **uma instalação por aluno, com banco principal, deploy e backoffice próprios**. A existência de workspaces internos não implica operação cross-installation.

Ordem de execução vigente:

1. fechar e validar a Fase 2 na instalação individual, incluindo ativação automática da licença, criação sem SMTP e link manual;
2. implementar/consolidar WhatsApp BYO por instalação/workspace, sem QR, criação de instância ou cobrança;
3. implementar o banner de atualização e as instruções de atualização para alunos;
4. implementar a Fase 3 como última feature: conexão opcional a banco externo MySQL/PostgreSQL já populado, seguindo o padrão usado no Dash com IA/Barbieri;
5. homologar e preparar release.

A Fase 3 é necessária, mas não é dependência do funcionamento normal do backoffice. O diff parcial não aceito de conectores permanece fora de commit e não deve orientar a próxima fase.

## Fase 2 — Backoffice real multi-cliente

### Objetivo

Transformar `/backoffice/clients`, que hoje é uma página honesta/informativa, em gestão real de clientes/workspaces sem dados fictícios e sem vazamento entre workspaces.

### Slices, na ordem

1. **Listar e criar cliente/workspace**
   - `GET /backoffice/workspaces`;
   - `POST /backoffice/workspaces`;
   - owner da plataforma cria workspace e primeiro responsável em transação;
   - reutilização de usuário existente exige confirmação explícita e auditoria.

2. **Responsáveis e acesso**
   - listar owners/members do workspace;
   - convidar, reenviar ativação, revogar membership;
   - transferência de owner em dois passos;
   - workspace nunca fica sem owner.

3. **Equipe da plataforma**
   - expor a administração de `platform_owner`/`platform_operator` já implementada;
   - manter distinção entre equipe da plataforma e equipe do cliente.

4. **Suporte escopado**
   - iniciar suporte para um `workspaceId` específico;
   - persistir contexto na sessão;
   - banner persistente com workspace/cliente ativo;
   - sair do suporte;
   - expiração/logout limpam o contexto;
   - auditar início, fim, ator e workspace.

5. **UI real do painel**
   - substituir o placeholder somente quando os endpoints reais existirem;
   - estados vazios, loading e erro honestos;
   - nenhum KPI, cliente ou workspace fictício.

### Writer e ordem técnica

- Backend/API, contratos, autorização, anti-IDOR e testes: **Codex**.
- Frontend/backoffice e banner de suporte: **Claude Code**, depois do contrato/API validado.
- Um único escritor por worktree; não executar Codex e Claude simultaneamente na mesma árvore.

### Arquivos esperados — confirmar após inspeção

Backend provável:

- `apps/api/src/workspaces/backoffice-workspaces.controller.ts`;
- `apps/api/src/workspaces/platform-workspace-access.service.ts`;
- `apps/api/src/workspaces/workspaces.module.ts`;
- `apps/api/src/workspaces/workspaces.service.ts`;
- `apps/api/src/auth/auth.service.ts`;
- `apps/api/src/workspaces/workspace-context.service.ts`;
- `packages/shared/src/schemas/workspace.ts`;
- `packages/shared/src/schemas/platform-administration.ts`;
- testes API de autorização, anti-IDOR, suporte e convites.

Frontend provável, após aceite do backend:

- `apps/web/src/app/(backoffice)/backoffice/clients/page.tsx`;
- `apps/web/src/app/(backoffice)/backoffice/clients/actions.ts`;
- componentes de cliente, navegação e banner de suporte;
- testes de rotas, estados e escopo.

O executor deve inspecionar o estado atual e não assumir que esses arquivos existem.

### Segurança obrigatória

- filtro de banco por `workspaceId` em toda leitura/mutação administrativa;
- nenhum ID de outro workspace pode ser usado para operar ou enumerar dados;
- sessão sem role persistente recebe 401/403 conforme o caso;
- operador não administra owner;
- suporte não concede role de owner;
- contexto de suporte é curto, explícito, auditado e revogável;
- convites continuam one-time, expirados e sem senha transmitida;
- auditoria sem tokens, hashes, senhas ou segredos;
- respostas não inventam dados.

### Migration gate

A expectativa inicial é nenhuma migration, pois os modelos de workspace, memberships, convites, auditoria e sessão já existem.

Se o Codex concluir que uma migration é indispensável, deve parar antes de criá-la e reportar:

- arquivo;
- tabelas/colunas;
- impacto nos dados existentes;
- risco;
- rollback;
- comando exato.

### Aceite da Fase 2

- platform owner lista/cria clientes reais;
- primeiro responsável é criado/convidado com escopo correto;
- convites e memberships são administráveis;
- suporte entra e sai de um único workspace;
- outro workspace não é acessível por ID manipulado;
- auditoria registra ações sem segredos;
- `/backoffice/clients` não usa placeholders para dados reais;
- testes focados, typecheck, build e revisão independente passam;
- commit, push, PR e merge permanecem gates separados.

## Protocolo de atualização deste arquivo

Ao iniciar uma fase:

```text
Status: IMPLEMENTANDO
Branch:
Executor:
Modelo/reasoning:
Task file:
Escopo:
```

Após implementação:

```text
Status: IMPLEMENTAÇÃO CONCLUÍDA — AGUARDANDO REVISÃO
Arquivos:
Testes:
Migrations:
Limitações:
```

Após revisão:

```text
Status: ACEITA PARA COMMIT
Revisão independente:
Bloqueadores:
```

Após merge:

```text
Status: CONCLUÍDA
PR:
Commit mergeado:
Checks:
Deploy:
Próxima fase:
```

Nenhuma fase pode ser marcada como concluída apenas porque um agente terminou; exige evidência real e o gate correspondente.
