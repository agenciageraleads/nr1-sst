# Ambiente Local

Este documento registra o ambiente necessario para desenvolver e validar o NR1-SST localmente.

## Estado Detectado Em 2026-05-11

- Pasta local: `/Users/mariatereza/Documents/NR1-SST`
- `git`: `/usr/bin/git`, versao `2.50.1 (Apple Git-155)`
- Command Line Tools: instaladas em `/Library/Developer/CommandLineTools`
- `node`: instalado localmente no projeto em `.tools/node`, versao `v24.15.0`
- `npm`: instalado localmente no projeto, versao `11.12.1`
- App: React + Vite + TypeScript + API Node + Postgres
- Gerenciador: npm, com `package-lock.json`
- OrbStack: instalado em `/Applications/OrbStack.app`
- Docker CLI: disponivel via `~/.orbstack/bin/docker`

## Node Local Do Projeto

Para ativar `node`, `npm` e `corepack` na sessao atual:

```bash
source scripts/use-local-node.sh
```

Depois valide:

```bash
node --version
npm --version
corepack --version
```

## Dependencias

```bash
source scripts/use-local-node.sh
npm install
```

## Variaveis De Ambiente

Crie o arquivo local:

```bash
cp .env.example .env.local
```

Valores de desenvolvimento:

```text
VITE_API_URL=http://localhost:4000
DATABASE_URL=postgres://nr1:nr1@localhost:5432/nr1_sst
JWT_SECRET=dev-only-change-me
APP_URL=http://localhost:3000
API_URL=http://localhost:4000
ADMIN_EMAIL=admin@nr1.local
ADMIN_PASSWORD=admin123
```

Nunca versionar `.env.local` nem segredos reais.

## Containers

Runtime definido para desenvolvimento local: OrbStack.

O OrbStack adicionou a inicializacao em `~/.zprofile`; em novas janelas de terminal o `docker` deve entrar no `PATH` automaticamente. Na sessao atual, se necessario:

```bash
export PATH="$HOME/.orbstack/bin:$PATH"
```

Uso esperado:

```bash
export PATH="$HOME/.orbstack/bin:$PATH"
docker compose up postgres api
```

Servicos:

- `postgres`: Postgres 14 local, porta `5432`.
- `api`: API Express local, porta `4000`.

## Frontend

```bash
source scripts/use-local-node.sh
npm run dev
```

URL:

```text
http://localhost:3000
```

## Validacao

```bash
npm run lint
npm run build
docker compose up postgres api
```

Cenarios manuais principais:

- login email/senha;
- criar usuario editor;
- cadastrar empresa;
- importar empresas por CSV;
- criar campanha;
- abrir formularios publicos por token;
- enviar respostas;
- validar dashboard e relatorios.
