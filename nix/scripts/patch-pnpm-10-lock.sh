#!/bin/sh
set -eu

lockfile="${1:-pnpm-lock.yaml}"

if [ ! -f "$lockfile" ]; then
  exit 0
fi

# OpenClaw releases built with pnpm 11 store patchedDependencies as hashes.
# nixpkgs currently packages pnpm 10; pnpm 10 expects each patched dependency to
# retain both the hash and patch path in the lockfile.
sed -i \
  -e "/'@agentclientprotocol\/claude-agent-acp@0.33.1': 3995624bb834cc60fea1461c7ef33f1fcdd8fb58b8f43f2f1490bc689f6e1be2/c\\  '@agentclientprotocol/claude-agent-acp@0.33.1':\\
    hash: 3995624bb834cc60fea1461c7ef33f1fcdd8fb58b8f43f2f1490bc689f6e1be2\\
    path: patches/@agentclientprotocol__claude-agent-acp@0.33.1.patch" \
  -e "/baileys@7.0.0-rc11: a9aea1790d2c65b1ae543c77faca4119bbfb91ee3b6ca6c38d1cad4f5702ada2/c\\  baileys@7.0.0-rc11:\\
    hash: a9aea1790d2c65b1ae543c77faca4119bbfb91ee3b6ca6c38d1cad4f5702ada2\\
    path: patches/baileys@7.0.0-rc11.patch" \
  "$lockfile"
