# NR1-SST

Aplicacao NR1-SST preparada para desenvolvimento local no Codex, com frontend React/Vite, API Node/TypeScript e Postgres.

## Estado Atual

- Frontend: React 19 + Vite 6 + Tailwind CSS 4.
- API: Express + TypeScript em `api/`.
- Banco: Postgres via `DATABASE_URL`.
- Auth: email/senha proprio com sessao httpOnly.
- Firebase/Google AI Studio: removidos do caminho operacional.
- Deploy alvo: `nr01.venturatc.com.br` e `api-nr01.venturatc.com.br`.

## Documentacao

- [Ambiente local](docs/AMBIENTE_LOCAL.md)
- [Checklist de validação](docs/CHECKLIST_VALIDACAO.md)
- [Registro de decisões](docs/DECISOES.md)
- [Fluxo de trabalho](docs/FLUXO_DE_TRABALHO.md)
- [Migração para VPS própria](docs/VPS_MIGRACAO.md)

## Rodar Localmente

Use o Node local instalado neste projeto:

```bash
source scripts/use-local-node.sh
npm install
cp .env.example .env.local
```

Suba Postgres e API com containers:

```bash
docker compose up postgres api
```

Em outro terminal, rode o frontend:

```bash
source scripts/use-local-node.sh
npm run dev
```

URLs locais:

```text
Frontend: http://localhost:3000
API: http://localhost:4000
Health: http://localhost:4000/health
```

Login inicial de desenvolvimento:

```text
admin@nr1.local
admin123
```

## Scripts

```bash
npm run dev
npm run api:dev
npm run build
npm run preview
npm run lint
npm run clean
```

## Observacoes

- `.env.local` nao deve ser versionado.
- `.tools/` contem o Node local e tambem nao deve ser versionado.
- O repositorio local esta conectado ao remoto `origin`: `https://github.com/agenciageraleads/nr1-sst.git`.
