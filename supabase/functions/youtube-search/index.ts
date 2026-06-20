import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { query } = await req.json();
    if (!query || typeof query !== 'string') {
      return new Response(JSON.stringify({ error: 'query required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&hl=pt-BR&gl=BR`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      },
    });
    const html = await res.text();
    const ids: string[] = [];
    const re = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
    let m;
    while ((m = re.exec(html)) && ids.length < 10) {
      if (!ids.includes(m[1])) ids.push(m[1]);
    }
    if (!ids.length) {
      return new Response(JSON.stringify({ error: 'no results' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ videoId: ids[0], ids }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
