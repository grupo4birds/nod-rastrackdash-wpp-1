# RastrackDash - Edicao Aluno - Design Spec

Data: 2026-08-19

Status: Rascunho - decisoes do brainstorming fechadas pelo Samuel (turnos 1 a 7), incluindo modelo comercial de assinatura, estado bloqueado (soft-lock), nome do produto, provedores WhatsApp multi-caminho, whitelabel de branding, binding de licenca a conta (anti-compartilhamento) e modulo de notificacao de entrega de chave; restam 6 pendencias menores nao bloqueantes (secao 16).

## 1. Objetivo e Publico

Criar um segundo produto derivado do WppTrack (repo `dash-com-ia`) para venda educacional: um repositorio template publico que o aluno compra acesso, clona, configura e usa como base para atender os proprios clientes dele.

Diferenca de posicionamento:

- **WppTrack** (produto atual): a PalmUP entrega/opera o sistema diretamente para o cliente final.
- **RastrackDash** (este produto): a PalmUP vende o **acesso ao codigo-base** para o aluno. O aluno opera a propria instancia, multi-tenant, para os proprios clientes dele. Vira uma "mini-PalmUP".

O aluno nao e um usuario final passivo: ele e um desenvolvedor/agencia iniciante que vai clonar, configurar infraestrutura propria (Dokploy/servidor, banco, WhatsApp/Uazapi, Meta) e vender/entregar isso para os clientes dele.

Jornada alvo:

1. Aluno compra o produto (checkout Guru).
2. Recebe uma chave de licenca.
3. Clona `nod-rastrackdash-wpp` (repo publico no GitHub).
4. Configura ambiente com apoio de uma ferramenta de IA (vibe coding) seguindo a documentacao do repo.
5. Ativa a chave de licenca no primeiro boot.
6. Cria o primeiro workspace/cliente no proprio backoffice.
7. Conecta Meta manualmente, sobe em producao (Dokploy + Vercel).
8. Opera multiplos clientes/workspaces na mesma instancia.
9. Recebe evolucoes futuras do produto via upstream + tags.

Nao e o objetivo desta v1: billing fechado pronto para o aluno cobrar o cliente dele, broker OAuth Meta centralizado, ou qualquer enforcement tecnico forte de "uma chave = uma instancia".

## 2. Decisoes Aprovadas

Todas as decisoes abaixo foram fechadas pelo Samuel ao longo do brainstorming (turnos 1 a 6).

| # | Tema | Decisao |
|---|---|---|
| 1 | Modelo do aluno | **B** - plataforma multi-tenant unica do aluno (mini-PalmUP), workspaces/clientes proprios no mesmo deploy |
| 2 | Meta Ads/CAPI | **C** - token manual/System User como fluxo principal da v1; app Meta proprio do aluno fica como avancado opcional; broker OAuth centralizado da PalmUP fica para fase 2+ |
| 3 | Billing | **C com guia** - sem billing fechado (Asaas + split) na v1; produto entrega guia orientado por gateway (Asaas, Hotmart, sem cobranca) e pontos de extensao prontos no codigo |
| 4 | Licenca | **L1** - license server proprio da PalmUP: emite chave apos webhook de compra aprovada na Guru, valida online (boot + heartbeat, incluindo expiracao de assinatura), cache local assinado, revogacao real (reembolso/chargeback/vazamento) |
| 5 | Backoffice | **A simplificado** - o backoffice clonado vira o backoffice do proprio aluno (clientes/workspaces, logs/diagnostico); gestao de licencas fica **externa**, dentro do dash-com-ia interno da PalmUP |
| 6 | Marca | **"powered by PalmUP"** fixo no footer, residual, nao removivel na v1; expandido no turno 7 para whitelabel completo (logo, favicon, cor) da agencia do aluno, com a marca **RastrackDash** tambem residual e nao removivel junto do footer (secao 11) |
| 7 | Updates | aluno **recebe evolucao** do codigo-base (nao e foto congelada), via `upstream` + tags de release |
| 8 | Estrategia de repositorio | **template publico + remote `upstream` oficial + tags de release** |
| 9 | Onde mora o license server | **modulo dentro do `apps/api` atual do dash-com-ia**, reaproveitando Postgres/Redis/BullMQ/Dokploy ja existentes. **O server nao vai para o repo publico do aluno** - so o client de validacao (chamadas HTTP + verificacao de assinatura) vai no template |
| 10 | Nome do repo template publico | **`nod-rastrackdash-wpp`** (nome do repositorio GitHub; diferente do nome comercial do produto, item 15) |
| 11 | Grace period de heartbeat | **72h** de tolerancia a falha de comunicacao com o license server; bloqueio imediato so acontece em revogacao confirmada pelo server |
| 12 | Instancias por chave | **Ilimitadas na v1 para o MESMO aluno.** O aluno pode ativar quantas instancias/deploys quiser com a mesma chave; infraestrutura/whatsapps/servidor sao responsabilidade dele. `LicenseActivation` (fingerprint) continua existindo como **registro/telemetria/auditoria**, **nao como enforcement** de quantidade. Risco aceito documentado na secao 13. Complementado no turno 7 pelo item 17 (**1 licenca = 1 conta**, anti-compartilhamento entre alunos diferentes - isso sim e enforced, secao 6.6) |
| 13 | Modelo comercial da licenca | **Assinatura**, a principio **anual**; periodos futuros (mensal, semestral etc.) ficam previstos no modelo de dados (`interval`) para adicao posterior sem redesenho (secao 5, secao 6.1) |
| 14 | Estado bloqueado | **Soft-lock** - trava criacao/edicao e funcionalidades novas, mantem leitura dos dados ja coletados; hard-lock total reservado a revogacao confirmada por fraude, a criterio da PalmUP via admin interno (secao 5, secao 6.5) |
| 15 | Nome comercial do produto | **RastrackDash** (o nome do repositorio GitHub continua `nod-rastrackdash-wpp`, item 10, para diferenciacao de namespace) |
| 16 | Provedores WhatsApp (edicao aluno) | **5 caminhos na v1** (turno 7): **NOD API** (Uazapi rebrandeada/oferecida pela PalmUP, add-on pago ~R$20/mes vinculado ao Asaas da PalmUP, credenciais PalmUP nunca no template - autenticacao via broker), **Uazapi direta** (BYO), **WAHA** (BYO, adapter novo a construir), **Z-API** (BYO, adapter novo a construir), e **webhooks multi-provider** de entrada (Umbler e Gupshup ja existem no codigo hoje, mais os futuros) sempre mantidos no template. Detalhe em 3.4 |
| 17 | Entrega da chave ao comprador | **Modulo de notificacao no dash-com-ia** (nao no template, turno 7): e-mail (reaproveita fila `transactional-email`/BullMQ e SMTP ja existentes) e WhatsApp (canal de saida a construir - nao existe hoje). Falha de entrega nao bloqueia emissao/renovacao da License. Detalhe em 6.7 |

