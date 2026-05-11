# Checklist De Validacao

Use este checklist para validar o NR1-SST localmente.

## Antes De Rodar

- [x] `git --version` funciona.
- [x] `source scripts/use-local-node.sh` funciona.
- [x] `node --version` mostra `v24.15.0`.
- [x] `npm --version` funciona.
- [x] Existe `package.json`.
- [x] Existe script `dev` no `package.json`.
- [x] Variaveis de ambiente estao documentadas em `.env.example`.
- [ ] `.env.local` foi criado localmente com valores reais.

## Instalacao

```bash
source scripts/use-local-node.sh
npm install
```

## Desenvolvimento

```bash
source scripts/use-local-node.sh
npm run dev
```

URL esperada:

```text
http://localhost:3000
```

## Build E Tipagem

```bash
npm run lint
npm run build
```

## Validacao Minima

- [ ] Servidor sobe sem erro.
- [ ] URL local abre no navegador.
- [ ] Tela inicial renderiza.
- [ ] Fluxos principais funcionam.
- [ ] Console do navegador nao mostra erro critico.
- [ ] `npm run lint` passa.
- [ ] `npm run build` passa.

## Registro De Problemas

Se algum comando falhar, registrar:

- comando executado;
- erro completo;
- versao do Node;
- gerenciador de pacotes usado;
- sistema operacional;
- variaveis de ambiente configuradas ou pendentes.
