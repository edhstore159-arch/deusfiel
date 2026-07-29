# PRD — Kênia Garcia Advocacia (Estúdio Jurídico Inteligente)

## Problema original do usuário (sessão atual — 15/05/2026)
> "clone esse aplicativo e corrija os erros"

## Arquitetura
- **Backend**: FastAPI (Python) — `/app/backend/server.py` (~3.9k linhas)
- **Frontend**: React/CRA + craco — `/app/frontend/src/`
- **WhatsApp Sidecar**: Node.js Baileys (`/app/baileys-service/`) — desabilitado no preview
- **Banco**: MongoDB
- **IA**: Emergent LLM Key (gpt-5.2 / gpt-4o-mini / Whisper / OpenAI TTS)

## Personas
- **Administradora**: Dra. Kênia Garcia (titular)
- **Bot WhatsApp**: **Nislainy** (secretária, conversa com clientes)
- **Chat IA público (site)**: Ana / Kênia Garcia (advogada virtual)

## Sessão de clone & fix (15/05/2026)
1. Extraído `oficial-2026-main.zip` para `/app`.
2. Dependências instaladas: `pip install -r requirements.txt`, `yarn install`.
3. Criados **arquivos `.env` ausentes** (motivo principal do "erro quando clico"):
   - `/app/frontend/.env` com `REACT_APP_BACKEND_URL` apontando para preview.
   - `/app/backend/.env` com `MONGO_URL`, `DB_NAME`, `JWT_SECRET`, `EMERGENT_LLM_KEY` e `RENDER_DISABLE_BAILEYS_SPAWN=true` (sidecar não roda no preview).
4. `EMERGENT_LLM_KEY` injetada — habilita Chat IA + áudio TTS + análise IA.
5. **Hydration warning corrigido** em `/app/frontend/src/pages/WhatsAppSettings.jsx` linha 777 — `<option>` com filhos múltiplos consolidado em template string única.
6. Supervisor: backend + frontend rodando.
7. Testes manuais via screenshot:
   - ✅ Landing page carrega e formulário de lead salva (`POST /api/public/leads` retorna `ok:true`).
   - ✅ Login `demo@espirito-santo.com.br / demo123` autentica e redireciona para onboarding.
   - ✅ Todas as 14 rotas autenticadas (`/app`, `/app/chat-ia`, `/app/crm`, ...) carregam sem `pageerror`.
   - ✅ Chat IA · Análise envia mensagem, recebe resposta da Kênia Garcia em **texto + áudio** (player nativo OK).
   - ✅ Atendimento (Central de Mensagens) carrega 5 contatos seed (Patrícia, Carlos, Ana, João, Maria).

## Histórico anterior (preservado)
- Iter 1: Webhook Baileys (token mismatch) ✅
- Iter 2: Chat IA áudio mudo + modo voz WhatsApp ✅
- Iter 3: Bot renomeado para Nislainy, 7 áreas de expertise, humanização, ElevenLabs, Landing, image fusion ✅

## Backlog
- **P1** Webhook async + BackgroundTask (humanização pode estourar 25s em casos longos)
- **P1** Mover `BAILEYS_INTERNAL_TOKEN` para header `X-Internal-Token`
- **P2** Refatorar `server.py` (3.9k linhas) em routers
- **P2** Endpoint DELETE `/api/whatsapp/contacts/{id}`
- **P3** Dashboard "leads quentes do dia" + briefing diário em áudio

## Credenciais de teste
- Demo: `demo@espirito-santo.com.br` / `demo123`
- Admin: `admin@kenia-garcia.com.br` / (seed automático no startup)
