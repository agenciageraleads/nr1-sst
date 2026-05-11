# Migracao Do Google AI Studio

Objetivo: manter o desenvolvimento do NR1-SST independente do Google AI Studio, com codigo versionado e validavel localmente.

## Situacao Atual

Em 2026-05-11, o codigo real da aplicacao foi publicado no GitHub e baixado para `/Users/mariatereza/Documents/NR1-SST`.

O app original no AI Studio esta registrado em:

```text
https://ai.studio/apps/79474dc1-a64f-4ec4-a0f7-4efbfb5388f7
```

## Arquivos Recebidos Do App

- `package.json`
- `package-lock.json`
- `index.html`
- `vite.config.ts`
- `tsconfig.json`
- `src/`
- `public/logo-symbol.png`
- `firebase.json`
- `firestore.rules`
- `.env.example`

## Stack Identificada

- React 19
- Vite 6
- TypeScript
- Firebase
- Tailwind CSS 4
- Gemini API

## O Que Ainda Depende De Configuracao Local

- Criar `.env.local`.
- Preencher `GEMINI_API_KEY`.
- Confirmar `APP_URL` conforme ambiente local ou deploy.
- Instalar dependencias com `npm install`.
- Rodar `npm run dev`.

## Politica De Segredos

O AI Studio injeta segredos em runtime. Localmente, eles precisam estar em `.env.local`.

Arquivos com segredos reais nao devem ser versionados. O repositorio deve manter apenas `.env.example`.
