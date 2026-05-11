# Registro De Decisoes

## 2026-05-11 - Base local criada fora do Google AI Studio

O repositório `https://github.com/agenciageraleads/nr1-sst.git` foi inicialmente baixado quando ainda continha apenas o `README.md` padrao do Google AI Studio.

Decisao: preparar esta pasta como base local de trabalho e documentar o ambiente para desenvolvimento fora do AI Studio.

## 2026-05-11 - Git instalado e remoto conectado

As Command Line Tools do Xcode foram instaladas via `softwareupdate`, liberando `git version 2.50.1 (Apple Git-155)`.

A pasta local foi conectada ao remoto `origin` em `https://github.com/agenciageraleads/nr1-sst.git`.

## 2026-05-11 - Node LTS local no projeto

Foi instalado Node.js `v24.15.0` em `.tools/node`, com `npm 11.12.1` e `corepack 0.34.6`.

Decisao: manter um Node local no projeto para permitir validacao sem depender imediatamente de Homebrew, nvm ou instalacao global. A pasta `.tools/` fica ignorada pelo Git.

## 2026-05-11 - App baixado do GitHub

O commit remoto `78f596d` trouxe a aplicacao exportada do AI Studio para o repositorio.

Decisao: integrar o app remoto com a documentacao local, preservando os arquivos de suporte do Codex e resolvendo conflitos em `README.md` e `.gitignore`.

## Proximas Decisoes Pendentes

- Valores reais de `.env.local`.
- Estrategia final de build/push das imagens de producao.
- Politica de backup/restore do Postgres da VPS.
- Importacao dos dados historicos do Firestore para Postgres.

## 2026-05-11 - Subdominio alvo do NR1-SST

Decisao: publicar o frontend em `nr01.venturatc.com.br` e a API em `api-nr01.venturatc.com.br`.

Motivo: separar frontend/API e manter a aplicacao dentro do dominio Ventura.

## 2026-05-11 - API propria com Postgres

Decisao: remover Firebase Auth, Firestore e Gemini do runtime da aplicacao e usar uma API Node/TypeScript com Postgres.

Motivo: tornar o desenvolvimento e o deploy independentes do Google AI Studio/Firebase, mantendo Postgres como fonte de dados e evitando conexao direta do browser com o banco.

Implementado:

- API Express em `api/server.ts`.
- Auth email/senha com cookie httpOnly.
- Migration SQL inicial em `api/migrations/001_initial.sql` para `users`, `companies`, `campaigns`, `company_responses` e `employee_responses`.
- Cliente HTTP em `src/lib/api.ts`.
- `docker-compose.yml` com Postgres/API local.
- Base de deploy Swarm em `deploy/swarm/nr1-sst-stack.yml`.
- Dockerfile do frontend em `deploy/web/Dockerfile`.

## 2026-05-11 - Sem hotfix direto em producao

Decisao: nao fazer hotfix direto na VPS ou em containers. Toda correcao deve passar pelo fluxo completo de codigo local, validacao, commit, push, deploy e validacao em producao.

Motivo: manter rastreabilidade, evitar divergencia entre producao e Git, e permitir rollback por versao.
