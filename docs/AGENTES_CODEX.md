# Agentes para desenvolvimento no Codex

## Colecao instalada

Instalei o AgentHub como plugin local em `plugins/hub` e registrei o marketplace local em `.agents/plugins/marketplace.json`.

O AgentHub foi escolhido porque e semelhante ao antigravity-kit, tem suporte explicito a OpenAI Codex, inclui manifesto `.codex-plugin`, usa invocacao por `@hub`, e traz um acervo pronto para desenvolvimento de aplicacoes:

- 20 agentes especializados
- 1 orquestrador mestre local para roteamento automatico
- 42 skills
- 17 workflows principais
- 20 atalhos diretos para agentes

## Modo automatico

O arquivo `AGENTS.md` da raiz agora define um Master Orchestrator para toda interacao neste workspace.

Com isso, voce nao precisa chamar `@hub` manualmente no dia a dia. A cada mensagem, o Codex deve:

1. Analisar a intencao, os dominios afetados, o risco e a complexidade.
2. Escolher automaticamente os especialistas relevantes.
3. Chamar os agentes `hub:*` se o runtime os disponibilizar.
4. Se os agentes nao estiverem disponiveis como chamadas nativas, ler os arquivos em `plugins/hub/agents/` e `plugins/hub/skills/` e aplicar as instrucoes diretamente.
5. Responder com uma sintese unica, sem exigir que voce selecione agentes.

## Como usar

O uso manual continua disponivel quando voce quiser forcar um workflow especifico:

```text
@hub help
@hub status
@hub brainstorm <ideia>
@hub plan <funcionalidade>
@hub create <aplicacao>
@hub enhance <mudanca>
@hub debug <erro ou sintoma>
@hub test
```

Importante: no Codex use sempre `@hub`. O prefixo `/hub:` e da versao Claude Code e nao deve ser usado aqui.

## Agentes incluidos

- `hub:orchestrator`
- `hub:master-orchestrator`
- `hub:project-planner`
- `hub:product-owner`
- `hub:product-manager`
- `hub:code-archaeologist`
- `hub:backend-specialist`
- `hub:database-architect`
- `hub:devops-engineer`
- `hub:security-auditor`
- `hub:penetration-tester`
- `hub:performance-optimizer`
- `hub:frontend-specialist`
- `hub:mobile-developer`
- `hub:seo-specialist`
- `hub:game-developer`
- `hub:debugger`
- `hub:test-engineer`
- `hub:qa-automation-engineer`
- `hub:documentation-writer`
- `hub:explorer-agent`

## Procedencia

- Repositorio: https://github.com/SKB3002/agenthub
- Licenca: MIT, preservada em `plugins/hub/LICENSE`
- Inspiracao declarada pelo projeto: antigravity-kit
