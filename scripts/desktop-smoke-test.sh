#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# MD Studio — Desktop Render Smoke Test
# Proves that WebKit finished loading and that the app window rendered content.
# Uses the same X11/DMABUF settings as the Ubuntu .desktop launcher, while
# isolating fontconfig's cache so a stale user cache cannot mask app behavior.
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

ARTIFACT_DIR="$(mktemp -d /tmp/md-studio-desktop-smoke-XXXXXX)"
LOG_FILE="$ARTIFACT_DIR/app.log"
SCREENSHOT_FILE="$ARTIFACT_DIR/window.png"
SMOKE_DOCUMENT="$ARTIFACT_DIR/render-smoke.md"
APP_PID=""

cleanup_app() {
  if [ -n "$APP_PID" ] && kill -0 "$APP_PID" 2>/dev/null; then
    kill -TERM "$APP_PID" 2>/dev/null || true
    for _ in {1..10}; do
      kill -0 "$APP_PID" 2>/dev/null || break
      sleep 0.2
    done
    kill -KILL "$APP_PID" 2>/dev/null || true
    wait "$APP_PID" 2>/dev/null || true
  fi
}
trap cleanup_app EXIT

fail() {
  echo "[-] $*" >&2
  if [ -f "$LOG_FILE" ]; then
    echo "--- Application output ---" >&2
    cat "$LOG_FILE" >&2
  fi
  echo "[!] Smoke evidence retained at: $ARTIFACT_DIR" >&2
  exit 1
}

echo "=== [SMOKE TEST] MD Studio Desktop Render Gate ==="
echo "Project Root: $PROJECT_ROOT"

# LES-0006: isolate the fontconfig cache; do not change the user's font set.
export XDG_CACHE_HOME="$ARTIFACT_DIR/cache"
export XDG_CONFIG_HOME="$ARTIFACT_DIR/config"
export XDG_DATA_HOME="$ARTIFACT_DIR/data"
export XDG_STATE_HOME="$ARTIFACT_DIR/state"
mkdir -p "$XDG_CACHE_HOME" "$XDG_CONFIG_HOME" "$XDG_DATA_HOME" "$XDG_STATE_HOME"

# Mirror the repository's .desktop launcher (INV-DESKTOP-LAUNCHER-ENV).
export GDK_BACKEND=x11
export WEBKIT_DISABLE_DMABUF_RENDERER=1
if [ -z "${DISPLAY:-}" ]; then
  if [ -n "${WAYLAND_DISPLAY:-}" ]; then
    export DISPLAY=:0
  else
    fail "Neither DISPLAY nor WAYLAND_DISPLAY is available."
  fi
fi
echo "[*] Display: $DISPLAY; GDK_BACKEND=$GDK_BACKEND; WEBKIT_DISABLE_DMABUF_RENDERER=$WEBKIT_DISABLE_DMABUF_RENDERER"
echo "[*] Isolated XDG_CACHE_HOME: $XDG_CACHE_HOME"

for tool in xwininfo import python3 sha256sum tesseract; do
  command -v "$tool" >/dev/null 2>&1 || fail "Required smoke-test tool is unavailable: $tool"
done
python3 - <<'PY' || fail "Python Pillow is required to measure rendered pixels."
from PIL import Image  # noqa: F401
PY

if [ ! -f "dist/index.html" ]; then
  echo "[*] Frontend bundle not found; running pnpm build..."
  pnpm build
fi

TARGET_PROFILE="${1:-debug}"
if [ "$TARGET_PROFILE" = "release" ]; then
  BIN_PATH="src-tauri/target/release/md-studio"
  if [ ! -x "$BIN_PATH" ]; then
    echo "[*] Release binary not found; running pnpm tauri build..."
    pnpm tauri build
  fi
else
  BIN_PATH="src-tauri/target/debug/md-studio"
  if [ ! -x "$BIN_PATH" ]; then
    echo "[*] Debug binary not found; building..."
    cargo build --manifest-path src-tauri/Cargo.toml
  fi
fi
[ -x "$BIN_PATH" ] || fail "Binary not found or not executable: $BIN_PATH"

cat > "$SMOKE_DOCUMENT" <<'EOF'
# MD Studio desktop render smoke

This known text must appear in the Markdown editor and preview after WebKit loads.

Render proof: **the page is visible**, with a heading, paragraph, and bold text.
EOF

echo "[*] Target binary: $BIN_PATH (profile: $TARGET_PROFILE)"
echo "[*] Launching with deterministic Markdown document: $SMOKE_DOCUMENT"
"$PROJECT_ROOT/$BIN_PATH" "$SMOKE_DOCUMENT" >"$LOG_FILE" 2>&1 &
APP_PID=$!

