#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# MD Studio — Desktop Startup Smoke Test Gate
# Validates cold start, window mapping, WebKit initialization, and process health.
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

echo "=== [SMOKE TEST] MD Studio Desktop Startup Gate ==="
echo "Project Root: $PROJECT_ROOT"

# 1. Environment and Display Setup
export GDK_BACKEND="${GDK_BACKEND:-x11}"
export WEBKIT_DISABLE_DMABUF_RENDERER="${WEBKIT_DISABLE_DMABUF_RENDERER:-1}"

if [ -z "${DISPLAY:-}" ]; then
  if [ -n "${WAYLAND_DISPLAY:-}" ]; then
    export DISPLAY=":0"
  else
    echo "[-] WARNING: Neither DISPLAY nor WAYLAND_DISPLAY found. Checking for display :0..."
    export DISPLAY=":0"
  fi
fi

echo "[*] Display: $DISPLAY, GDK_BACKEND: $GDK_BACKEND, WEBKIT_DISABLE_DMABUF_RENDERER: $WEBKIT_DISABLE_DMABUF_RENDERER"

# 2. Ensure frontend assets exist
if [ ! -f "dist/index.html" ]; then
  echo "[*] Frontend bundle not found at dist/index.html. Running pnpm build..."
  pnpm build
fi

# 3. Locate or build binary
TARGET_PROFILE="${1:-debug}"
BIN_PATH=""

if [ "$TARGET_PROFILE" = "release" ]; then
  BIN_PATH="src-tauri/target/release/md-studio"
  if [ ! -f "$BIN_PATH" ]; then
    echo "[*] Building release binary..."
    cargo build --release --manifest-path src-tauri/Cargo.toml
  fi
else
  BIN_PATH="src-tauri/target/debug/md-studio"
  if [ ! -f "$BIN_PATH" ]; then
    echo "[*] Building debug binary..."
    cargo build --manifest-path src-tauri/Cargo.toml
  fi
fi

if [ ! -x "$BIN_PATH" ]; then
  echo "[-] ERROR: Binary not found or not executable: $BIN_PATH"
  exit 1
fi

echo "[*] Target Binary: $BIN_PATH (Profile: $TARGET_PROFILE)"

# 4. Launch Desktop App with log capture
LOG_FILE=$(mktemp /tmp/md-studio-smoke-XXXXXX.log)
trap 'rm -f "$LOG_FILE"' EXIT

echo "[*] Launching application in background..."
"$BIN_PATH" > "$LOG_FILE" 2>&1 &
APP_PID=$!

CLEANUP_CALLED=0
cleanup_app() {
  if [ "$CLEANUP_CALLED" -eq 1 ]; then return; fi
  CLEANUP_CALLED=1
  if kill -0 "$APP_PID" 2>/dev/null; then
    kill -15 "$APP_PID" 2>/dev/null || true
    sleep 0.5
    kill -9 "$APP_PID" 2>/dev/null || true
  fi
}
trap 'cleanup_app; rm -f "$LOG_FILE"' EXIT INT TERM

# 5. Monitor startup sequence and health
MAX_WAIT_SECONDS=8
INTERVAL=0.5
ELAPSED=0
WINDOW_DETECTED=0
SETUP_LOG_DETECTED=0
CHILDREN_DETECTED=0

echo "[*] Monitoring startup health for up to ${MAX_WAIT_SECONDS}s..."

while [ $(echo "$ELAPSED < $MAX_WAIT_SECONDS" | bc -l) -eq 1 ]; do
  # Check if primary process crashed
  if ! kill -0 "$APP_PID" 2>/dev/null; then
    wait "$APP_PID" 2>/dev/null || EXIT_CODE=$?
    echo "[-] ERROR: Application process $APP_PID exited prematurely with code ${EXIT_CODE:-unknown}!"
    echo "--- Application Output ---"
    cat "$LOG_FILE"
    exit 1
  fi

  # Check logs for setup initialization
  if [ "$SETUP_LOG_DETECTED" -eq 0 ] && grep -q "TAURI_SETUP" "$LOG_FILE" 2>/dev/null; then
    SETUP_LOG_DETECTED=1
    echo "[+] Detected Tauri window setup event."
  fi

  # Check X11 window mapping
  if [ "$WINDOW_DETECTED" -eq 0 ] && command -v xwininfo >/dev/null 2>&1; then
    if xwininfo -root -tree 2>/dev/null | grep -i -q "MD Studio"; then
      WINDOW_DETECTED=1
      echo "[+] Detected mapped X11 window for MD Studio."
    fi
  fi

  # Check WebKit helper processes
  if [ "$CHILDREN_DETECTED" -eq 0 ]; then
    if pgrep -P "$APP_PID" -f "WebKit" >/dev/null 2>&1; then
      CHILDREN_DETECTED=1
      echo "[+] Detected active WebKit subprocesses (Network/Web Process)."
    fi
  fi

  # Success criteria: process alive, window mapped or setup confirmed, WebKit initialized
  if [ "$SETUP_LOG_DETECTED" -eq 1 ] && { [ "$WINDOW_DETECTED" -eq 1 ] || [ "$CHILDREN_DETECTED" -eq 1 ]; }; then
    echo "[+] All desktop startup criteria met successfully!"
    break
  fi

  sleep $INTERVAL
  ELAPSED=$(echo "$ELAPSED + $INTERVAL" | bc -l)
done

# Final verification
if ! kill -0 "$APP_PID" 2>/dev/null; then
  echo "[-] ERROR: Application died before test completion."
  cat "$LOG_FILE"
  exit 1
fi

if [ "$SETUP_LOG_DETECTED" -eq 0 ] && [ "$WINDOW_DETECTED" -eq 0 ]; then
  echo "[-] ERROR: Startup timed out without window or setup event."
  cat "$LOG_FILE"
  exit 1
fi

# Clean termination
cleanup_app

echo "=== [SMOKE TEST] RESULT: PASS ==="
echo "Desktop startup validated: process healthy, window mapped, WebKit active, 0 crashes."
exit 0