Complementos que nao sao itens de escolha, mas requisitos que atravessam a spec inteira:

- A documentacao do repo template precisa ser **AI-first** (secao 10.2).
- O license server reaproveita "o meio caminho andado" do dash-com-ia (infra, nao codigo de dominio).
- Reembolso/chargeback/expiracao de assinatura sem renovacao tiram acesso (soft-lock); chave ativa e em dia continua recebendo atualizacoes de autorizacao.

## 3. Arquitetura do Template

O template `nod-rastrackdash-wpp` nasce de uma copia sanitizada do monorepo `dash-com-ia` (`apps/web`, `apps/api`, `packages/shared`), removendo o que e exclusivo da operacao comercial da PalmUP e mantendo o nucleo do produto de rastreamento WhatsApp -> Meta.

### 3.1 O que sai do dash-com-ia

- **Billing Asaas + split**: `apps/api/src/billing` (`asaas.adapter.ts`, `package-asaas.adapter.ts`), `apps/api/src/integrations/asaas`, modelos Prisma `SplitReceiver`, `SplitRule`, `PlatformFiscalSettings`, `BillingInvoice`, `WorkspaceBillingProfile`, `WhatsappSeat`/`WhatsappSeatProvider`, fluxo de cobranca de instancia (`WhatsappInstanceActivation` amarrado a pagamento Asaas). Fica fora da v1 por decisao 3; guia de extensao entra na secao 8.
- **OAuth Meta**: fluxo de autorizacao/callback OAuth (`MetaOAuthState`, broker de token) sai como caminho principal. O fluxo manual (`meta-manual-connections.service.ts`) fica e vira o unico caminho suportado na v1 (decisao 2).
- **Provisionamento platform-owner especifico da PalmUP**: a spec `2026-07-11-wpptrack-platform-owner-client-provisioning-design.md` descreve uma camada de "sessao de suporte auditada" em que um operador da PalmUP entra disfarcadamente no workspace de um cliente pagante da PalmUP sem aparecer como membro. Essa camada e ferramenta operacional interna da PalmUP para atender os proprios clientes dela; nao faz sentido no contexto do aluno, que ja e dono/admin direto do proprio backoffice. Essa camada nao vai para o template. O mecanismo basico de workspace multi-tenant (`Workspace`, `WorkspaceMember`, `WorkspaceRole`) fica, porque e a base do modelo B.
- **License server**: fica no dash-com-ia interno (decisao 9). So o client de validacao vai no template.
- **Modulo de notificacao de entrega de licenca**: fica no dash-com-ia interno junto do license server (decisao 17, secao 6.7); nao vai para o template.
- Segredos reais: `.env` de producao, chaves Meta/Asaas/Guru da PalmUP, dados de clientes/leads reais (Barbieri e outros workspaces de producao). Inclui explicitamente (turno 7, decisao 16): `UAZAPI_ADMIN_TOKEN`/credenciais administrativas da PalmUP usadas para operar a NOD API, e qualquer segredo do broker NOD API - o aluno nunca recebe essas credenciais, so consome a NOD API via chamada autenticada pela propria License (secao 3.4).

### 3.2 O que fica

- Painel multi-tenant: workspaces, membros, convites, autenticacao propria + Google OAuth de login (login de usuario do painel, nao Meta Ads).
- Integracao Uazapi (WhatsApp) e webhooks inbound (`apps/api/src/inbound-webhooks`, `apps/api/src/integrations/uazapi`) - deixa de ser o unico caminho e passa a ser um dos adapters da camada provider-agnostic de WhatsApp (secao 3.4, decisao 16).
- Integracao Meta manual (System User) para leitura de campanhas/insights e envio CAPI (`apps/api/src/integrations/meta`, exceto o pedaco de OAuth).
- Regras de conversao, eventos de conversao, reporting (`apps/api/src/conversion-rules`, `apps/api/src/conversion-events`, `apps/api/src/reporting`).
- Central de Diagnostico (`apps/api/src/diagnostics`, modelos `DiagnosticEvent`, `WebhookLog`, `IntegrationLog`, `JobAttempt`, `AuditLog`) - vira a ferramenta de suporte do proprio aluno.
- `packages/shared` (contratos/schemas compartilhados web/api).
- **[NOTA - fora de decisao desta spec]** O modulo XMAX (conversoes unificadas), em desenvolvimento em branch paralela (`feat/xmax-unified-conversions`, `apps/api/src/xmax`), e tratado como evolucao normal do core WppTrack. Esta spec nao decide se a v1 do template inclui o estado atual do XMAX ou aguarda estabilizacao; recomenda-se decidir isso perto da geracao do primeiro template, nao agora.

### 3.3 Convencao PALMUP-CORE

Para o aluno saber o que e seguro editar sem quebrar updates futuros, arquivos/pastas centrais recebem uma marcacao de topo (`// PALMUP-CORE: nao edite este arquivo diretamente, ele e atualizado via upstream`) e um `docs/CUSTOMIZATION.md` lista explicitamente a superficie segura de customizacao (branding, `.env`, docs, textos) versus nucleo (auth, licenciamento, integracoes, migrations).

### 3.4 Provedores WhatsApp e Canais de Entrada (decisao 16)

Base real no dash-com-ia hoje: `apps/api/src/integrations/uazapi/uazapi.adapter.ts` so gerencia ciclo de vida de instancia (criar, status, conectar, QR, deletar, configurar webhook, listar labels) - **nao existe nenhum metodo de envio de mensagem outbound** no codigo atual. O enum de provider em `whatsapp-connections.service.ts` hoje so tem `"uazapi" | "cloud_api"` (Cloud API = Meta WhatsApp direto). No lado de entrada, `apps/api/src/inbound-webhooks/providers/inbound-webhook-parser.registry.ts` ja e uma camada provider-agnostic (registry por `[provider, parserVersion]`) com **`UmblerV1Parser` e `GupshupV1Parser`** registrados hoje; existe tambem um parser dedicado para Uazapi em `apps/api/src/webhooks/uazapi-webhook-parser.ts`. **WAHA, Z-API, "Meta Developers" generico e Datacrazy nao existem no codigo hoje** - sao caminhos novos a construir, nao reaproveitamento direto.

A v1 da edicao aluno tem 5 caminhos de WhatsApp:

