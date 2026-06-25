#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "Enabling pnpm via corepack..."
corepack enable

echo "Installing dependencies..."
pnpm install --frozen-lockfile

echo "Building engine..."
pnpm --filter @kanban-game/engine build

echo "Setup complete. pnpm $(pnpm --version) is ready."
