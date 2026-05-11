# Migracao Do Google AI Studio

Documento historico da saida do Google AI Studio.

## Status Em 2026-05-11

- O codigo principal esta no repositorio local `/Users/mariatereza/Documents/NR1-SST`.
- O frontend roda com Vite em `http://localhost:3000`.
- A API propria roda em `http://localhost:4000`.
- O banco local roda em Postgres 14 via `docker compose`.
- Firebase Auth, Firestore e Gemini nao fazem mais parte do caminho operacional do app.

## Resultado Da Migracao Local

- `src/lib/firebase.ts` foi removido.
- As telas passaram a consumir `src/lib/api.ts`.
- `useAuth` usa `GET /me` na API propria.
- O login usa email/senha em `POST /auth/login`.
- As dependencias `firebase`, `@google/genai` e regras Firebase foram removidas.

## Proximo Passo

A continuidade da migracao esta documentada em:

- [Migração para VPS própria](VPS_MIGRACAO.md)
