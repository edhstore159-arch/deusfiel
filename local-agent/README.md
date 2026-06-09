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
- O comando `ngrok-restart` executa: `pkill ngrok; sleep 1; ngrok http 11434 &`.

## Adicionar mais comandos

Edite `ALLOWED` em `server.mjs`:

```js
const ALLOWED = {
  "ngrok-restart": "pkill ngrok; sleep 1; ngrok http 11434 > /tmp/ngrok.log 2>&1 &",
  "meu-comando": "echo oi",
};
```

## Segurança

Não exponha esta porta na internet. Não adicione comandos vindos de input do
usuário sem revisão — a allowlist é a defesa.
