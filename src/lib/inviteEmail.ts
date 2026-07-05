import { supabase } from './supabase';

// Workspace daveti oluşturulduktan sonra davet edilen kişiye bilgilendirme
// maili atar (EmailJS üzerinden, kodu supabase/functions/send-invite-email/
// içinde duran ama Dashboard'da "mail" adıyla deploy edilmiş Edge Function
// ile). Bilerek fire-and-forget kullanılıyor — mail gitmese bile davet DB'de
// zaten duruyor, kişi kendi başına giriş yapıp Dashboard'dan kabul edebilir.
export async function sendInviteEmail(params: {
  toEmail: string;
  inviterName: string;
  workspaceName: string;
  role: string;
}): Promise<void> {
  const { error } = await supabase.functions.invoke('mail', {
    body: {
      toEmail: params.toEmail,
      inviterName: params.inviterName,
      workspaceName: params.workspaceName,
      role: params.role,
    },
  });
  if (error) console.error('[Rutin] davet e-postası gönderilemedi:', error.message);
}
