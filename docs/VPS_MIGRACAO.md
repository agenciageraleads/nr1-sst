# Migracao Para VPS Propria

Este documento registra o plano de migracao do NR1-SST para uma VPS propria com Postgres.

## Estado Atual

- Frontend local: React + Vite.
- Banco atual no codigo: Postgres via API propria.
- Auth atual no codigo: email/senha proprio com cookie httpOnly.
- Banco alvo informado: Postgres ja existente na VPS.
- Skill local criada para operacoes: `gera-leads-vps`.
- SSH alias local configurado: `gera-leads-vps`.
- Dev local atual: frontend roda com Node/npm; OrbStack instalado; `docker-compose.yml` criado e validado para Postgres/API.

## Skill Codex

A skill foi criada em:

```text
/Users/mariatereza/.codex/skills/gera-leads-vps
```

Ela deve ser usada para:

- acesso seguro a VPS;
- inventario remoto read-only;
- descoberta do Postgres;
- planejamento de migracao Firestore -> Postgres;
- deploy em VPS;
- validacao e rollback.

## Dados Que Precisamos Da VPS

Nao registrar senhas neste arquivo.

- Host/IP:
- Porta SSH:
- Usuario SSH:
- Metodo de acesso: chave, senha temporaria ou outro.
- Usuario tem sudo?
- Dominio/subdominio planejado:
- Caminho de deploy:
- Postgres roda como servico local, Docker ou outro?
- Existe backup atual do Postgres?
- Existe Nginx, Caddy, Apache ou Traefik?

## Arquitetura Alvo Recomendada

- Frontend: build estatico do Vite servido por Nginx no Docker Swarm, roteado pelo Traefik.
- Backend: API propria na VPS, tambem em Docker Swarm, sem expor Postgres ao browser.
- Banco: Postgres dedicado para NR1-SST.
- Secrets: `.env` no servidor, fora do Git.
- Processo: Docker Swarm/Portainer.
- TLS: Traefik com Let's Encrypt, usando `letsencryptresolver`.

## Colecoes Firestore Atuais

- `users`
- `companies`
- `campaigns`
- `company_responses`
- `employee_responses`

## Primeiro Inventario

Quando o acesso estiver configurado por SSH alias, usar:

```bash
/Users/mariatereza/.codex/skills/gera-leads-vps/scripts/remote-inventory.sh gera-leads-vps
```

O resultado deve ser resumido aqui sem segredos.

## Inventario Inicial Em 2026-05-11

- Host/IP: `5.161.247.240`
- Hostname: `Portainer`
- Usuario atual de acesso: `root`
- Sistema: Ubuntu `20.04.6 LTS`
- Kernel: `5.4.0-216-generic`
- Uptime: 101 dias
- RAM: 3.7 GiB total, cerca de 939 MiB disponivel no momento do inventario
- Swap: 4.0 GiB total, 1.8 GiB em uso
- Disco raiz: 75 GiB, 68 GiB usados, 4.7 GiB livres, 94% de uso
- Firewall UFW: inativo
- Docker: `28.1.1`
- Node no servidor: `v20.20.2`
- npm no servidor: `11.2.0`
- Reverse proxy: Traefik `v2.11.2` em Docker Swarm, publicando portas 80 e 443
- Portainer em Docker Swarm

Alertas:

- Ubuntu 20.04 saiu do suporte standard em 2025-05-31.
- Disco esta criticamente cheio para uma migracao com build, banco e backups.
- UFW esta inativo; a exposicao parece depender de Docker/Traefik/regras do provedor.
- A senha root foi usada apenas para instalar chave SSH local; nao registrar senha em docs.

## Docker Swarm

Stacks detectadas:

- `evolution`
- `minio`
- `n8n`
- `pgadmin`
- `pgvector`
- `portainer`
- `postgres`
- `redis`
- `summi`
- `traefik`
- `ventura-sst`

Servicos relevantes:

- `traefik_traefik`: `traefik:v2.11.2`, publica 80/443.
- `postgres_postgres`: `postgres:14`, sem porta publicada diretamente.
- `pgvector_pgvector`: `pgvector/pgvector:pg16`, publica `5433 -> 5432`.
- `ventura-sst_web`: `nginx:alpine`.
- `portainer_portainer`: `portainer/portainer-ce`.
- `pgadmin_pgadmin`: `dpage/pgadmin4`.

Redes detectadas:

- `Portainer`: overlay principal onde estao Traefik, Portainer, Postgres, pgvector e `ventura-sst_web`.
- `summi_summi-internal`: overlay interna do stack Summi.
- `ingress`: rede padrao do Swarm.
- `bridge`, `host`, `none`: redes locais padrao Docker.