1. **NOD API** - Uazapi rebrandeada/oferecida comercialmente pela PalmUP. Aluno paga assinatura de **R$20/mes**, vinculada ao Asaas da PalmUP (fora do template, decisao 3/8). Tecnicamente e o **mesmo adapter Uazapi** (mesmo protocolo), so que a `baseURL`/credencial e resolvida via um **broker autenticado pela License do aluno** dentro do dash-com-ia, em vez do aluno digitar um token Uazapi proprio - nenhuma credencial administrativa da PalmUP (`UAZAPI_ADMIN_TOKEN` ou equivalente) vai para o template ou para o `.env` do aluno, seguindo o mesmo padrao do license client (secao 6): o app do aluno chama um endpoint autenticado do dash-com-ia, nunca guarda o segredo. Entitlement de acesso a NOD API fica marcado na propria `License` (`productSku` cobrindo o add-on, ou um campo de entitlement separado `nod_api` - `[DECISAO PENDENTE - MENOR]`, ver secao 16).
2. **Uazapi direta** - aluno assina a Uazapi por conta propria e informa as proprias credenciais no `.env`/painel; reaproveita o adapter existente sem mudanca de protocolo.
3. **WAHA** - aluno assina WAHA por conta propria; **adapter novo a construir** no template (nao existe hoje).
4. **Z-API** - aluno assina Z-API por conta propria; **adapter novo a construir** no template (nao existe hoje).
5. **Webhooks multi-provider de entrada** - Umbler e Gupshup ja existem e continuam; novos provedores futuros (Meta Developers/Cloud API generico, Datacrazy, etc.) entram no mesmo `InboundWebhookParserRegistry` sem alterar o nucleo. Esses parsers **sempre ficam no template**, nunca sao removidos na sanitizacao (secao 3.1).

Justificativa de a NOD API ser um "broker PalmUP" aceitavel (diferente do broker OAuth Meta, que ficou fora da v1 na secao 7): e um produto comercial da PalmUP com preco fixo e baixo (R$20/mes), autenticado pela mesma License que ja existe, sem exigir App Review de terceiro nem redirect URIs dinamicos - complexidade muito menor que o broker Meta.

## 4. Estrategia de Repositorio e Updates

- Repo publico oficial: **`nod-rastrackdash-wpp`**, gerado a partir de `dash-com-ia` por um processo de publicacao sanitizado (nao e o mesmo repo, nao e um fork automatico continuo).
- A PalmUP mantem esse repo como **upstream oficial**. Releases sao marcadas com **tags semver** (`v1.0.0`, `v1.1.0`, ...).
- O aluno, ao clonar, adiciona o remote oficial (`git remote add upstream https://github.com/<org>/nod-rastrackdash-wpp.git`) e recebe atualizacoes com `git fetch upstream && git merge upstream/vX.Y.Z` (documentado passo a passo, incluindo o que fazer em caso de conflito em arquivo customizado).
- Cada release traz um `CHANGELOG.md` com secao explicita de **BREAKING CHANGES** (migrations obrigatorias, variaveis de ambiente novas, remocao de endpoints).
- Processo de publicacao de uma nova versao do template (interno, PalmUP):
  1. Trabalho normal continua em `dash-com-ia`.
  2. Ao cortar uma release do template, um processo de sanitizacao remove o que esta listado em 3.1, gera o diff contra a ultima versao publicada e roda uma checagem automatica de segredos (secao 12).
  3. Push para `nod-rastrackdash-wpp` + tag.
- `[DECISAO PENDENTE - MENOR]` Frequencia/gatilho exato de quando cortar uma release do template (a cada N sprints do WppTrack vs sob demanda). Recomendacao: sob demanda, no maximo mensal, para nao acumular divergencia grande nem gerar ruido de merge constante para o aluno.

## 5. Licenciamento L1 - Visao de Produto

Ciclo de vida da chave, ponta a ponta:

1. **Compra**: aluno compra no checkout Guru (canal de venda atual da PalmUP, sem mudanca de checkout).
2. **Emissao**: Guru dispara webhook de compra aprovada para um endpoint interno do dash-com-ia. O dash-com-ia gera uma `License` nova associada ao comprador e a transacao Guru.
3. **Entrega**: a chave e enviada ao comprador pelo **modulo de notificacao do dash-com-ia** (decisao 17): e-mail transacional e mensagem WhatsApp, disparados a partir do mesmo webhook de compra aprovada. Passa a ser parte do escopo tecnico desta spec (secao 6.7).
4. **Clone**: aluno clona `nod-rastrackdash-wpp`.
5. **Ativacao**: no primeiro boot do app do aluno, ele informa a chave. O client de licenca (dentro do template) chama `POST /license/activate` no license server da PalmUP, registrando um fingerprint da instancia (telemetria, nao enforcement - decisao 12).
6. **Validacao continua**: o app valida a licenca no boot e periodicamente via heartbeat (6-12h). Cada validacao bem-sucedida renova um cache local assinado.
7. **Grace**: se o app nao conseguir falar com o license server (rede fora, servidor fora do ar), ele continua funcionando normalmente usando o ultimo cache assinado valido, por ate **72h** desde a ultima validacao bem-sucedida.
8. **Revogacao**: se a compra e reembolsada, sofre chargeback, ou a PalmUP revoga manualmente por abuso detectado, a proxima comunicacao do app com o license server retorna `revoked` e o app entra em estado bloqueado, mesmo dentro da janela de grace.
9. **Renovacao/expiracao**: DECISAO - o modelo comercial e **assinatura**, a principio **anual** (periodos futuros como mensal/semestral podem ser adicionados depois, sem redesenho - decisao 13). A compra ativa uma assinatura com periodo definido (`License.expiresAt`, secao 6.1). A renovacao ocorre via novo pagamento aprovado na Guru; o webhook de recobranca estende `expiresAt` na `License` existente (mesma chave, sem reemissao - secao 6.4). Se a assinatura expirar sem renovacao, a licenca entra no mesmo fluxo de grace do item 7 e, apos o grace, e bloqueada (soft-lock, ver estados abaixo) exatamente como uma revogacao - com a diferenca de que e **reversivel**: uma renovacao aprovada reativa a chave automaticamente na proxima validacao. `[DECISAO PENDENTE - MENOR]` o mecanismo exato do webhook de renovacao/recobranca da Guru (nome do evento, payload) precisa ser confirmado no plano de implementacao (secao 6.4).

Estados do app (visiveis para o aluno, ex.: banner no backoffice + resposta de erro clara nas rotas protegidas):

- **Ativo**: heartbeat recente bem-sucedido, licenca valida e dentro do periodo de assinatura (`expiresAt` no futuro).
- **Grace**: sem comunicacao bem-sucedida ha menos de 72h, OU assinatura expirada (`expiresAt` no passado) mas ainda dentro da janela de tolerancia; funcionalidade completa, com aviso visivel de que a licenca precisa revalidar/renovar.
- **Bloqueado (soft-lock)**: grace expirado sem sucesso, assinatura expirada sem renovacao apos o grace, OU revogacao confirmada pelo server (reembolso/chargeback/fraude).

