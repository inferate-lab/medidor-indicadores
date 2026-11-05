#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
node -e 'if(Number(process.versions.node.split(".")[0]) !== 24) { console.error("Usar Node.js 24"); process.exit(1) }'
npm ci --no-audit --no-fund
npm run test
npm run build
