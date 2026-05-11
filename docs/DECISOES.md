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
- Estrategia de deploy.
- Fluxo de autenticacao/autorizacao em producao.
- Regras finais do Firestore.