Nao ha Docker configs nem Docker secrets cadastrados no Swarm no momento do inventario.

## Roteamento Traefik

Servicos com hosts publicos detectados:

- `evolution_evolution_api`: `evolutionapi.gera-leads.com`
- `minio_minio`: `minio.gera-leads.com`, `s3.gera-leads.com`
- `n8n_n8n_editor`: `n8n.gera-leads.com`
- `n8n_n8n_webhook`: `webhookn8n.gera-leads.com`
- `pgadmin_pgadmin`: `pgadmin.gera-leads.com`
- `portainer_portainer`: `portainer.gera-leads.com`
- `summi_app`: `summivendas.gera-leads.com`
- `summi_summi-frontend`: `summi.gera-leads.com`
- `summi_summi-worker-api`: `worker-summi.gera-leads.com`
- `ventura-sst_web`: `venturatc.com.br`, `www.venturatc.com.br`

Padrao recomendado para o NR1-SST:

- Frontend: `nr01.venturatc.com.br`.
- API: `api-nr01.venturatc.com.br`.
- Manter API e frontend na rede overlay `Portainer` para o Traefik descobrir os servicos.

## Site Ventura Existente

Existe um stack `ventura-sst` ja publicado via Traefik:

- Dominio: `venturatc.com.br` e `www.venturatc.com.br`.
- Service: `ventura-sst_web`.
- Imagem: `nginx:alpine`.
- Caminho no host: `/var/www/ventura-sst`.
- Conteudo servido: `/var/www/ventura-sst/dist` montado em `/usr/share/nginx/html`.
- Config Nginx: `/var/www/ventura-sst/nginx.conf`.
- TLS: Traefik com certresolver `letsencryptresolver`.

Observacao: ha varios arquivos AppleDouble `._*` no diretorio, provavelmente criados por upload a partir de macOS. Antes de novos deploys, limpar ou excluir esses arquivos do artefato.

Volumes Postgres:

- `postgres_data`, montado em `/var/lib/postgresql/data` no servico `postgres_postgres`.
- `pgvector`, montado em `/var/lib/postgresql/data` no servico `pgvector_pgvector`.

## Postgres

Postgres principal:

- Imagem: `postgres:14`
- Versao detectada dentro do container: PostgreSQL `14.20`
- Service: `postgres_postgres`
- Porta: interna no Swarm, sem publicacao direta
- Volume: `postgres_data`

Bancos detectados no Postgres principal:

- `baserow`
- `chatwoot_nestor`
- `dify`
- `documenso`
- `evolution`
- `n8n_queue`
- `portal_eletricista_prod`
- `postgres`
- `typebot`

Postgres com pgvector:

- Imagem: `pgvector/pgvector:pg16`
- Service: `pgvector_pgvector`
- Porta publicada: `5433`
- Volume: `pgvector`

Recomendacao inicial:

- Nao misturar o NR1-SST em bancos existentes antes de confirmar backup e politica de acesso.
- Criar banco dedicado, por exemplo `nr1_sst`, preferencialmente no Postgres principal se o acesso for apenas interno via Swarm/API.
- Avaliar pgvector apenas se houver necessidade real de embeddings/IA semantica.
- Fazer backup do volume/banco antes de criar roles, databases ou migrations.

Roles detectadas no Postgres principal:

- `postgres`: superuser, createdb, login.
- `portal_admin`: login, sem superuser.
- roles internas padrao: `pg_monitor`, `pg_read_all_data`, `pg_write_all_data`, etc.

Tamanhos dos bancos no Postgres principal:

- `evolution`: 2155 MB.
- `n8n_queue`: 1040 MB.
- `chatwoot_nestor`: 633 MB.
- `baserow`: 203 MB.
- `documenso`: 95 MB.
- `typebot`: 46 MB.
- `dify`: 16 MB.
- `postgres`: 8569 kB.
- `portal_eletricista_prod`: 8417 kB.

## Dev Local

Estado da maquina local:

- OrbStack instalado em `/Applications/OrbStack.app`.
- `docker` disponivel em `~/.orbstack/bin/docker`.
- `orb` disponivel em `~/.orbstack/bin/orb`.
- `brew`: nao instalado.
- Node/npm local do projeto ja funciona para frontend.

Para desenvolver a solucao completa localmente, precisamos instalar um runtime de containers ou Postgres local. Opcoes:

- OrbStack: mais simples e leve no macOS.
- Colima + Docker CLI: leve, mas normalmente depende de Homebrew ou instalacao manual.
- Docker Desktop: conhecido, mais pesado, resolve Docker Compose.

Uso validado local:

```text
frontend Vite -> API local -> Postgres local em container
```

Validado em 2026-05-11:

- `npm run lint`: passou.
- `npm run build`: passou.
- `docker compose up -d postgres api`: subiu Postgres/API.
- `GET http://localhost:4000/health`: retornou `{"ok":true}`.
- Login local `admin@nr1.local` / senha de desenvolvimento funcionou.
- Build da imagem web com `deploy/web/Dockerfile`: passou.

## Mapa Do App Atual

Pontos de acoplamento legados com Firebase removidos do codigo operacional:

- [src/lib/api.ts](/Users/mariatereza/Documents/NR1-SST/src/lib/api.ts): cliente HTTP para a API.
- [src/hooks/useAuth.ts](/Users/mariatereza/Documents/NR1-SST/src/hooks/useAuth.ts): usa `GET /me`.
- [src/pages/LoginPage.tsx](/Users/mariatereza/Documents/NR1-SST/src/pages/LoginPage.tsx): login email/senha via `POST /auth/login`.
- Paginas CRUD/relatorios consomem endpoints REST da API.

Operacoes Firestore por area:

- Empresas: listar, criar, atualizar e importar CSV em `companies`.
- Campanhas: listar, criar e excluir em `campaigns`.
- Formularios publicos: buscar campanha ativa por token e criar respostas em `company_responses` e `employee_responses`.
- Dashboard: contagens e ultimas respostas.
- Relatorios/resultados: agregacoes por campanha.
- Configuracoes: listar, criar e excluir usuarios em `users`.

Implicacao: o browser nao acessa Postgres diretamente. Toda persistencia passa pela API.

## API Alvo

Primeiro desenho de API:

- `POST /auth/login`
- `POST /auth/logout`
- `GET /me`
- `GET /users`
- `POST /users`
- `DELETE /users/:email`
- `GET /companies`
- `POST /companies`
- `PATCH /companies/:id`
- `GET /campaigns`
- `POST /campaigns`
- `DELETE /campaigns/:id`
- `GET /public/company-form/:token`
- `POST /public/company-responses`
- `GET /public/employee-form/:token`
- `POST /public/employee-responses`
- `GET /dashboard/summary`
- `GET /reports`
- `GET /reports/:campaignId`
- `GET /results/:campaignId`

Autorizacao:

- Admin/editor para painel.
- Endpoints publicos apenas para campanhas `ativa`.
- Responses anonimas, sem exigir login.

## Schema Postgres Inicial

Tabelas iniciais:

- `users`
- `companies`
- `campaigns`
- `company_responses`
- `employee_responses`

Campos importantes:

- `companies`: `razao_social`, `nome_fantasia`, `cnpj`, `cidade`, `uf`, `ramo_atividade`, `numero_colaboradores`, `responsavel_nome`, `responsavel_email`, `responsavel_telefone`, `status`, timestamps.
- `campaigns`: `company_id`, `name`, `description`, `start_date`, `end_date`, `employee_form_mode`, `status`, `company_form_token`, `employee_form_token`, timestamps.
- `company_responses`: `campaign_id`, `company_id`, `answers jsonb`, `submitted_at`.
- `employee_responses`: `campaign_id`, `company_id`, `sector`, `role_type`, `tenure`, `work_type`, `work_schedule`, `answers jsonb`, `scores jsonb`, `submitted_at`.
- `users`: `email`, `name`, `role`, `created_at`.

Indices iniciais:

- `companies(status)`
- `companies(cnpj)`
- `campaigns(status)`
- `campaigns(company_id)`
- `campaigns(company_form_token)`
- `campaigns(employee_form_token)`
- `company_responses(campaign_id)`
- `employee_responses(campaign_id)`
- `users(email)`

## Plano Para Parar De Depender De Firebase E AI Studio

Fase 1 - Preparar base:

- Liberar espaco em disco ou aumentar volume da VPS.
- Confirmar backup do Postgres atual.
- Criar banco dedicado `nr1_sst`.
- Criar usuario dedicado para a aplicacao, sem usar superuser.

Fase 2 - Backend:

- [x] Criar API Node/TypeScript.
- [x] Adicionar migrations Postgres embutidas no boot da API.
- [x] Implementar endpoints equivalentes ao uso atual do Firestore.
- [x] Criar camada de auth/autorizacao.

Fase 3 - Frontend:

