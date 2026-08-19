# CUSTOMIZATION.md

O que o aluno pode personalizar sem quebrar updates (`upstream` + tags).

## Seguro editar / configurar

- Nome da agencia, logo, favicon, cor primaria (whitelabel)
- Textos de UI nao marcados como core
- `.env` / secrets **do aluno** (SMTP BYO, Uazapi/WAHA/Z-API BYO, Meta System User do cliente)
- Docs locais de operacao do aluno

## Nao editar (PALMUP-CORE)

- Client de licenca / guards de soft-lock
- Assinatura e verificacao de cache de licenca
- Nucleo de auth multi-tenant, migrations core
- Integracoes core e parsers inbound (a menos que esteja adicionando provider novo no ponto de extensao documentado)
- Footer residual `RastrackDash · powered by PalmUP`

Se precisar customizar core, voce assume o custo de merge em updates futuros.
