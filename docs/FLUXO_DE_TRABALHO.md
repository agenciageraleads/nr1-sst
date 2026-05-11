# Fluxo De Trabalho

Este projeto nao deve receber hotfix direto em producao.

## Regra Principal

Toda alteracao, correcao ou ajuste deve passar pelo fluxo completo:

1. Entender o problema e registrar a decisao quando ela afetar produto, infra, banco ou seguranca.
2. Alterar o codigo no repositorio local.
3. Rodar validacoes locais obrigatorias.
4. Commitar a mudanca com mensagem clara.
5. Fazer push para o remoto.
6. Gerar build/deploy de producao a partir do codigo versionado.
7. Validar producao com health check, logs e teste funcional minimo.
8. Atualizar documentacao quando houver mudanca operacional.

## Validacoes Minimas

```bash
npm run lint
npm run build
```

Quando houver mudanca de API, banco ou deploy:

```bash
docker compose up -d postgres api
curl http://localhost:4000/health
```

## Proibido

- Editar arquivos diretamente na VPS como correcao permanente.
- Fazer mudanca manual em container rodando.
- Aplicar migration ou alteracao de banco sem registrar no repositorio.
- Subir producao sem commit correspondente.
- Manter uma correcao apenas em ambiente remoto.

Excecao emergencial deve virar commit e documentacao imediatamente depois, antes de qualquer nova tarefa.
