// Rutin — Workspace daveti e-postası (Supabase Edge Function, Deno)
// Kaynak: "Ekip" ekranından davet gönderildiğinde, davet edilen kişiye
// gerçek bir e-posta gitmesi için eklendi (önceden davet sadece DB'de
// duruyordu, kimseye haber verilmiyordu).
//
// EmailJS kullanıyoruz (Resend gibi servislerin aksine kendi domain'ini
// doğrulamana gerek yok — kullanıcının kendi Gmail hesabı EmailJS'e
// bağlanıp onun üzerinden gönderiyor). Private key client'a hiç gitmez,
// burada `EMAILJS_PRIVATE_KEY` secret'ı olarak durur.
//
// Deploy: Dashboard → Edge Functions → "Deploy a new function" → bu
// dosyanın tamamını yapıştır (fonksiyon adı: send-invite-email). Sonra
// Secrets sayfasından EMAILJS_PRIVATE_KEY ekle.

const EMAILJS_PRIVATE_KEY = Deno.env.get('EMAILJS_PRIVATE_KEY');
const EMAILJS_SERVICE_ID = 'service_qvtfbe7';
const EMAILJS_TEMPLATE_ID = 'template_2e58jmn';
const EMAILJS_PUBLIC_KEY = 'lDL0lzampF8Z7XnC1';
const APP_URL = 'https://hamzaerkahriman.github.io/rutin-app/';

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (!EMAILJS_PRIVATE_KEY) return json({ error: 'EMAILJS_PRIVATE_KEY ayarlanmamış' }, 500);

  try {
    // Sadece giriş yapmış kullanıcılar bu fonksiyonu çağırabilir — asıl
    // yetki kontrolü (owner/admin mi, davet gerçekten var mı) zaten
    // `workspace_invites` satırı oluşturulurken RLS ile yapıldı, bu
    // fonksiyon sadece o satır oluştuktan sonra bildirim maili atıyor.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Yetkisiz' }, 401);

    const supabase = await import('https://esm.sh/@supabase/supabase-js@2').then(({ createClient }) =>
      createClient(SUPABASE_URL ?? '', SUPABASE_ANON_KEY ?? '', { global: { headers: { Authorization: authHeader } } })
    );
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return json({ error: 'Yetkisiz' }, 401);

    const { toEmail, inviterName, workspaceName, role } = await req.json();
    if (!toEmail || !inviterName || !workspaceName || !role) {
      return json({ error: 'Eksik alan' }, 400);
    }

    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        accessToken: EMAILJS_PRIVATE_KEY,
        template_params: {
          to_email: toEmail,
          inviter_name: inviterName,
          workspace_name: workspaceName,
          role,
          app_url: APP_URL,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return json({ error: `EmailJS hatası (${res.status}): ${errText}` }, 502);
    }

    return json({ ok: true });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
