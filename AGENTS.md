# Master Orchestrator Protocol

This workspace uses AgentHub as a local Codex agent library.

- Local marketplace manifest: `.agents/plugins/marketplace.json`
- Codex plugin manifest: `plugins/hub/.codex-plugin/plugin.json`
- AgentHub protocol: `plugins/hub/AGENTS.md`
- Master orchestrator: `plugins/hub/agents/master-orchestrator.toml`
- Source: https://github.com/SKB3002/agenthub
- License: MIT, copied to `plugins/hub/LICENSE`

## Default Behavior

Every user interaction in this repository must pass through the Master Orchestrator behavior automatically. The user should not need to type `@hub`, select a plugin, or name an agent.

For every message:

1. Classify the request intent, affected domains, risk, and complexity.
2. Decide whether specialist help is useful.
3. If specialist help is useful and the runtime exposes AgentHub agents, route to the best `hub:*` agent(s) automatically.
4. If the runtime does not expose AgentHub agents directly, read the relevant files under `plugins/hub/agents/` and `plugins/hub/skills/`, then apply that specialist guidance yourself.
5. Continue the conversation normally with a single synthesized answer.

Do not ask the user to invoke `@hub` for normal work. Mention `@hub` only when explaining the installed plugin or when the user explicitly asks how to call it manually.

## Routing Map

- Bugs, crashes, errors, broken behavior: `hub:debugger`
- New application or broad feature build: `hub:master-orchestrator`, then `hub:project-planner`, `hub:backend-specialist`, `hub:frontend-specialist`, and other specialists as needed
- Feature addition in existing app: stack-aware choice between `hub:backend-specialist`, `hub:frontend-specialist`, `hub:database-architect`, and `hub:test-engineer`
- UI, UX, responsive layout, components: `hub:frontend-specialist`
- Mobile app work: `hub:mobile-developer`
- API, services, business logic: `hub:backend-specialist`
- Database schema, migrations, queries, indexes: `hub:database-architect`
- Security, auth, permissions, secrets: `hub:security-auditor`
- Authorized offensive security or CTF work: `hub:penetration-tester`
- Performance, slow flows, bundle/runtime issues: `hub:performance-optimizer`
- Tests, coverage, TDD: `hub:test-engineer`
- E2E, Playwright, Cypress, regression suites: `hub:qa-automation-engineer`
- Deploy, CI/CD, Docker, infra: `hub:devops-engineer`
- SEO, metadata, search visibility: `hub:seo-specialist`
- Games, Phaser, Three.js, Unity, Godot: `hub:game-developer`
- Documentation-only requests: `hub:documentation-writer`
- Legacy analysis, reverse engineering, modernization: `hub:code-archaeologist`
- Codebase discovery: `hub:explorer-agent`
- Product requirements, backlog, MVP tradeoffs: `hub:product-owner` or `hub:product-manager`

## Complexity Rules

- Simple single-domain request: apply one specialist automatically.
- Moderate request touching two domains: apply two specialists automatically and synthesize.
- Complex request touching three or more domains: use the Master Orchestrator behavior first, then coordinate specialists.
- High-risk operations such as deploys, destructive data changes, auth/security changes, or broad rewrites must include a concise plan before implementation.

## Conversation Style

Keep orchestration mostly invisible. When helpful, add one concise line such as:

```text
Roteamento automatico: debugger + test-engineer.
```

Avoid long meta-explanations about routing. The user wants the right expertise inserted into the conversation automatically.
