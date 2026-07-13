// Integration tests for the judge-ai edge function.
// Runs with Deno test runner. Mocks fetch to the Lovable AI Gateway.
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";

Deno.env.set("LOVABLE_API_KEY", Deno.env.get("LOVABLE_API_KEY") ?? "test-key");

// Capture Deno.serve handler
let handler: (req: Request) => Promise<Response> | Response = () => new Response();
const origServe = Deno.serve;
// deno-lint-ignore no-explicit-any
(Deno as any).serve = (h: any) => {
  handler = h;
  return { finished: Promise.resolve(), shutdown: () => {}, ref: () => {}, unref: () => {} } as any;
};
await import("./index.ts");
// deno-lint-ignore no-explicit-any
(Deno as any).serve = origServe;

const origFetch = globalThis.fetch;
function mockFetch(fn: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  globalThis.fetch = fn as typeof fetch;
}
function restoreFetch() {
  globalThis.fetch = origFetch;
}

function sseStream(chunks: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(enc.encode(c));
      controller.close();
    },
  });
}

Deno.test("OPTIONS returns CORS ok", async () => {
  const res = await handler(new Request("http://x", { method: "OPTIONS" }));
  assertEquals(res.status, 200);
  await res.text();
});

Deno.test("400 when no case/messages", async () => {
  const res = await handler(new Request("http://x", { method: "POST", body: JSON.stringify({}) }));
  assertEquals(res.status, 400);
  const j = await res.json();
  assertStringIncludes(j.error, "case");
});

Deno.test("streams SSE with report sections and forwards system prompt", async () => {
  let capturedBody: any = null;
  let capturedHeaders: HeadersInit | undefined;
  mockFetch(async (_url, init) => {
    capturedBody = JSON.parse(String(init?.body ?? "{}"));
    capturedHeaders = init?.headers;
    const parts = [
      "data: {\"choices\":[{\"delta\":{\"content\":\"### 1. Relatório\\n\"}}]}\n\n",
      "data: {\"choices\":[{\"delta\":{\"content\":\"### 4. Conclusão\\n\"}}]}\n\n",
      "data: [DONE]\n\n",
    ];
    return new Response(sseStream(parts), { status: 200, headers: { "Content-Type": "text/event-stream" } });
  });
  try {
    const res = await handler(new Request("http://x", {
      method: "POST",
      body: JSON.stringify({ case: "Cliente não pagou honorários combinados." }),
    }));
    assertEquals(res.status, 200);
    assertEquals(res.headers.get("Content-Type"), "text/event-stream");
    const text = await res.text();
    assertStringIncludes(text, "Relatório");
    assertStringIncludes(text, "Conclusão");
    // system prompt forwarded
    assertEquals(capturedBody.messages[0].role, "system");
    assertStringIncludes(capturedBody.messages[0].content, "Juiz Virtual");
    assertStringIncludes(capturedBody.messages[0].content, "MECANISMO ANTI-ERRO");
    assertEquals(new Headers(capturedHeaders).has("Lovable-API-Key"), true);
    assertEquals(capturedBody.stream, true);
  } finally {
    restoreFetch();
  }
});

Deno.test("maps 429 rate limit to friendly JSON", async () => {
  mockFetch(async () => new Response("rate", { status: 429 }));
  try {
    const res = await handler(new Request("http://x", { method: "POST", body: JSON.stringify({ case: "x" }) }));
    assertEquals(res.status, 200);
    const j = await res.json();
    assertEquals(j.status, 429);
    assertStringIncludes(j.error, "Limite");
  } finally {
    restoreFetch();
  }
});

Deno.test("maps 402 payment required to friendly JSON", async () => {
  mockFetch(async () => new Response("credits", { status: 402 }));
  try {
    const res = await handler(new Request("http://x", { method: "POST", body: JSON.stringify({ case: "x" }) }));
    assertEquals(res.status, 200);
    const j = await res.json();
    assertEquals(j.status, 402);
    assertStringIncludes(j.error, "Créditos");
  } finally {
    restoreFetch();
  }
});

Deno.test("maps other upstream errors to friendly JSON", async () => {
  mockFetch(async () => new Response("boom", { status: 503 }));
  try {
    const res = await handler(new Request("http://x", { method: "POST", body: JSON.stringify({ case: "x" }) }));
    assertEquals(res.status, 200);
    const j = await res.json();
    assertEquals(j.status, 503);
    assertStringIncludes(j.error, "gateway");
  } finally {
    restoreFetch();
  }
});

Deno.test("catches fetch throw and returns friendly JSON", async () => {
  mockFetch(async () => { throw new Error("network down"); });
  try {
    const res = await handler(new Request("http://x", { method: "POST", body: JSON.stringify({ case: "x" }) }));
    assertEquals(res.status, 200);
    const j = await res.json();
    assertStringIncludes(j.error, "network down");
  } finally {
    restoreFetch();
  }
});

Deno.test("accepts messages history array", async () => {
  let captured: any = null;
  mockFetch(async (_u, init) => {
    captured = JSON.parse(String(init?.body ?? "{}"));
    return new Response(sseStream(["data: [DONE]\n\n"]), { status: 200 });
  });
  try {
    const res = await handler(new Request("http://x", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "olá" }] }),
    }));
    assertEquals(res.status, 200);
    await res.text();
    assertEquals(captured.messages.length, 2);
    assertEquals(captured.messages[1].content, "olá");
  } finally {
    restoreFetch();
  }
});

Deno.test("adapts system prompt for Gemini, GPT and Claude model families", async () => {
  const captured: any[] = [];
  mockFetch(async (_u, init) => {
    captured.push(JSON.parse(String(init?.body ?? "{}")));
    return new Response(sseStream(["data: [DONE]\n\n"]), { status: 200, headers: { "Content-Type": "text/event-stream" } });
  });
  try {
    const cases = [
      ["google/gemini-2.5-flash", "ADAPTAÇÃO PARA MODELOS GEMINI"],
      ["openai/gpt-5", "ADAPTAÇÃO PARA MODELOS GPT"],
      ["claude-sonnet-4-5", "ADAPTAÇÃO PARA MODELOS CLAUDE"],
    ];

    for (const [model, marker] of cases) {
      const res = await handler(new Request("http://x", {
        method: "POST",
        body: JSON.stringify({ model, case: "Segurado busca aposentadoria." }),
      }));
      assertEquals(res.status, 200);
      await res.text();
      const prompt = captured.at(-1)?.messages?.[0]?.content ?? "";
      assertStringIncludes(prompt, marker);
      assertStringIncludes(prompt, "EC nº 103/2019");
    }
  } finally {
    restoreFetch();
  }
});
