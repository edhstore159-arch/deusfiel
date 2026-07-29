#!/bin/bash
set -e

echo "🚀 Iniciando deusfiel..."

# 1. Ollama
echo "📦 Verificando Ollama..."
if ! curl -s http://127.0.0.1:11434/api/tags > /dev/null 2>&1; then
  echo "   Iniciando Ollama..."
  ollama serve > /tmp/ollama.log 2>&1 &
  sleep 3
else
  echo "   Ollama já rodando"
fi

# 2. FCC
echo "🤖 Verificando FCC (Claude)..."
if ! curl -s http://127.0.0.1:8082/health > /dev/null 2>&1; then
  echo "   Iniciando FCC..."
  fcc-server > /tmp/fcc.log 2>&1 &
  sleep 3
else
  echo "   FCC já rodando"
fi

# 3. Proxy
echo "🔗 Verificando Proxy..."
if ! curl -s http://127.0.0.1:11111/api/tags > /dev/null 2>&1; then
  echo "   Iniciando Proxy..."
  node /tmp/proxy-fcc-ollama.mjs > /tmp/proxy.log 2>&1 &
  sleep 2
else
  echo "   Proxy já rodando"
fi

# 4. Ngrok
echo "🌐 Verificando Ngrok..."
if ! curl -s http://127.0.0.1:4040/api/tunnels > /dev/null 2>&1; then
  echo "   Iniciando Ngrok..."
  ngrok http 11111 > /tmp/ngrok-proxy.log 2>&1 &
  sleep 5
else
  echo "   Ngrok já rodando"
fi

# Mostrar URL
echo ""
echo "✅ Todos os serviços rodando!"
echo ""
echo "📋 URL do ngrok:"
grep "url=https" /tmp/ngrok-proxy.log | head -1 | sed 's/.*url=/   /'
echo ""
echo "🧪 Testar:"
echo "   curl -s http://127.0.0.1:11111/api/tags"
echo "   curl -s http://127.0.0.1:11111/v1/messages -H 'x-api-key: freecc' -H 'Authorization: Bearer freecc' -H 'anthropic-version: 2023-06-01' -H 'Content-Type: application/json' -d '{\"model\":\"claude-3-freecc-no-thinking/nvidia_nim/nvidia/nemotron-3-super-120b-a12b\",\"max_tokens\":100,\"system\":\"Voce e a secretaria da Dra. Kenia Garcia.\",\"messages\":[{\"role\":\"user\",\"content\":\"Ola\"}]}'"
echo ""
echo "🛑 Para parar:"
echo "   pkill -f 'node /tmp/proxy-fcc-ollama.mjs'"
echo "   pkill -f 'ngrok http 11111'"