- [x] Criar cliente API no lugar de `src/lib/firebase.ts`.
- [x] Remover acesso direto a Firestore das paginas.
- [x] Manter componentes e fluxos visuais.
- [x] Configurar `VITE_API_URL`.

Fase 4 - Dados:

- Exportar Firestore.
- Transformar documentos para tabelas Postgres.
- Importar em staging.
- Validar contagens e amostras.

Fase 5 - Deploy:

- Criar stack Swarm para `nr1-sst-api`.
- Criar stack/servico para frontend Vite build.
- Roteamento Traefik e TLS.
- Smoke test.
- Cutover.

Fase 6 - Desativacao:

- [x] Remover dependencia de Google AI Studio no runtime.
- [x] Remover dependencia de Firestore no runtime.
- [x] Remover Firebase Auth em favor de auth propria.

## Fases

1. Inventariar VPS e Postgres.
2. Definir schema Postgres inicial.
3. Criar backend/API.
4. Adaptar frontend para consumir API.
5. Migrar dados do Firestore.
6. Validar ambiente de staging.
7. Configurar deploy, TLS e backups.
8. Fazer cutover controlado.
9. Confirmar rollback.

## Pendencias

- [x] Receber acesso da VPS.
- [x] Configurar SSH alias sem salvar segredo no repo.
- [x] Rodar inventario remoto.
- [x] Confirmar versao e topologia inicial do Postgres.
- [x] Mapear stacks, redes, Traefik e Postgres da VPS.
- [x] Mapear acoplamento Firebase/Firestore no frontend.
- [ ] Instalar runtime de containers local: OrbStack.
- [x] Definir backend/API em detalhes.
- [x] Definir estrategia de auth.
- [x] Criar schema e migrations iniciais.
- [x] Definir deploy base em `deploy/swarm/nr1-sst-stack.yml`.

## Artefatos Criados

- [api/server.ts](/Users/mariatereza/Documents/NR1-SST/api/server.ts): API Express, auth propria, endpoints e migrations.
- [api/migrations/001_initial.sql](/Users/mariatereza/Documents/NR1-SST/api/migrations/001_initial.sql): schema SQL inicial.
- [docker-compose.yml](/Users/mariatereza/Documents/NR1-SST/docker-compose.yml): Postgres/API local.
- [deploy/swarm/nr1-sst-stack.yml](/Users/mariatereza/Documents/NR1-SST/deploy/swarm/nr1-sst-stack.yml): base do deploy Swarm para `nr01.venturatc.com.br` e `api-nr01.venturatc.com.br`.
- [deploy/web/Dockerfile](/Users/mariatereza/Documents/NR1-SST/deploy/web/Dockerfile): imagem Nginx do frontend.
- [.env.example](/Users/mariatereza/Documents/NR1-SST/.env.example): variaveis esperadas para frontend/API.

## Deploy Inicial Em Producao - 2026-05-11

Diretorios na VPS:

- Codigo: `/opt/nr1-sst/current`
- Env seguro: `/opt/nr1-sst/.env`
- Backups auxiliares: `/opt/nr1-sst/backups`

Banco criado:

- Database: `nr1_sst`
- Role dedicada: `nr1_sst_app`
- Tabelas: `users`, `companies`, `campaigns`, `company_responses`, `employee_responses`

Stack Swarm:

- Stack: `nr1-sst`
- Service API: `nr1-sst_api`
- Service web: `nr1-sst_web`
- Imagem API atual: `nr1-sst-api:prod`
- Imagem web atual: `nr1-sst-web:prod`

Hosts Traefik:

- Frontend: `nr01.venturatc.com.br`
- API: `api-nr01.venturatc.com.br`

Validacoes executadas:

- `docker service ls`: API e web com `1/1` replicas.
- `GET /health` na API via Traefik com `--resolve`: `{"ok":true}`.
- `GET /health` no frontend via Traefik com `--resolve`: `ok`.
- `POST /auth/login` e `GET /me` via API publica com `--resolve`: funcionaram.
- Postgres `nr1_sst`: schema inicial criado e uma conta admin inicial presente.

Pendencias antes de considerar cutover publico completo:

- Confirmar DNS publico de `nr01.venturatc.com.br` e `api-nr01.venturatc.com.br` apontando para `5.161.247.240`.
- Confirmar emissao TLS real pelo Traefik sem `curl -k`.
- Trocar/remover a credencial admin inicial de desenvolvimento.
- Configurar backup recorrente do banco `nr1_sst`.
- Importar dados historicos do Firestore, se ainda forem necessarios.
