#!/usr/bin/env bash
# Build MD Studio Tauri packages in Docker when host lacks webkit2gtk -dev packages.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
docker run --rm \
  -v "$ROOT":/app \
  -w /app \
  -e PATH=/usr/local/cargo/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
  -e CI=1 \
  rust:bookworm \
  bash -lc '
set -euo pipefail
export PATH="/usr/local/cargo/bin:$PATH"
export DEBIAN_FRONTEND=noninteractive
export CI=1
apt-get update -qq
apt-get install -y -qq \
  libwebkit2gtk-4.1-dev libjavascriptcoregtk-4.1-dev libgtk-3-dev \
  libayatana-appindicator3-dev librsvg2-dev patchelf libssl-dev \
  pkg-config build-essential curl wget file libxdo-dev ca-certificates \
  xdg-utils desktop-file-utils
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y -qq nodejs
npm i -g pnpm@9
cd /app
pnpm install --force
pnpm build
cargo test --manifest-path src-tauri/crates/md-studio-core/Cargo.toml
pnpm exec tauri build --ci --bundles deb,appimage
echo TAURI_OK
'