MAX_WAIT_SECONDS=25
WINDOW_ID=""
PAGE_LOAD_DETECTED=0
SETUP_LOG_DETECTED=0

for ((elapsed = 0; elapsed < MAX_WAIT_SECONDS; elapsed++)); do
  kill -0 "$APP_PID" 2>/dev/null || fail "Application exited before rendering."

  if grep -q '\[TAURI_PAGE_LOAD\] event=Finished window=main' "$LOG_FILE" 2>/dev/null; then
    PAGE_LOAD_DETECTED=1
  fi
  if grep -q '\[TAURI_SETUP\] main window initialized successfully' "$LOG_FILE" 2>/dev/null; then
    SETUP_LOG_DETECTED=1
  fi
  WINDOW_ID="$(xwininfo -root -tree 2>/dev/null | awk '/"MD Studio"/ { print $1; exit }')"

  if [ "$PAGE_LOAD_DETECTED" -eq 1 ] && [ "$SETUP_LOG_DETECTED" -eq 1 ] && [ -n "$WINDOW_ID" ]; then
    break
  fi
  sleep 1
done

[ "$PAGE_LOAD_DETECTED" -eq 1 ] || fail "WebKit did not emit the Finished page-load event within ${MAX_WAIT_SECONDS}s."
[ "$SETUP_LOG_DETECTED" -eq 1 ] || fail "Tauri did not initialize the main window within ${MAX_WAIT_SECONDS}s."
[ -n "$WINDOW_ID" ] || fail "No mapped X11 window titled MD Studio was found."

MAX_RENDER_WAIT_SECONDS=20
RENDER_DETECTED=0
OCR_TEXT=""
for ((render_elapsed = 0; render_elapsed <= MAX_RENDER_WAIT_SECONDS; render_elapsed += 2)); do
  kill -0 "$APP_PID" 2>/dev/null || fail "Application exited after the page-load event."
  import -window "$WINDOW_ID" "$SCREENSHOT_FILE" >/dev/null 2>&1 || fail "Could not capture the MD Studio window."
  OCR_TEXT="$(tesseract "$SCREENSHOT_FILE" stdout 2>/dev/null | tr '\n' ' ')"
  if grep -Eqi 'render[[:space:]]+proof' <<<"$OCR_TEXT"; then
    RENDER_DETECTED=1
    break
  fi
  if [ "$render_elapsed" -lt "$MAX_RENDER_WAIT_SECONDS" ]; then
    sleep 2
  fi
done

[ "$RENDER_DETECTED" -eq 1 ] || fail "The screenshot did not contain the deterministic Markdown render marker within ${MAX_RENDER_WAIT_SECONDS}s after page load."

python3 - "$SCREENSHOT_FILE" <<'PY'
import sys
from PIL import Image

path = sys.argv[1]
image = Image.open(path).convert("RGB")
width, height = image.size
total = width * height
pixel_bytes = image.tobytes()

# The known gray-window failure was #2C2C2C. Count near-background pixels so
# anti-aliasing and small color shifts do not turn a blank view into a pass.
background = (44, 44, 44)
near_background = sum(
    1
    for index in range(0, len(pixel_bytes), 3)
    if all(abs(pixel_bytes[index + channel] - background[channel]) <= 8 for channel in range(3))
)
background_percent = 100.0 * near_background / total
unique_colors = len(image.getcolors(maxcolors=65536) or [])

print(f"[+] Screenshot dimensions: {width}x{height}")
print(f"[+] Near-#2C2C2C pixels: {background_percent:.2f}%")
print(f"[+] Distinct colors: {'>=' if unique_colors == 0 else ''}{unique_colors or 65536}")

if width < 640 or height < 400:
    raise SystemExit("[-] Captured window is too small to verify the app layout.")
if background_percent >= 95.0:
    raise SystemExit("[-] Captured window is still a gray/blank surface (>=95% near #2C2C2C).")
if unique_colors != 0 and unique_colors < 64:
    raise SystemExit("[-] Captured window lacks the color variation expected from rendered UI.")
PY

echo "[+] OCR found the deterministic Markdown render marker."

echo "[+] WebKit page load event and Tauri main-window initialization confirmed."
echo "[+] Window screenshot: $SCREENSHOT_FILE"
echo "[+] Screenshot SHA-256: $(sha256sum "$SCREENSHOT_FILE" | awk '{print $1}')"
echo "[+] Application log: $LOG_FILE"
echo "=== [SMOKE TEST] RESULT: PASS ==="
echo "Rendered UI verified by page-load event and screenshot pixel analysis."