DECISAO - comportamento do estado bloqueado: **soft-lock**. Trava criacao/edicao e funcionalidades novas, mas mantem leitura dos dados ja coletados, para o aluno nao perder acesso aos dados dos clientes dele durante uma disputa de reembolso, uma expiracao de assinatura em processo de renovacao, ou instabilidade do license server. Hard-lock total (bloqueio completo da aplicacao) fica reservado exclusivamente para revogacao confirmada por fraude, a criterio da PalmUP via admin interno (secao 6.5) - nao e o comportamento padrao de expiracao/grace.

## 6. Licenciamento L1 - Modelo de Dados e Endpoints

Tudo nesta secao vive no `apps/api` do **dash-com-ia** (nao no template), exceto onde marcado "client".

### 6.1 Modelo de dados (novo, dentro do dash-com-ia)

**`License`**
- `id`
- `key` (identificador entregue ao aluno, formato tipo `PALMUP-XXXX-XXXX-XXXX-XXXX`)
- `keyHash` (hash da chave para comparacao; a chave em texto puro nao fica armazenada apos emissao, so no e-mail de entrega)
- `buyerEmail`, `buyerName`
- `guruTransactionId` (referencia externa da compra)
- `productSku` (permite mais de um produto/plano no futuro; tambem cobre o add-on NOD API se ele for modelado como SKU separado em vez de entitlement proprio - decisao 16, `[DECISAO PENDENTE - MENOR]` em 3.4/16)
- `interval`: `annual` na v1 (`monthly`, `semiannual` etc. reservados para o futuro, enum ja preparado - decisao 13)
- `expiresAt` (fim do periodo pago corrente; renovacao aprovada estende este campo na mesma `License`, sem reemitir chave)
- `status`: `active | refunded | chargeback | revoked` (expiracao por tempo NAO e um valor de `status` - e calculada comparando `expiresAt` com o momento da validacao, alimentando os estados ativo/grace/bloqueado da secao 5)
- `issuedAt`, `revokedAt`, `revokedReason`
- `boundAccountEmail`, `boundAccountId` (nullable ate o primeiro `activate` bem-sucedido; binding de conta anti-compartilhamento - decisao 17, secao 6.6), `boundAt`

**`LicenseActivation`** (registro/telemetria, nao enforcement - decisao 12)
- `id`, `licenseId`
- `fingerprint` (gerado e persistido pelo client do template em `LicenseState`, ver secao 6.3)
- `appVersion`, `deployLabel` (opcional, autodeclarado pelo aluno, ex.: dominio do deploy)
- `firstActivatedAt`, `lastHeartbeatAt`, `lastHeartbeatStatus` (`ok | stale`)
- `ipAddress` (best-effort, so para auditoria)

**`LicenseWebhookEvent`**
- `id`
- `provider` (`guru`)
- `eventType` (`purchase_approved`, `renewal_approved`, `refund`, `chargeback`)
- `externalTransactionId`
- `signatureValid` (boolean)
- `receivedAt`, `processedAt`
- `resultStatus` (`license_issued | license_renewed | license_revoked | ignored_duplicate | signature_invalid | error`)

`externalTransactionId` garante idempotencia: o mesmo evento Guru reprocessado nao emite/revoga duas vezes.

### 6.2 Endpoints publicos (chamados pelo client dentro do template do aluno)

- `POST /license/activate` - `{ key, fingerprint, appVersion, accountIdentity }` -> cache assinado + status, ou 403 se chave invalida/revogada, **ou 403 se `accountIdentity` nao bater com a conta ja vinculada a essa License** (binding de conta, secao 6.6).
- `POST /license/heartbeat` - `{ key, fingerprint }` -> renova o cache assinado, atualiza `lastHeartbeatAt`.
- `GET /license/public-key` - expoe a chave publica usada para verificar a assinatura do cache offline, sem round-trip a cada leitura (ver 6.3).

Ambos os endpoints publicos tem **rate-limit por chave e por IP** para mitigar brute-force/enumeracao de chaves.

### 6.3 Cache local assinado

- O license server assina um payload (`{ licenseKeyHash, status, expiresAt, issuedAt, validUntil, iat }`) com uma chave privada mantida **apenas** no dash-com-ia. `expiresAt` reflete o fim do periodo de assinatura pago (secao 6.1); o client compara `expiresAt` com a hora local para decidir entre ativo/grace, alem da checagem de `validUntil`/`status` ja existente.
- O client do template guarda esse token assinado e verifica a assinatura com a chave publica (nao secreta, pode estar embutida no template ou buscada em `GET /license/public-key`).
- `validUntil` = momento da assinatura + 72h de grace. Enquanto `validUntil` nao expirou, o app roda normalmente mesmo sem contato novo com o server.
- Uma resposta explicita `revoked` do server sobrescreve o cache imediatamente, independente do `validUntil` restante.
- `[DECISAO PENDENTE - MENOR]` Algoritmo de assinatura: recomendacao Ed25519 (assimetrico) em vez de HMAC simetrico, porque a chave publica de verificacao pode ficar em um repo publico sem risco - so quem tem a chave privada (dash-com-ia) consegue forjar um cache valido.
- DECISAO - o client do template persiste o cache/fingerprint em uma tabela propria no Postgres do proprio aluno (`LicenseState`), nao em arquivo em disco, porque sobrevive a redeploy de container. Trocar de banco gera nova ativacao - aceitavel dado que instancias sao ilimitadas (decisao 12).

### 6.4 Webhook Guru

- `POST` interno (nao exposto no template) recebe o evento de compra/renovacao/reembolso/chargeback da Guru.
- Toda chamada exige validacao de assinatura/segredo compartilhado antes de processar. Payload sem assinatura valida vira `LicenseWebhookEvent` com `signatureValid: false` e nao emite/revoga/renova nada.
- **Renovacao/recobranca**: evento `renewal_approved` estende `expiresAt` da `License` existente (mesma chave, mesmo comprador via `guruTransactionId`/`buyerEmail`), sem gerar nova chave (secao 5, item 9).
- `[DECISAO PENDENTE - MENOR]` O mecanismo exato de assinatura de webhook da Guru (HMAC de header, secret em query string, etc.), incluindo o evento especifico de renovacao/recobranca de assinatura, nao foi verificado contra a documentacao oficial atual da Guru nesta spec. Recomendacao: confirmar ambos (mecanismo de assinatura e nome/payload do evento de renovacao) no plano de implementacao antes de codar; se a Guru nao oferecer assinatura nativa, usar um segredo compartilhado fixo como mitigacao minima e nunca aceitar o webhook sem ele.
- Reembolso/chargeback -> `License.status = refunded/chargeback`, proxima ativacao/heartbeat retorna bloqueio (soft-lock). Expiracao de assinatura sem renovacao segue o mesmo destino via `expiresAt` (secao 5), sem alterar `status`.

### 6.5 Admin interno (dash-com-ia, nao vai para o template)

