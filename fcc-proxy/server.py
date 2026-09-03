from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
import httpx, os, uuid, logging

app = FastAPI()
logging.basicConfig(level=logging.INFO)

FCC_AUTH = os.environ.get('FCC_AUTH_TOKEN', 'freecc')
EMERGENT_KEY = os.environ.get('EMERGENT_API_KEY', '')
EMERGENT_MODEL = os.environ.get('FCC_MODEL', 'claude-sonnet-4-5')

@app.post("/v1/messages")
async def proxy_messages(request: Request):
    api_key = request.headers.get("x-api-key") or request.headers.get("Authorization", "").replace("Bearer ", "")
    if api_key != FCC_AUTH:
        raise HTTPException(401, "Unauthorized")
    if not EMERGENT_KEY:
        raise HTTPException(500, "EMERGENT_API_KEY not set")

    body = await request.json()
    model = body.get("model", EMERGENT_MODEL)
    messages = body.get("messages", [])
    system = body.get("system", "")
    max_tokens = body.get("max_tokens", 2000)
    temperature = body.get("temperature", 0.3)

    # Model mapping for compatibility with old FCC model names
    MODEL_MAP = {
        "claude-3-freecc-no-thinking/nvidia_nim/nvidia/nemotron-3-super-120b-a12b": "gpt-4o-mini",
        "claude-3-5-sonnet-20241022": "gpt-4o",
        "claude-3-5-haiku-20241022": "gpt-4o-mini",
        "claude-sonnet-4": "gpt-4o",
        "claude-haiku-4-5": "gpt-4o-mini",
    }
    emergent_model = MODEL_MAP.get(model, EMERGENT_MODEL)

    api_messages = []
    if system:
        api_messages.append({"role": "system", "content": system})
    for m in messages:
        content = m.get("content", "")
        if isinstance(content, list):
            content = "\n".join(b.get("text", "") for b in content if isinstance(b, dict))
        api_messages.append({"role": m.get("role", "user"), "content": str(content)})

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                "https://integrations.emergentagent.com/llm/chat/completions",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {EMERGENT_KEY}",
                },
                json={
                    "model": emergent_model,
                    "messages": api_messages,
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                },
            )
        if resp.status_code != 200:
            logging.error(f"Emergent error {resp.status_code}: {resp.text[:200]}")
            raise HTTPException(502, f"Upstream error: {resp.status_code}")

        data = resp.json()
        text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        return {
            "id": f"msg_{uuid.uuid4().hex[:24]}",
            "type": "message",
            "role": "assistant",
            "content": [{"type": "text", "text": text}],
            "model": emergent_model,
            "stop_reason": "end_turn",
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Proxy error: {e}")
        raise HTTPException(502, str(e)[:200])

@app.get("/health")
async def health():
    return {"status": "ok", "model": EMERGENT_MODEL}
