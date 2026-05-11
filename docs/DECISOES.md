# Registro de decisões

## 2026-05-11 - Base local criada fora do Google AI Studio

O repositório `https://github.com/agenciageraleads/nr1-sst.git` foi inicialmente baixado como ZIP porque o `git` ainda não estava disponível nesta máquina sem as Command Line Tools do Xcode.

O conteúdo remoto atual contém apenas o `README.md` padrão do Google AI Studio. Portanto, ainda não é possível rodar o app localmente nem executar `npm run dev`.

Decisão: preparar esta pasta como base local de trabalho, documentar os bloqueios e deixar checklist para receber o código exportado do AI Studio.

## 2026-05-11 - Git instalado e remoto conectado

As Command Line Tools do Xcode não ficaram disponíveis pelo `softwareupdate` neste macOS. Para destravar o trabalho, foi instalado um Git local em `~/.local/bin/git`, com dependências em `~/.local/homebrew`, liberando `git version 2.54.0`.

A pasta local foi conectada ao remoto `origin` em `https://github.com/agenciageraleads/nr1-sst.git`, preservando os arquivos de documentação e configuração já criados.

## 2026-05-11 - Node LTS local no projeto

Foi instalado Node.js `v24.15.0` em `.tools/node`, com `npm 11.12.1` e `corepack 0.34.6`.

Decisão: manter um Node local no projeto para permitir validação sem depender imediatamente de Homebrew, nvm ou instalação global. A pasta `.tools/` fica ignorada pelo Git.

## 2026-05-11 - Exportação do AI Studio bloqueada por login Google

Foi tentado abrir `https://aistudio.google.com/apps` pelo navegador integrado, mas o fluxo exige login Google e foi bloqueado por política de segurança do navegador.

Decisão: não contornar login ou política de segurança. A exportação deve ser feita manualmente pela conta proprietária do app, ou o código deve ser publicado no GitHub para ser baixado daqui.

## 2026-05-11 - Validação de `npm run dev`

Foi executado `.tools/node/bin/npm run dev`. O comando falhou com `ENOENT` porque não existe `package.json` na raiz do projeto.

Decisão: o ambiente Node/npm está pronto, mas o servidor local só poderá subir depois que o código real do app estiver nesta pasta.

## Próximas decisões pendentes

- Framework real do app: Vite, Next.js ou outro.
- Gerenciador de pacotes: npm, pnpm, yarn ou bun.
- Variáveis de ambiente necessárias.
- Estratégia de deploy.
- Fluxo de versionamento no GitHub após o código real do app estar disponível.
