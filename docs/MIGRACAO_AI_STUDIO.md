# Migração do Google AI Studio

Objetivo: manter o desenvolvimento do NR1-SST independente do Google AI Studio, com código versionado e validável localmente.

## Situação do repositório remoto

Em 2026-05-11, o GitHub `agenciageraleads/nr1-sst` tem apenas o `README.md` padrão do AI Studio no branch `main`. Não há arquivos de aplicação publicados.

A pasta local já está conectada ao remoto `origin` em `https://github.com/agenciageraleads/nr1-sst.git`.

## Caminho recomendado

1. Exportar o app completo do Google AI Studio.
2. Copiar os arquivos exportados para `/Users/mariatereza/Documents/NR1-SST`.
3. Conferir se vieram pelo menos:
   - `package.json`
   - código-fonte do app, normalmente em `src/`, `app/` ou `components/`
   - arquivo de entrada, como `index.html`, `main.tsx`, `App.tsx` ou equivalente
   - configuração do framework, como `vite.config.*`, `next.config.*` ou similar
4. Criar `.env.example` com variáveis necessárias.
5. Instalar dependências.
6. Rodar o servidor local.
7. Validar no navegador.
8. Versionar no GitHub.

Tentativa realizada em 2026-05-11: abrir `https://aistudio.google.com/apps` pelo navegador integrado redirecionou para login Google e foi bloqueado por política de segurança do navegador. A exportação precisa ser feita manualmente por alguém logado na conta Google que contém o app, ou o código precisa ser publicado no GitHub.

## Checklist de arquivos esperados

Para um app React/Vite típico:

```text
package.json
index.html
src/
src/main.tsx
src/App.tsx
vite.config.ts
```

Para um app Next.js típico:

```text
package.json
app/
next.config.js
public/
```

Para um app gerado pelo AI Studio, também pode haver:

```text
metadata.json
services/
components/
types.ts
```

## Pontos de atenção na migração

- Remover dependência operacional do AI Studio: o código precisa compilar e rodar localmente.
- Substituir segredos reais por variáveis de ambiente.
- Documentar qualquer serviço externo usado pelo app.
- Conferir licenças e assets antes de publicar.
- Criar um fluxo simples: instalar, rodar, testar e publicar.

## Após a chegada do código

Rodar estes diagnósticos:

```bash
find . -maxdepth 2 -type f | sort
find . -name package.json -print
node --version
```

Depois identificar o script:

```bash
npm run dev
```

Se falhar com `ENOENT` para `package.json`, o código do app ainda não está na pasta.

```bash
npm pkg get scripts
```

Se `npm` não estiver disponível, resolver primeiro o ambiente local conforme `docs/AMBIENTE_LOCAL.md`.
