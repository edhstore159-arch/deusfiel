# Juiz Virtual — Agent

Este diretório contém um agente de exemplo "Juiz Virtual" para integrar ao site do projeto.

Arquivos principais:
- server.js — servidor Express que expõe uma rota /api/chat protegida por SITE_API_KEY.
- public/widget.js — widget front-end para integrar no site (incluir via <script>).
- .env.example — exemplos de variáveis de ambiente.

ATENÇÃO: NUNCA comite chaves reais no repositório. Use GitHub Secrets ou variáveis no servidor.
