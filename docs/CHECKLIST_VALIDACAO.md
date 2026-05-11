# Checklist de validação

Use este checklist quando o código real do app estiver nesta pasta.

## Antes de rodar

- [x] `git --version` funciona.
- [x] `source scripts/use-local-node.sh` funciona.
- [x] `node --version` mostra `v24.15.0` ou outra versão LTS compatível.
- [x] `npm --version` funciona.
- [ ] Existe `package.json`.
- [ ] Existe script `dev` no `package.json`.
- [ ] Variáveis de ambiente estão documentadas em `.env.example`.
- [ ] `.env.local` ou `.env` real foi criado localmente, sem ser versionado.

## Instalação

Com `npm`:

```bash
npm install
```

Com `pnpm`:

```bash
pnpm install
```

Com `yarn`:

```bash
yarn install
```

## Desenvolvimento

Com `npm`:

```bash
source scripts/use-local-node.sh
npm run dev
```

Com `pnpm`:

```bash
pnpm dev
```

Com `yarn`:

```bash
yarn dev
```

## Validação mínima

- [ ] Servidor sobe sem erro.
- [ ] URL local abre no navegador.
- [ ] Tela inicial renderiza.
- [ ] Fluxos principais funcionam.
- [ ] Console do navegador não mostra erro crítico.
- [ ] Build de produção passa, se houver script:

```bash
npm run build
```

ou equivalente no gerenciador usado.

## Registro de problemas

Se algum comando falhar, registrar:

- comando executado;
- erro completo;
- versão do Node;
- gerenciador de pacotes usado;
- sistema operacional;
- se as variáveis de ambiente já estavam configuradas.
