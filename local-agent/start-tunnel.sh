#!/bin/bash
# Sobe o proxy combinado FCC+Ollama e o ngrok (porta 11111) sem duplicar túneis.
set -u
DIR="$(cd "$(dirname "$0")" && pwd)"

pkill -f proxy-fcc-ollama.mjs 2>/dev/null || true
pkill ngrok 2>/dev/null || true
sleep 1

nohup node "$DIR/proxy-fcc-ollama.mjs" > /tmp/proxy-fcc-ollama.log 2>&1 &
sleep 1
nohup ngrok http 11111 --log /tmp/ngrok.log --log-format logfmt > /tmp/ngrok-stdout.log 2>&1 &
sleep 4

URL="$(curl -s http://127.0.0.1:4040/api/tunnels | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["tunnels"][0]["public_url"] if d.get("tunnels") else "")' 2>/dev/null)"
echo "Proxy: http://127.0.0.1:11111"
echo "Túnel: ${URL:-não iniciado (veja /tmp/ngrok.log)}"
echo "Teste: curl -s ${URL:-https://SUA-URL}/api/version -H 'ngrok-skip-browser-warning: true'"
