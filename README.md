# NR1-SST

Aplicacao NR1-SST exportada do Google AI Studio e preparada para desenvolvimento local com Codex.

## Estado atual

O codigo da aplicacao ja esta neste repositorio. O projeto usa React, Vite, TypeScript, Firebase, Tailwind CSS e Gemini.

App original no AI Studio:
https://ai.studio/apps/79474dc1-a64f-4ec4-a0f7-4efbfb5388f7

## Documentacao

- [Ambiente local](docs/AMBIENTE_LOCAL.md)
- [Migração do Google AI Studio](docs/MIGRACAO_AI_STUDIO.md)
- [Checklist de validação](docs/CHECKLIST_VALIDACAO.md)
- [Registro de decisões](docs/DECISOES.md)
- [Agentes Codex](docs/AGENTES_CODEX.md)

## Rodar localmente

Use o Node local instalado neste projeto:

```bash
source scripts/use-local-node.sh
npm install
```

Configure as variaveis de ambiente:

```bash
cp .env.example .env.local
```

Edite `.env.local` e preencha a chave `GEMINI_API_KEY`.

Depois rode:

```bash
npm run dev
```

O Vite esta configurado para subir em:

```text
http://localhost:3000
```

## Scripts

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run clean
```

## Stack

- React 19
- Vite 6
- TypeScript
- Firebase
- Tailwind CSS 4
- Gemini API

## Observacoes

- `.env.local` nao deve ser versionado.
- `.tools/` contem o Node local e tambem nao deve ser versionado.
- O repositorio local esta conectado ao remoto `origin`: `https://github.com/agenciageraleads/nr1-sst.git`.