Uma tela/rotas de backoffice interno da PalmUP (nao o backoffice do aluno) para: listar licencas, ver historico de ativacoes por chave, revogar manualmente, reenviar chave. Serve tambem para a mitigacao manual do risco de chave compartilhada (secao 13).

### 6.6 Binding de Conta (1 Licenca = 1 Conta) - anti-compartilhamento (decisao 17)

Ajuste de escopo do turno 7 sobre a decisao 12: instancias continuam ilimitadas para o **mesmo** aluno, mas a chave passa a ser vinculada a **uma unica conta/identidade de comprador**, para impedir que a mesma chave seja usada por pessoas diferentes.

- No primeiro `activate` bem-sucedido, a `License` fica `bound` a uma identidade (`boundAccountEmail`/`boundAccountId`, secao 6.1) - por padrao, o e-mail do comprador na Guru (`buyerEmail`), ou uma identidade de conta criada no primeiro boot do app do aluno, a definir no plano de implementacao.
- Ativacoes seguintes (novas instancias do mesmo aluno, decisao 12 continua valendo) precisam apresentar o mesmo `accountIdentity` no `POST /license/activate` - por exemplo, o e-mail do admin configurado no deploy bate com `boundAccountEmail`, ou um token de conta emitido no primeiro `activate` e reenviado nas chamadas seguintes.
- Identidade divergente -> `403` (secao 6.2) + registro de abuso visivel no admin interno (secao 6.5), reaproveitando o mesmo padrao de auditoria de `LicenseActivation`.
- O admin interno da PalmUP pode fazer rebind manual (troca de e-mail legitima do aluno).
- Isso e **enforcement real**, diferente do limite de instancias (que continua so telemetria, decisao 12) - ver distincao tambem na secao 14.

### 6.7 Entrega da Licenca - Modulo de Notificacao (decisao 17)

Novo modulo dentro do dash-com-ia (nao vai para o template, secao 3.1), acionado pelo mesmo webhook Guru da secao 6.4.

- **Gatilho**: `LicenseWebhookEvent` do tipo `purchase_approved`/`renewal_approved` processado com sucesso (emite ou renova a `License`) enfileira uma notificacao de entrega/renovacao de chave.
- **Canal e-mail**: reaproveita a infraestrutura ja existente no dash-com-ia - fila `transactional-email` via BullMQ (`apps/api/src/email/email-queue.service.ts`), transporte SMTP via `nodemailer` (`apps/api/src/email/email.transport.ts`), com **Brevo** ja fixado hoje como relay de producao (`apps/api/src/config/deployment-config.ts`, funcao `assertProductionBrevoConfig`, exige `smtp-relay.brevo.com:587` e remetente `noreply@rastrack.app`/`suporte@rastrack.app`). Como quem entrega a chave e a PalmUP (nao o aluno), usa o Brevo/dominio da PalmUP normalmente, sem mudanca de configuracao. Os templates hoje existentes (`apps/api/src/email/email.types.ts`: `workspace_invitation`, `password_reset`, `email_verification`, `client_owner_activation`, `workspace_access_granted`) **nao cobrem entrega de chave** - precisa de um template novo (ex.: `license_key_delivery`), seguindo o mesmo padrao de envelope criptografado (`email-envelope-crypto.service.ts`) e auditoria de entrega (`email-delivery-audit.service.ts`, status `queued | retrying | sent | failed`).
- **Canal WhatsApp**: **nao existe hoje nenhum envio de mensagem outbound no dash-com-ia** - `apps/api/src/integrations/uazapi/uazapi.adapter.ts` so gerencia instancia/QR/webhook/labels, sem metodo de envio. Precisa ser construido do zero (endpoint de envio de mensagem via uma instancia Uazapi administrativa da PalmUP, ou via o broker NOD API da secao 3.4) - ponto de plano de implementacao, `[DECISAO PENDENTE - MENOR]` qual das duas (ver secao 16).
- **Conteudo dos templates** (e-mail e WhatsApp): chave de licenca, link do repo `nod-rastrackdash-wpp`, prompt de partida da IA (secao 10.2), validade (`expiresAt`).
- **Falha nao bloqueia emissao**: a `License` existe/e renovada independente do resultado do envio, mesmo padrao ja usado no fluxo de convites/ativacao de cliente hoje. Reenvio manual pelo admin interno (secao 6.5) reaproveita o mesmo padrao de UX ja existente para "reenviar" (`resendInvite` em `workspaces.service.ts` para convites de equipe; `resendClientOwnerAccess`, tambem em `workspaces.service.ts`, para acesso de dono de workspace) - so que aplicado a "reenviar chave de licenca".

## 7. Integracao Meta

- Fluxo principal da v1: **token manual / System User**, reaproveitando `meta-manual-connections.service.ts` e o guia `docs/setup/meta-manual-connections.md` ja existentes no dash-com-ia, adaptados para o contexto do aluno (o aluno usa o proprio Business Manager, nao o da PalmUP).
- OAuth Meta fica **desabilitado/removido** na v1 da edicao aluno (o codigo de callback/`MetaOAuthState` nao vai para o template).
- Estrutura para "app Meta proprio do aluno" fica documentada como caminho **avancado opcional**, para quem quiser configurar login social Meta - nao e o caminho suportado por padrao.
- Broker OAuth centralizado da PalmUP (aluno usaria o app Meta da PalmUP sem expor `META_APP_SECRET`) fica **fora da v1**, marcado para fase 2+. Motivo tecnico (ja levantado no brainstorming): exigiria um servico proxy externo mantido pela PalmUP para trocar `code` por token sem expor o secret no deploy do aluno, com redirect URIs dinamicos por dominio de aluno e App Review da Meta cobrindo multiplos dominios - viavel, mas complexidade/operacao alta para a v1.

## 8. Billing

- Billing fechado (Asaas + split da PalmUP) **nao vai para a v1** da edicao aluno (decisao 3). Motivo: cada aluno pode usar gateway diferente (Asaas, Hotmart) ou nem cobrar o cliente final dele.
- O template deixa um **guia orientado por gateway** em vez de simplesmente remover a funcionalidade e nao dizer nada:
  - `docs/setup/billing/` explica o que precisa existir (cobranca recorrente por cliente/workspace, ativacao/desativacao por pagamento) e da um caminho passo a passo para plugar Asaas ou Hotmart, reaproveitando conceitos ja existentes no dash-com-ia (`WhatsappInstanceActivation`, `PaymentCharge`) como referencia de padrao, mesmo que o codigo de producao nao va junto.
  - Pontos de extensao ficam nomeados no codigo (ex.: interface de adapter de pagamento) mesmo sem implementacao padrao, para o aluno saber onde plugar.
- Sem billing fechado, nada impede o aluno de nunca cobrar o cliente final dele. Isso e aceito como fora de escopo (nao e responsabilidade da PalmUP garantir a monetizacao do aluno na v1).

## 9. Backoffice do Aluno

