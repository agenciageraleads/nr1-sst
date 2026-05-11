# Ambiente Local

Este documento registra o ambiente necessario para desenvolver e validar o NR1-SST localmente.

## Estado Detectado Em 2026-05-11

- Pasta local: `/Users/mariatereza/Documents/NR1-SST`
- `git`: `/usr/bin/git`, versao `2.50.1 (Apple Git-155)`
- Command Line Tools: instaladas em `/Library/Developer/CommandLineTools`
- `node`: instalado localmente no projeto em `.tools/node`, versao `v24.15.0`
- `npm`: instalado localmente no projeto, versao `11.12.1`
- `corepack`: instalado localmente no projeto, versao `0.34.6`
- App: React + Vite + TypeScript + Firebase
- Gerenciador: npm, com `package-lock.json`

## Git

As Command Line Tools do Xcode foram instaladas via:

```bash
softwareupdate --install "Command Line Tools for Xcode 26.5-26.5"
```

Validacao:

```bash
git --version
xcode-select -p
git remote -v
```

## Node Local Do Projeto

Este projeto usa um Node local em:

```text
.tools/node
```

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

## Instalar Dependencias

```bash
source scripts/use-local-node.sh
npm install
```

## Variaveis De Ambiente

Crie o arquivo local a partir do exemplo:

```bash
cp .env.example .env.local
```

Edite `.env.local` e configure:

```text
GEMINI_API_KEY=...
APP_URL=...
```

Nunca versionar `.env.local` nem segredos reais.

## Rodar Localmente

```bash
source scripts/use-local-node.sh
npm run dev
```

O Vite esta configurado para:

```text
http://localhost:3000
```

## Scripts Disponiveis

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run clean
```
