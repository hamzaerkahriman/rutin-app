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
// GÜVENLİK: Fonksiyon sadece bir `inviteId` alır ve e-posta/workspace/rol
// bilgisini kendi içinde, çağıranın JWT'siyle (RLS'e tabi) DB'den okur.
// İlk sürüm bu alanları doğrudan client'tan (toEmail/workspaceName/...)
// alıyordu — bu, giriş yapmış HERHANGİ bir kullanıcının (kayıt ücretsiz ve
// açık) fonksiyonu rastgele parametrelerle çağırıp bu Gmail hesabı
// üzerinden istediği adrese istediği içerikte mail attırmasına izin veren
// bir açık mail-relay'e dönüşüyordu. Artık `invites_select_scope` RLS
// politikası (sadece owner/admin ya da davetin sahibi görebilir) devrede
// olduğu için, çağıran kişi gerçekten o daveti oluşturan owner/admin
// değilse sorgu boş döner ve fonksiyon 404 ile çıkar.
//
// Deploy: `supabase functions deploy mail` (CLI proje ile linklendikten
// sonra — supabase login + supabase link --project-ref ...). "Enforce JWT
// Verification" kapalı olmalı (fonksiyon kendi auth kontrolünü yapıyor,
// preflight OPTIONS isteğinin engellenmemesi için).

const EMAILJS_PRIVATE_KEY = Deno.env.get('EMAILJS_PRIVATE_KEY');
const EMAILJS_SERVICE_ID = 'service_qvtfbe7';
const EMAILJS_TEMPLATE_ID = 'template_2e58jmn';
const EMAILJS_PUBLIC_KEY = 'lDL0lzampF8Z7XnC1';
const APP_URL = 'https://hamzaerkahriman.github.io/rutin-app/';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
};

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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Yetkisiz' }, 401);

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(SUPABASE_URL ?? '', SUPABASE_ANON_KEY ?? '', {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return json({ error: 'Yetkisiz' }, 401);

    const { inviteId } = await req.json();
    if (!inviteId) return json({ error: 'inviteId eksik' }, 400);

    // Bu sorgu çağıranın JWT'siyle (RLS'e tabi) çalışıyor — invites_select_scope
    // politikası sadece o workspace'in owner/admin'ine izin verdiği için,
    // başkasının davetini (ya da var olmayan bir daveti) sorgulamaya çalışan
    // biri için `invite` burada null döner.
    const { data: invite, error: inviteError } = await supabase
      .from('workspace_invites')
      .select('email, role, status, workspace:workspaces(name)')
      .eq('id', inviteId)
      .maybeSingle();
    if (inviteError || !invite) return json({ error: 'Davet bulunamadı ya da erişim yok' }, 404);
    if (invite.status !== 'pending') return json({ error: 'Bu davet artık geçerli değil' }, 400);

    const { data: inviterRow } = await supabase.from('users').select('name').eq('id', user.id).maybeSingle();
    const workspaceName = (invite.workspace as unknown as { name: string } | null)?.name ?? 'bir workspace';

    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        accessToken: EMAILJS_PRIVATE_KEY,
        template_params: {
          to_email: invite.email,
          inviter_name: inviterRow?.name ?? 'Bir kullanıcı',
          workspace_name: workspaceName,
          role: ROLE_LABELS[invite.role] ?? invite.role,
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