Escopo do backoffice clonado (versao **A simplificado**):

- Workspaces/clientes: criar, listar, gerenciar membros do proprio aluno (reaproveita `Workspace`, `WorkspaceMember`, `WorkspaceRole` do dash-com-ia).
- Logs/diagnostico: reaproveita a Central de Diagnostico existente (`DiagnosticEvent`, `WebhookLog`, `IntegrationLog`, `JobAttempt`, `AuditLog`) como ferramenta de suporte do proprio aluno para os proprios clientes.
- Aba **Licenca** (somente leitura): status da propria chave (ativo/grace/bloqueado), data do ultimo heartbeat bem-sucedido. O aluno **nao** pode editar ou revogar a propria licenca por essa tela - isso e gerido exclusivamente pelo admin interno da PalmUP (secao 6.5).

O que sai em relacao ao backoffice B+ atual da PalmUP:

- Split financeiro e faturamento global da PalmUP.
- Provisionamento multi-cliente-pagante da PalmUP com sessao de suporte auditada disfarcada (ver 3.1).
- Gestao de outros alunos/licencas - isso fica inteiramente no dash-com-ia interno, fora do template.

### 9.1 Provisionamento de Clientes do Aluno (Brevo BYO + link de senha)

Confirmado contra o codigo real do dash-com-ia (turno 7, item G): o fluxo de "aluno cria um cliente novo" reaproveita, sem redesenho, o mesmo mecanismo ja usado hoje para o dono de um workspace:

- Rota real hoje: `POST /backoffice/workspaces/:workspaceId/owners/:ownerUserId/activation-link` (`apps/api/src/workspaces/backoffice-workspaces.controller.ts`, chamando `workspacesService.issueClientOwnerActivationLink` -> `authService.issueClientOwnerActivationLink`) gera um token de ativacao (`AuthActionToken` tipo `account_activation`, com TTL proprio) e devolve o link cru para o operador copiar/enviar manualmente. Existe tambem `resendClientOwnerAccess`, que reenvia automaticamente por e-mail (fila, template `client_owner_activation`).
- Hoje essa rota e protegida por `platformAdminService.assertPlatformAdmin` - ou seja, e uma ferramenta de staff interno da PalmUP. No modelo do aluno (decisao 1/5, backoffice clonado = backoffice do proprio aluno, mini-PalmUP), **o proprio aluno passa a ser esse "platform admin" dentro da instancia dele** - a mesma rota/botao serve, sem mudanca de arquitetura, so muda quem esta logado.
- Padrao de UX ja existente e reaproveitavel: convites de equipe (`createInvite`/`resendInvite` em `workspaces.service.ts`) ja retornam `acceptUrl` na resposta (token cru nao persistido) com botao "Copiar link" em Settings - mesmo padrao aplicavel ao link de senha do cliente.
- **E-mail e Brevo, confirmado no codigo**: `apps/api/src/email` usa SMTP generico via `nodemailer` (`email.transport.ts`), mas a producao hoje **exige especificamente Brevo** (`apps/api/src/config/deployment-config.ts`, `assertProductionBrevoConfig`, valida `smtp-relay.brevo.com:587` e remetente `@rastrack.app`). Para o template, isso precisa virar **BYO Brevo do aluno**: as variaveis `SMTP_HOST/PORT/USER/PASSWORD/SECURE` continuam existindo, mas a validacao hardcoded para o dominio da PalmUP precisa ser generalizada/removida no template - senao o e-mail do aluno nunca valida em producao com o Brevo e dominio proprio dele. Isso e um ponto real de trabalho a incluir no plano de implementacao (secao 16), nao so documentacao.
- Guia no template: aluno cria conta Brevo propria (BYO, nao a da PalmUP), configura as variaveis `SMTP_*`, confirma a saude da configuracao via `EmailConfigurationService.getHealth()` (endpoint ja existente) antes de gerar o primeiro link de senha para um cliente dele.

## 10. Onboarding Pos-Clone e Documentacao AI-First

### 10.1 Fluxo do onboarding

Passo a passo apos o clone: `.env` -> chave de licenca -> banco/migrations -> admin boot -> primeiro cliente/workspace -> Meta manual -> deploy (Dokploy + Vercel).

Formato proposto (combinacao, nao um unico canal):

1. **Docs guiadas deterministicas** (`docs/setup/*.md` no template): passos com comandos exatos e criterios de verificacao executaveis (ex.: "rode `X`, a saida esperada e `Y`"), nao so prosa. Publico primario: uma ferramenta de IA lendo e guiando o aluno (ver 10.2); publico secundario: o aluno lendo direto.
2. **Script de setup** (`pnpm setup` ou equivalente): automatiza o que for mecanico e seguro de automatizar - gerar `.env` a partir do `.env.example`, rodar `prisma migrate deploy`, criar o primeiro usuario admin via prompt interativo. Idempotente (pode rodar de novo sem quebrar um setup ja feito).
3. **Checklist interativo no proprio app** (tela/banner no backoffice mostrando progresso real, nao autodeclarado): banco conectado, licenca ativa, Meta conectado, primeiro cliente criado. Da ao aluno confirmacao de que o sistema realmente esta no estado esperado, nao so "eu segui os passos".

Justificativa da combinacao: docs cobrem o caso majoritario (assistido por IA); o script reduz erro humano nos passos mecanicos; o checklist no app da feedback verificavel em vez de depender de o aluno confiar que seguiu tudo certo.

### 10.2 Documentacao AI-first

Requisito explicito do Samuel: a grande maioria dos alunos (~99,9%) vai configurar o projeto **assistido por uma ferramenta de IA** (Claude Code, Codex/GPT, Grok etc. - "vibe coding"). A orientacao oficial do produto sera "use uma plataforma de vibe coding para fazer a configuracao inicial". Consequencia direta: a documentacao precisa ser estruturada primeiro para uma IA ler e guiar o aluno, e so depois para leitura humana direta.

Implicacoes praticas no template:

- `AGENTS.md` / `CLAUDE.md` na raiz do repo, com contexto de produto (o que e o RastrackDash, o que e o aluno, o que e o cliente do aluno), comandos exatos de setup, fluxo de ativacao de licenca, e onde estao os pontos de customizacao seguros (aponta para `docs/CUSTOMIZATION.md`, secao 3.3).
- Docs de setup com passos verificaveis por comando (nao so descricao textual do que fazer).
- `.env.example` comentado: cada variavel com proposito, se e obrigatoria, e onde o aluno consegue o valor (ex.: onde pegar o token Uazapi, onde pegar o token System User da Meta).
- Scripts de setup descobriveis (`pnpm setup`) documentados no `AGENTS.md`.
- Secao dedicada "como guiar um aluno com IA", incluindo um **prompt de partida** pronto para o aluno colar na ferramenta de IA dele, do tipo: "Voce vai me ajudar a configurar o RastrackDash. Leia `AGENTS.md` e `docs/setup/`, me pergunte minha chave de licenca, guie a configuracao do banco, integracao Meta manual e o primeiro cliente, e verifique cada passo antes de seguir para o proximo."

