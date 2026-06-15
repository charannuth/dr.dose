#!/usr/bin/env bash
# Remote Expo Go access via Cloudflare quick tunnel (no ngrok account needed).
# Your Mac must stay on with this script running while your sister tests.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${EXPO_PORT:-8081}"
LOG="$(mktemp)"

cleanup() {
  rm -f "$LOG"
  kill "${EXPO_PID:-}" 2>/dev/null || true
  kill "${CF_PID:-}" 2>/dev/null || true
  pkill -f "cloudflared tunnel --url http://127.0.0.1:${PORT}" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

for p in "$PORT" 4040; do
  lsof -ti :"$p" 2>/dev/null | xargs kill -9 2>/dev/null || true
done

cd "$ROOT"

echo "Starting Metro on port ${PORT}..."
npx expo start --port "$PORT" &
EXPO_PID=$!

echo "Waiting for Metro..."
ready=0
for _ in $(seq 1 90); do
  if curl -sf "http://127.0.0.1:${PORT}/status" 2>/dev/null | grep -q running; then
    ready=1
    break
  fi
  sleep 1
done
if [[ "$ready" -ne 1 ]]; then
  echo "Metro did not start on port ${PORT} within 90s."
  exit 1
fi

echo "Starting Cloudflare tunnel..."
npx --yes cloudflared tunnel --url "http://127.0.0.1:${PORT}" >"$LOG" 2>&1 &
CF_PID=$!

TUNNEL_URL=""
for _ in $(seq 1 45); do
  TUNNEL_URL="$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG" 2>/dev/null | head -1 || true)"
  if [[ -n "$TUNNEL_URL" ]]; then
    break
  fi
  sleep 1
done

if [[ -z "$TUNNEL_URL" ]]; then
  echo "Tunnel failed to start. cloudflared log:"
  cat "$LOG"
  exit 1
fi

HOST="${TUNNEL_URL#https://}"
EXP_URL="exp://${HOST}:443"

echo ""
echo "=============================================="
echo " Remote URL for Expo Go (share with your sister)"
echo "=============================================="
echo ""
echo "  ${EXP_URL}"
echo ""
echo " Sister: tap this link in iMessage/WhatsApp (opens Expo Go)."
echo " Or: paste into Safari → Go → Open in Expo Go."
echo " She can create her own account after the app loads."
echo ""
echo " Keep this terminal open. Ctrl+C to stop."
echo "=============================================="
echo ""

tail -f "$LOG"
