#!/bin/bash
echo "🛑 Parando deusfiel..."

pkill -f "node /tmp/proxy-fcc-ollama.mjs" 2>/dev/null && echo "   Proxy parado" || echo "   Proxy não estava rodando"
pkill -f "ngrok http 11111" 2>/dev/null && echo "   Ngrok parado" || echo "   Ngrok não estava rodando"
pkill -f "ollama serve" 2>/dev/null && echo "   Ollama parado" || echo "   Ollama não estava rodando"
pkill -f "node server.mjs" 2>/dev/null && echo "   FCC parado" || echo "   FCC não estava rodando"

echo ""
echo "✅ Todos os serviços parados"