### 10.3 Infraestrutura de VPS e Afiliados (turno 7)

Nova subsecao de documentacao (nao um provisionador automatico na v1):

- `docs/setup/vps.md` orienta o aluno a provisionar uma VPS propria (Dokploy + Postgres + Redis, mesmo padrao de infra ja usado pelo dash-com-ia hoje).
- Links de afiliado ficam como **placeholder** ate o Samuel fornecer as URLs reais - nao inventar: `[AFILIADO_HOSTGATOR]`, `[AFILIADO_DIGITALOCEAN]`, `[AFILIADO_CONTABO]` (`[DECISAO PENDENTE - MENOR]`, ver secao 16).
- Faixas de sizing (base, sujeita a ajuste fino):
  - VPS minima: 2GB RAM / 80GB disco / 2 vCPU.
  - VPS recomendada: 8GB RAM / 160GB disco / 4 vCPU.
- **Dimensionamento guiado**: a doc e o prompt de partida da IA (secao 10.2) perguntam ao aluno (1) quantos clientes/workspaces pretende rodar e (2) quantos leads/dia em media espera receber, e recomendam o tier:

| Clientes/workspaces | Leads/dia | Tier recomendado |
|---|---|---|
| ate 5 | menos de 500 | VPS minima |
| 5 a 20 | ate 5.000 | VPS recomendada |
| acima de 20 | acima de 5.000 | falar com suporte / VPS maior sob medida |

## 11. Branding

- "powered by PalmUP" fixo no footer do painel, **nao removivel** na v1.
- A marca **RastrackDash** (nome do produto-base, decisao 15) tambem permanece visivel de forma residual mesmo depois do aluno customizar o nome comercial da propria agencia - ex.: footer no formato `{Nome da Agencia do Aluno} · RastrackDash · powered by PalmUP` (ou subtitulo equivalente na tela de login/backoffice, a fixar no plano de implementacao). Nenhuma das duas marcas (RastrackDash, powered by PalmUP) e removivel na v1 (decisao 6, turno 7).
- Pontos de customizacao do aluno (whitelabel da agencia dele, turno 7): nome do produto exibido, **logo, favicon, cor primaria** - via variaveis de ambiente/tema/painel, sem mexer em codigo core.
- Funciona como **whitelabel da agencia do aluno**: o cliente final do aluno ve a marca da agencia dele em destaque, com RastrackDash/PalmUP aparecendo apenas de forma residual no footer, nao como marca principal.
- Limites: o aluno nao pode remover o footer nem a mencao residual RastrackDash, nem se apresentar como PalmUP; a estrutura/layout core do produto nao e ponto de customizacao livre (fica marcada `PALMUP-CORE`, secao 3.3).

## 12. Seguranca Fail-Closed

- **Alinhamento com o padrao do projeto**: fail-closed segue o mesmo checklist de seguranca "Mano Deyvin" ja usado nas revisoes de PR do dash-com-ia (ex.: revisao fail-closed + checklist Mano Deyvin no diff, registrado em `Projeto.md`) - nao e um processo novo inventado para esta spec.
- **Nenhuma chave/segredo no frontend**, explicitamente para todos os provedores da secao 3.4/16: tokens Meta, Uazapi/NOD API/WAHA/Z-API, chave privada de assinatura de licenca, credenciais Asaas da PalmUP, segredo do webhook Guru - todos ficam so no backend do aluno (ou no dash-com-ia interno, quando aplicavel); `apps/web` nunca recebe esses tokens de servico.
- **Padroes ja em vigor no WppTrack que o template herda sem inventar nada novo**: RLS onde ja existir no schema; anti-IDOR multi-tenant (todo acesso a recurso escopado por `workspaceId` + membership, mesmo padrao hoje); validacao de input via Zod/DTOs (padrao ja usado em todos os controllers); rate-limit nos endpoints publicos (ja decidido para `/license/*`, secao 6.2); cookies de sessao `HttpOnly` (ja o padrao hoje em `apps/api/src/auth/session-cookie.ts`); sanitizacao de upload de arquivo, se e quando o template vier a expor upload (nao foi identificada superficie de upload nos modulos que ficam, secao 3.2 - nao inventar antes de existir).
- **Repo publico**: o codigo que vaza no template inclui a logica cliente de verificacao de licenca e a chave publica de assinatura. Isso e aceitavel porque essa chave so verifica, nao emite - a logica de emissao/revogacao fica 100% no dash-com-ia interno, nunca no template.
- **Chave compartilhada entre alunos**: nao ha bloqueio tecnico automatico na v1 (decisao 12). Mitigacao e deteccao manual (numero anormal de fingerprints/deploys distintos por chave, visivel no admin interno de 6.5) seguida de revogacao manual.
- **Webhook Guru falsificado**: nenhum evento e processado sem assinatura/segredo valido (secao 6.4); eventos duplicados sao ignorados por `externalTransactionId`.
- **License server como alvo**: mora dentro da infra ja existente e monitorada do dash-com-ia; rate-limit nos endpoints publicos (6.2); nenhum endpoint de emissao/revogacao e exposto publicamente.
- **Dados no repo template**: o processo de publicacao (secao 4) precisa garantir, antes de qualquer push publico: nenhum `.env` real, nenhum segredo (Meta app secret, token Asaas, segredo de webhook Guru, chave privada de assinatura de licenca), nenhum dado de cliente/lead real de workspaces de producao da PalmUP.
- **Client nunca decide sozinho**: o client de licenca no template nunca trata "ja validei uma vez" como permanente - sempre depende de assinatura verificavel com expiracao curta (72h de grace), renovada por heartbeat.

## 13. Riscos Conhecidos e Mitigacoes

| Risco | Mitigacao |
|---|---|
| Chave vazada/compartilhada entre varios alunos sem bloqueio automatico | Deteccao manual por contagem de fingerprints/deploys distintos por chave no admin interno + revogacao manual quando abuso for identificado |
| License server fora do ar bloqueia todos os alunos apos o grace | Grace generoso de 72h, monitoramento/alerta do proprio servico dentro do dash-com-ia; redundancia fica para trabalho futuro |
| Mecanismo real de assinatura de webhook da Guru (incluindo o evento de renovacao/recobranca de assinatura) ainda nao verificado contra a doc oficial | Confirmar ambos no plano de implementacao antes de codar; nunca aceitar webhook sem segredo compartilhado validado |
| Aluno diverge tanto do upstream que updates futuros quebram o merge | Convencao `PALMUP-CORE` (secao 3.3) + `CHANGELOG.md` com BREAKING CHANGES explicitos por release |
| Sanitizacao da publicacao falha e vaza segredo/dado real no repo publico | Checklist e verificacao automatica de padroes de segredo antes de cada push publico do template (secao 4) |
| Sem billing fechado, aluno pode nunca cobrar o cliente final dele | Aceito como fora de escopo da v1; guia orientado por gateway fica disponivel (secao 8) |

