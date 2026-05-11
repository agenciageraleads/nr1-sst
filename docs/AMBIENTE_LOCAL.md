# Ambiente local

Este documento registra o que a máquina precisa ter para desenvolver e validar o NR1-SST localmente.

## Estado detectado em 2026-05-11

- Pasta local: `/Users/mariatereza/Documents/NR1-SST`
- `git`: disponível via wrapper local em `~/.local/bin/git`, versão `2.54.0`.
- Command Line Tools: não instaladas; o pacote não apareceu no catálogo do `softwareupdate` neste macOS.
- `node`: instalado localmente no projeto em `.tools/node`, versão `v24.15.0`.
- `npm`: instalado localmente no projeto, versão `11.12.1`.
- `corepack`: instalado localmente no projeto, versão `0.34.6`.
- `pnpm`: não encontrado no PATH.
- `yarn`: não encontrado no PATH.
- `bun`: não encontrado no PATH.
- `package.json`: ainda não existe no repositório.

## Git no macOS

O `xcode-select --install` abriu o instalador das ferramentas da Apple, mas o macOS informou que o item não estava disponível no servidor de Atualização de Software. Como alternativa, foi instalado um Git local no usuário, usando bottles do Homebrew extraídos para:

```text
~/.local/homebrew
```

O wrapper ativo fica em:

```text
~/.local/bin/git
```

Validação em um novo shell:

```bash
which git
git --version
git ls-remote https://github.com/git/git.git HEAD
```

O clone padrão seria:

```bash
git clone https://github.com/agenciageraleads/nr1-sst.git
cd nr1-sst
```

Como esta pasta já existia com documentação local, o repositório foi conectado preservando os arquivos atuais. O remoto ativo é:

```bash
git remote -v
```

## Node local do projeto

Este projeto já tem um Node LTS local instalado em:

```text
.tools/node
```

Para usar `node`, `npm` e `corepack` nesta sessão de terminal:

```bash
source scripts/use-local-node.sh
```

Depois valide:

```bash
node --version
npm --version
corepack --version
```

## Instalar Node no sistema, opcional

Recomendação: usar Node LTS, não uma versão experimental, para reduzir ruído em dependências frontend.

Opção com `nvm`:

```bash
nvm install --lts
nvm use --lts
node --version
npm --version
```

Opção com Homebrew:

```bash
brew install node
node --version
npm --version
```

Se o projeto exportado usar `pnpm`:

```bash
corepack enable
corepack prepare pnpm@latest --activate
pnpm --version
```

## Como descobrir o comando correto de desenvolvimento

Depois que o código do app existir nesta pasta, abra o `package.json` e confira:

```json
{
  "scripts": {
    "dev": "..."
  }
}
```

Use o lockfile para escolher o gerenciador:

- `package-lock.json`: use `npm install` e `npm run dev`.
- `pnpm-lock.yaml`: use `pnpm install` e `pnpm dev`.
- `yarn.lock`: use `yarn install` e `yarn dev`.
- `bun.lockb` ou `bun.lock`: use `bun install` e `bun dev`.

Nesta máquina, o `npm` local já existe em `.tools/node/bin/npm`. A falha atual de `npm run dev` é ausência de `package.json`, não ausência de npm.

## Variáveis de ambiente

Quando o app for exportado, procurar por:

- `.env.example`
- `.env.local`
- chamadas a `process.env`
- chamadas a `import.meta.env`
- chaves de Gemini, Google AI ou Firebase

Nunca versionar `.env` real. Criar ou atualizar `.env.example` com nomes de variáveis e valores fictícios.
