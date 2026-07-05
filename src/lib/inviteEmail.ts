import { supabase } from './supabase';

// Workspace daveti oluşturulduktan sonra davet edilen kişiye bilgilendirme
// maili atar (EmailJS üzerinden, supabase/functions/mail/ Edge Function'ı
// ile). Bilerek fire-and-forget kullanılıyor — mail gitmese bile davet DB'de
// zaten duruyor, kişi kendi başına giriş yapıp Dashboard'dan kabul edebilir.
//
// Sadece `inviteId` gönderiyoruz — e-posta/workspace adı/rol gibi bilgileri
// fonksiyon kendi içinde, çağıranın RLS'e tabi JWT'siyle DB'den okuyor. Bu
// sayede fonksiyon rastgele parametrelerle çağrılıp açık bir mail-relay gibi
// kötüye kullanılamaz — sadece gerçekten var olan ve çağıranın erişebildiği
// bir davete karşılık mail gider.
export async function sendInviteEmail(inviteId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('mail', {
    body: { inviteId },
  });
  if (error) console.error('[Rutin] davet e-postası gönderilemedi:', error.message);
}