## 14. Fora de Escopo v1

- Broker OAuth Meta centralizado da PalmUP (fica para fase 2+).
- Billing/assinatura fechada (Asaas + split) para o aluno cobrar o cliente final dele.
- Suporte a checkout diferente de Guru para emissao de licenca.
- Enforcement automatico de limite de **quantidade** de instancias por chave para o mesmo aluno (fingerprint fica so telemetria, decisao 12) - nao confundir com o binding de conta (decisao 17, secao 6.6), que **e** enforced e bloqueia identidade diferente, nao quantidade.
- App Meta proprio do aluno como fluxo padrao (fica avancado opcional).
- Migracao automatica de dados de clientes existentes do aluno para dentro do produto.
- Redundancia/alta disponibilidade do license server.
- App mobile.
- Decisao final sobre incluir o estado atual do modulo XMAX (conversoes unificadas) na primeira geracao do template.

## 15. Criterios de Aceite

- Um aluno consegue: comprar na Guru, receber a chave, clonar `nod-rastrackdash-wpp`, ativar a chave e ter o app rodando em estado `ativo`.
- Derrubar a conectividade com o license server por menos de 72h nao interrompe o uso do app (estado `grace`).
- Uma revogacao (reembolso/chargeback/manual) bloqueia o app (soft-lock) na proxima comunicacao bem-sucedida com o server, mesmo dentro da janela de grace.
- Uma assinatura que expira sem renovacao entra em grace e, apos o grace, e bloqueada em soft-lock (leitura dos dados ja coletados continua disponivel); uma renovacao aprovada na Guru reverte esse bloqueio automaticamente na proxima validacao, sem exigir nova chave.
- A mesma chave ativa mais de uma instancia sem ser bloqueada tecnicamente; cada ativacao gera um registro de telemetria (`LicenseActivation`) visivel no admin interno.
- Um evento de webhook Guru sem assinatura valida nunca emite ou revoga uma licenca.
- O template gerado nao contem `.env` real, segredos da PalmUP ou dados de clientes de producao.
- O backoffice do aluno consegue criar workspace/cliente, ver diagnosticos e ver o status (somente leitura) da propria licenca, sem acesso a funcoes de emissao/revogacao.
- A documentacao de setup do template e seguivel por uma ferramenta de IA sem intervencao humana alem de fornecer valores de ambiente e a chave de licenca.
- Uma tentativa de `activate` com identidade de conta diferente da ja vinculada a uma `License` retorna 403, mesmo com a chave correta (binding de conta, secao 6.6).
- O comprador recebe a chave por e-mail e/ou WhatsApp apos a compra ser aprovada na Guru; falha na entrega nao impede a `License` de existir, e o admin interno consegue reenviar (secao 6.7).
- O aluno consegue configurar ao menos um provedor de WhatsApp (Uazapi direta, WAHA, Z-API ou NOD API) sem editar codigo core, e os webhooks multi-provider de entrada (Umbler, Gupshup e futuros) continuam funcionando no template (secao 3.4).
- O aluno consegue customizar nome, logo, favicon e cor primaria mantendo o footer "powered by PalmUP" e a marca residual RastrackDash visiveis e nao removiveis (secao 11).

## 16. Proximo Passo

Este documento tem 6 pendencias menores (nao bloqueantes) a confirmar com o Samuel antes de virar plano de implementacao (lista consolidada abaixo); nenhuma delas muda a arquitetura ja decidida nesta spec. Depois de fechadas (ou aceitas com a recomendacao ja registrada), o proximo passo e criar um plano de implementacao especifico (skill `writing-plans`), na ordem sugerida:

1. Modulo de licenciamento no `apps/api` do dash-com-ia (modelo de dados incluindo binding de conta, endpoints, assinatura, webhook Guru, admin interno - secoes 6.1 a 6.6).
2. Modulo de notificacao de entrega/reenvio de chave (e-mail via fila ja existente + envio WhatsApp a construir do zero) - secao 6.7.
3. Processo de sanitizacao/publicacao do template (script + checklist de segredos), incluindo remocao de credenciais administrativas NOD API/Uazapi da PalmUP e generalizacao da validacao hardcoded de Brevo (`assertProductionBrevoConfig`) para BYO do aluno.
4. Geracao do template `nod-rastrackdash-wpp` a partir do dash-com-ia (remocao de billing Asaas/split, OAuth Meta, provisionamento platform-owner especifico).
5. Client de licenca dentro do template (ativacao com identidade de conta, heartbeat, cache assinado, estados ativo/grace/bloqueado).
6. Camada de provedores WhatsApp no template (adapters Uazapi/WAHA/Z-API BYO, broker NOD API, mantendo os webhooks multi-provider Umbler/Gupshup existentes) - secao 3.4.
7. Backoffice simplificado do aluno (aba Licenca somente leitura + fluxo de criacao de cliente/link de senha reaproveitado - secao 9.1).
8. Whitelabel de branding (logo, favicon, cor primaria, regra de marca residual RastrackDash) - secao 11.
9. Documentacao AI-first (`AGENTS.md`/`CLAUDE.md`, docs de setup, `.env.example`, `pnpm setup`, prompt de partida), incluindo doc de VPS/afiliados e dimensionamento guiado - secao 10.3.
10. Guia de billing orientado por gateway.
11. Primeira release marcada com tag no repo publico.

### Decisoes pendentes consolidadas (6 pendencias menores, para o Samuel confirmar antes do plano de implementacao)

1. Mecanismo real de assinatura do webhook da Guru, incluindo o evento de renovacao/recobranca de assinatura, a confirmar contra a documentacao oficial atual (secao 6.4).
2. Algoritmo de assinatura do cache local de licenca: recomendacao Ed25519 assimetrico (secao 6.3).
3. Cadencia de corte de novas releases do template: recomendacao sob demanda, no maximo mensal (secao 4).
4. URLs de afiliado reais (HostGator, DigitalOcean, Contabo) - aguardando o Samuel fornecer os links; hoje ficam como placeholder no template (secao 10.3).
5. NOD API como add-on/SKU separado da assinatura anual (`productSku` proprio) vs. entitlement `nod_api` dentro da mesma `License` - o desenho de dados cabe nos dois casos, falta a confirmacao comercial fina (secoes 3.4 e 6.1, decisao 16).
6. Canal tecnico de envio do WhatsApp de notificacao (entrega/reenvio de chave): instancia Uazapi administrativa dedicada da PalmUP, ou reaproveitar o broker NOD API - ambos cabem no desenho, falta escolher no plano de implementacao (secao 6.7).
