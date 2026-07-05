// Rutin — AI yardımcı fonksiyonu (Supabase Edge Function, Deno)
// Kaynak: ürün dokümanı §"v4 — Yapay Zeka Katmanı" (görev özeti, gün sonu
// yorumu, devir notu taslağı). Tek fonksiyon, `mode` alanına göre 3 farklı
// prompt üretip Anthropic Messages API'sini çağırır.
//
// Anthropic API key'i client'a asla gönderilmez — bu fonksiyon içinde
// `ANTHROPIC_API_KEY` secret'ı olarak saklanır (Dashboard → Edge Functions →
// Secrets, ya da `supabase secrets set`). Client sadece kendi Supabase
// session JWT'siyle bu fonksiyonu çağırır; fonksiyon o JWT ile RLS'e tabi bir
// Supabase client kurup görev/not verisini okur — böylece bir kullanıcı
// üyesi olmadığı bir workspace'in görevini asla özetleyemez.
//
// Deploy: Dashboard → Edge Functions → "Deploy a new function" → bu dosyanın
// tamamını yapıştır (fonksiyon adı: ai-assist). Sonra Secrets sayfasından
// ANTHROPIC_API_KEY ekle.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

async function callClaude(systemPrompt: string, userPrompt: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY ?? '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Anthropic API hatası (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text ?? '';
}

function extractJson(text: string): any {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('AI yanıtı JSON içermiyor');
  return JSON.parse(text.slice(start, end + 1));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (!ANTHROPIC_API_KEY) return json({ error: 'ANTHROPIC_API_KEY ayarlanmamış' }, 500);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Yetkisiz' }, 401);

    const supabase = createClient(SUPABASE_URL ?? '', SUPABASE_ANON_KEY ?? '', {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return json({ error: 'Yetkisiz' }, 401);

    const body = await req.json();
    const { mode } = body;

    if (mode === 'task_summary' || mode === 'handoff_draft') {
      const { taskId } = body;
      const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).maybeSingle();
      if (!task) return json({ error: 'Görev bulunamadı ya da erişim yok' }, 404);

      const { data: notes } = await supabase
        .from('task_notes')
        .select('content, created_at')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });
      const noteText = (notes ?? []).map((n: any) => `- ${n.content}`).join('\n') || 'yok';

      if (mode === 'task_summary') {
        const text = await callClaude(
          'Sen Rutin adlı görev yönetimi uygulamasında çalışan bir asistansın. Sadece istenen özeti Türkçe, 2-3 cümlede, düz metin olarak döndür — başka hiçbir açıklama ekleme.',
          `Görev: ${task.title}\nAçıklama: ${task.description ?? '-'}\nDurum: ${task.status}\nNotlar:\n${noteText}\n\nBu görevi kısaca özetle.`
        );
        return json({ summary: text.trim() });
      }

      const raw = await callClaude(
        'Sen Rutin adlı görev yönetimi uygulamasında bir görev devri taslağı hazırlayan asistansın. Yalnızca şu alanlara sahip geçerli bir JSON nesnesi döndür, başka hiçbir metin ekleme: {"doneSoFar": string, "remainingWork": string, "cautionNotes": string}. Tüm alanlar Türkçe, kısa ve net olsun.',
        `Görev: ${task.title}\nAçıklama: ${task.description ?? '-'}\nDurum: ${task.status}\nNotlar:\n${noteText}\n\nBu göreve dair bir devir taslağı hazırla.`
      );
      const parsed = extractJson(raw);
      return json({
        doneSoFar: String(parsed.doneSoFar ?? ''),
        remainingWork: String(parsed.remainingWork ?? ''),
        cautionNotes: String(parsed.cautionNotes ?? ''),
      });
    }

    if (mode === 'daily_comment') {
      const { completedTasks, failedTasks, postponedTasks, successRate } = body;
      const text = await callClaude(
        'Sen Rutin adlı görev yönetimi uygulamasında motive edici gün sonu yorumları yazan bir asistansın. Sadece istenen yorumu Türkçe, 1-2 cümlede, düz metin olarak döndür — başka hiçbir açıklama ekleme.',
        `Bugünkü performans: ${completedTasks} tamamlandı, ${failedTasks} başarısız, ${postponedTasks} ertelendi, başarı oranı %${successRate}. Bu verilere göre kısa bir gün sonu değerlendirmesi yaz.`
      );
      return json({ comment: text.trim() });
    }

    return json({ error: 'Geçersiz mod' }, 400);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
