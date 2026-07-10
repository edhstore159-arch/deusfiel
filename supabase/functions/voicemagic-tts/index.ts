import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { requireUser } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const _auth_res = await requireUser(req);
  if (_auth_res instanceof Response) return _auth_res;

  try {
    const apiKey = Deno.env.get('WATZZAP_AUDIO_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'WATZZAP_AUDIO_API_KEY não configurada' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { text, voiceId, action = 'tts' } = await req.json().catch(() => ({}));

    if (action === 'list-voices') {
      const r = await fetch('https://voicemagic.dev/api/v1/voices', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const data = await r.json().catch(() => ({}));
      return new Response(JSON.stringify(data), {
        status: r.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: 'text obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const r = await fetch('https://voicemagic.dev/api/v1/tts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, voiceId }),
    });

    const ct = r.headers.get('content-type') || '';
    if (ct.includes('audio/')) {
      const buf = new Uint8Array(await r.arrayBuffer());
      let bin = ''; for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
      const b64 = btoa(bin);
      return new Response(JSON.stringify({ ok: true, audio_base64: b64, mime: ct }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await r.json().catch(() => ({}));
    return new Response(JSON.stringify(data), {
      status: r.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message || e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
