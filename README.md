# NR1-SST

Projeto local para evoluir o app NR1-SST fora do Google AI Studio.

## Estado atual

O repositório remoto `https://github.com/agenciageraleads/nr1-sst.git`, consultado em 2026-05-11, possui apenas o `README.md` padrão gerado pelo AI Studio. Ainda não há código de aplicação, `package.json`, lockfile, configuração de build ou scripts de desenvolvimento publicados no GitHub.

Por isso, esta pasta já foi preparada como base de trabalho local, mas o app em si ainda precisa ser exportado do Google AI Studio ou enviado para este repositório.

## O que já foi feito aqui

- Repositório clonado/conectado em `/Users/mariatereza/Documents/NR1-SST`.
- Documentação inicial criada em `docs/`.
- Checklist de ambiente local e validação preparado.
- `.gitignore` base criado para projetos Node/frontend.
- Node.js LTS local instalado em `.tools/node` com `npm`.
- Git local instalado em `~/.local/bin/git` e repositório conectado ao remoto `origin`.

## Documentação

- [Ambiente local](docs/AMBIENTE_LOCAL.md)
- [Migração do Google AI Studio](docs/MIGRACAO_AI_STUDIO.md)
- [Checklist de validação](docs/CHECKLIST_VALIDACAO.md)
- [Registro de decisões](docs/DECISOES.md)

## Como continuar

1. Exportar o código real do Google AI Studio.
2. Copiar os arquivos do app para esta pasta.
3. Conferir o `package.json` e identificar o gerenciador de pacotes.
4. Instalar dependências e rodar o script de desenvolvimento.

Quando o código do app estiver aqui, o comando esperado normalmente será um destes:

```bash
source scripts/use-local-node.sh
npm install
npm run dev
```

ou, caso o projeto use outro gerenciador:

```bash
pnpm install
pnpm dev
```

```bash
yarn install
yarn dev
```

## Bloqueios atuais para `run dev`

Ainda não dá para rodar `npm run dev` porque:

- não existe `package.json` neste repositório;
- não existe script `dev` publicado;

O Node local instalado para este projeto é `v24.15.0` com `npm 11.12.1`. Para usá-lo nesta pasta:

```bash
source scripts/use-local-node.sh
```

Validação realizada: `.tools/node/bin/npm run dev` falha com `ENOENT` porque `/Users/mariatereza/Documents/NR1-SST/package.json` ainda não existe.
