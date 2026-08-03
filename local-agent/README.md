# Local Agent (bolinha da atendente)

Pequeno servidor HTTP local que recebe um clique da bolinha no app e executa
comandos shell na **sua máquina** (o navegador não pode fazer isso sozinho).

## Rodar

```bash
node local-agent/server.mjs
```

Saída esperada:

```
[local-agent] ouvindo em http://127.0.0.1:7777
[local-agent] comandos permitidos: ngrok-restart
```

Deixe esse terminal aberto. Depois, no app, clique na bolinha da atendente —
ela faz `POST http://localhost:7777/run` com `{ "command": "ngrok-restart" }`.

## Como funciona

- Escuta **apenas** em `127.0.0.1:7777` (não exposto à internet).
- Só aceita comandos da **allowlist** (`ALLOWED` em `server.mjs`).
- O comando `ngrok-restart` executa: `pkill ngrok; sleep 1; ngrok http 11111 &`.

## ⚠️ IMPORTANTE: porta 11111 (proxy combinado)

O túnel ngrok aponta para `11111`, que é o **proxy combinado FCC + Ollama**
(`local-agent/proxy-fcc-ollama.mjs`):

- `/api/*` → Ollama (127.0.0.1:11434)
- `/v1/*` → FCC / Claude (127.0.0.1:8082)

**Nunca mude para `11434` direto** — se fizer isso, o túnel expõe só o Ollama e
o FCC da nuvem (Supabase/Render) quebra com `not_found_error` no modelo.

## Adicionar mais comandos

Edite `ALLOWED` em `server.mjs`:

```js
const ALLOWED = {
  "ngrok-restart": "pkill ngrok; sleep 1; ngrok http 11111 > /tmp/ngrok.log 2>&1 &",
  "meu-comando": "echo oi",
};
```

## Segurança

Não exponha esta porta na internet. Não adicione comandos vindos de input do
usuário sem revisão — a allowlist é a defesa.
