#!/usr/bin/env sh

PROJECT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
NODE_DIR="$PROJECT_DIR/.tools/node"

if [ ! -x "$NODE_DIR/bin/node" ]; then
  echo "Node local nao encontrado em $NODE_DIR" >&2
  echo "Reinstale ou consulte docs/AMBIENTE_LOCAL.md" >&2
  return 1 2>/dev/null || exit 1
fi

export PATH="$NODE_DIR/bin:$PATH"

echo "Node: $(node --version)"
echo "npm: $(npm --version)"
echo "PATH atualizado para esta sessao."
