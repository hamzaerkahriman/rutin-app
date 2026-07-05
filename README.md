# Rutin

Görev ilerleme, görev devri, günlük disiplin ve ekip sorumluluk takip sistemi.
Ürün dokümanı: [`../rutin_urun_dokumani_v2.md`](../rutin_urun_dokumani_v2.md)

## Çalıştırma

```bash
npm install
npm run web      # tarayıcıda çalıştırır (en hızlı geliştirme döngüsü)
npm run ios      # iOS simülatöründe çalıştırır
npm run android  # Android emülatöründe çalıştırır
```

`.env` dosyasında `EXPO_PUBLIC_SUPABASE_URL` ve `EXPO_PUBLIC_SUPABASE_ANON_KEY`
tanımlı olmalı (bkz. `.env.example`).

## Görsel tasarım (frontend turu başladı)

Backend tamamlandıktan sonra görsel/UX turuna geçildi:

- **Splash ekranı**: her mount'ta (`app/index.tsx`) rastgele bir arka plan
  ([`src/theme/backgrounds.ts`](src/theme/backgrounds.ts) — 6 gerçek fotoğraf
  + 10 gradient, toplam 16 varyasyon) ve Supabase'deki 150 motivasyon
  cümlesinden rastgele biri seçilir. Alt kısımdaki ilerleme/CTA alanı
  `expo-blur` ile gerçek cam efekti (glassmorphism) kullanır.
- **Giriş/Kayıt ekranları** ([`src/components/AuthLayout.tsx`](src/components/AuthLayout.tsx)):
  aynı rastgele arka plan havuzu üzerinde yarı saydam, bulanık (blur) bir kart
  içinde form. Splash da auth ekranları da her mount'ta (dolayısıyla her
  sayfa yenilemede/geçişte) yeniden rastgele seçim yapar — "döngü" davranışı
  ek bir mekanizma gerektirmiyor, zaten `useState(() => pickRandomBackground())`
  ile mount başına bir kez çalışıyor.
- **Wallpaper fotoğrafları**: `assets/backgrounds/bg-01..06.jpg`. Kaynak:
  `~/Desktop/claude/Wallpaper/*.jpg` — masaüstü boyutunda (2560x1600, 16:10
  landscape) 13 fotoğraf, `sips -c 1600 900` ile ortadan 900x1600 portre'ye
  kırpılıp seçilenler buraya kopyalandı. 13'ten 6'sı seçildi: uçtan uca yazı
  içeren tasarımlar (ör. "MONEY", "YESTERDAY TODAY TOMORROW") portre kırpmada
  kenarlardan kesiliyordu, temaya uymayan (Rick and Morty) ve düşük çözünürlüklü/
  kompozisyonu bozulan (Tom and Jerry ekran görüntüsü) kaynaklar da elendi.
  Yeni fotoğraf eklemek için: kaynağı `sips -c <height> <width>` ile portre
  kırp (yazı/logo içeren görsellerde önce bir kırpma denemesi yapıp kenardan
  kesilmediğini doğrula), `assets/backgrounds/`'a koy, `src/theme/backgrounds.ts`'e
  bir `require()` satırı ekle — `AppBackground` bileşeni hem gradient hem
  image türünü destekliyor.
- **Hedef platform notu**: uygulama nihayetinde iOS ve Android telefonlarda
  kullanılacak. Şu ana kadarki görsel doğrulamalar `expo start --web` +
  Playwright ile yapıldı — `expo-blur` gibi native modüllerin gerçek
  cihazda/simülatörde de kontrol edilmesi gerekiyor (web'de çalışması
  native'de de çalışacağının garantisi değil).
- **Uygulama ikonu**: safir mavi zemin + altın "R" monogramı + ince altın
  halka (Rolex esintili premium/lüks tema). `assets/icon.png` (iOS),
  `assets/android-icon-foreground/background/monochrome.png` (Android
  adaptive icon, 3 katman) ve `assets/favicon.png` (web) — hepsi tek bir SVG
  kaynağından (`src/theme` dışında, scratchpad'te tutulan bir HTML/SVG
  şablonundan) üretildi. Yeni bir logo/görsel gelirse bu 5 dosyanın yerine
  konması yeterli.
- **Uygulama içi ikonlar**: tab bar ve header'daki emoji ikonlar
  `@expo/vector-icons` (Ionicons) ile değiştirildi — aktif sekme dolu
  (filled), pasifler outline varyantında, tema rengiyle uyumlu.
- **Uygulama geneli premium tema** ([`src/theme/colors.ts`](src/theme/colors.ts)):
  koyu safir zemin (`#080F1E`), altın vurgu rengi (`#C9A227`, ikonla aynı),
  fildişi metin. Durum renkleri (mavi/mor/amber — `in_progress`/`in_review`/vb.)
  bilinçli olarak markanın altın rengiyle karışmasın diye ayrı tutuldu.
  `PrimaryButton`'ın `accent` varyantı ve Splash/Auth submit butonları artık
  altın gradyan (`gradients.gold`) kullanıyor, üzerindeki metin okunabilirlik
  için koyu lacivert (`theme.accentText`) — düz beyaz metin gold zeminde
  kontrast sorunu yaratıyordu, hepsi düzeltildi. Varsayılan tema artık
  `'dark'` (sistem tercihine bakılmaksızın) çünkü bu palet koyu zeminde
  tasarlandı; kullanıcı Profil'den Aydınlık/Sistem'e geçebilir.

## Şu an nerede duruyoruz

Uygulama **gerçek Supabase backend'ine bağlı** — kayıt/giriş, görev CRUD,
checklist, notlar, devir (kabul/red onaylı), gün sonu save, **ekip davet
sistemi** ve backend'den beslenen raporlar hepsi Postgres'e yazıyor ve okuyor.
Uçtan uca test edildi:
- Bireysel akış: kayıt → görev oluştur → checklist → not → tamamla → save →
  sayfa yenileme sonrası veri kalıcı
- Davet akışı: owner e-posta ile davet gönderir (davet edilenin hesabı olması
  gerekmez) → davet edilen kayıt olur/giriş yapar → Dashboard'da bekleyen davet
  banner'ı görünür → kabul edince otomatik o workspace'e geçilir → iki
  workspace arasında sekme ile geçiş yapılabilir
- Devir akışı: gönderen "Devret" formunu doldurur → görev durumu "Devredildi"
  olur ama atanan kişi DEĞİŞMEZ (`accepted_status: 'pending'`) → devralan
  kişinin Dashboard'ında "Bekleyen Devir Talepleri" banner'ı çıkar → kabul
  edince görev ona geçer ve durum devir öncesine döner, reddedince gönderende
  kalır

- Auth: `app/(auth)/sign-in.tsx`, `app/(auth)/sign-up.tsx` +
  [`src/providers/AuthProvider.tsx`](src/providers/AuthProvider.tsx)
- İlk girişte otomatik bootstrap: `public.users` profili + kişisel workspace +
  owner üyeliği yoksa oluşturulur ([`src/store/AppStore.tsx`](src/store/AppStore.tsx))
- Çoklu workspace: kullanıcı birden fazla workspace'e üye olabilir, aktif
  workspace AsyncStorage'da kalıcıdır, Ekip ekranında sekme ile değiştirilir
- Davet: Ekip ekranında owner/admin e-posta + rol ile davet gönderir; Dashboard
  üstte bekleyen davetleri kabul/red butonlarıyla gösterir
  (`accept_workspace_invite` / `decline_workspace_invite` RPC fonksiyonları)
- Devir onayı: `accept_task_handoff` / `decline_task_handoff` RPC fonksiyonları
  ile devralan kişi onaylamadan görev el değiştirmez (ürün dokümanı §9)
- Raporlar: haftalık/aylık başarı ortalaması, ortalama görev tamamlama süresi,
  en çok tamamlanan/ertelenen kategori, en çok devreden/devralan kişi, takım
  verimlilik skoru — hepsi gerçek veriden hesaplanıyor. Artık gerçek grafikler
  de var: **7 günlük başarı trendi** (bar chart, `TrendBarChart`) ve
  **kategoriye göre / ekip başarı oranı** yatay bar grafikleri
  (`HorizontalBarRow`, yüzdeye göre yeşil/amber/kırmızı renklenir) —
  `src/components/Charts.tsx`. Herhangi bir grafik kütüphanesi eklenmedi;
  sadece View yükseklik/genişlik yüzdeleriyle çiziliyor, bu yüzden
  web/iOS/Android'de aynı şekilde render olur ve native bağımlılık/prebuild
  derdi yok.
- **Alt görevler**: bir görev, kendi atanan kişisi/durumu/ilerlemesi olan alt
  görevlere bölünebilir (`tasks.parent_task_id`, aynı tablo — ayrı bir tablo
  değil). İlk alt görev eklendiğinde üst görev otomatik `progressMode: 'subtask'`
  moduna geçer; üst görevin ilerlemesi alt görevlerin tamamlanma oranından
  otomatik hesaplanır. Task Detay ekranında "Kişi Bazlı İlerleme" bölümü kimin
  kaç alt görevi (%kaçını) tamamladığını gösterir.
- **Realtime senkronizasyon**: `tasks`, `task_checklists`, `task_notes`,
  `task_handoffs`, `workspace_members`, `workspace_invites` tabloları
  `supabase_realtime` publication'ına ekli — bir kullanıcı bir şey
  değiştirdiğinde (görev güncelleme, alt görev tamamlama, yeni üye/davet)
  diğer açık oturumlar sayfa yenilemeden anlık görüyor. İki tarayıcı ile test
  edildi: workspace'e yeni katılan üye, diğer tarafın açık ekranında reload
  olmadan seçilebilir hale geldi; bir kullanıcının tamamladığı alt görev,
  diğer kullanıcının o an açık olan görev sayfasında anlık güncellendi.
- **Bildirimler**: `notifications` tablosu artık gerçekten doluyor — Postgres
  trigger'ları (görev atandı, devir talebi geldi, göreve not eklendi, workspace
  daveti geldi) otomatik satır ekliyor, client bunu realtime dinleyip tabs
  header'ındaki 🔔 rozetinde ve `app/notifications.tsx` listesinde gösteriyor.
  Tıklayınca ilgili göreve (ya da davet ise Dashboard'a) gider ve okundu
  işaretler. Trigger'lar `SECURITY DEFINER` olduğu için hiçbir client kodu
  bildirim satırı insert etmiyor — tamamen DB tarafında, kaçırılması imkansız.
- `src/data/mockData.ts` artık sadece Splash ekranının motivasyon cümlesi için
  **fallback** olarak kullanılıyor (Supabase'e erişilemezse)
- **Kişiler arası mesajlaşma (DM)**: Ekip ekranında bir üyenin yanındaki 💬
  butonuna basınca `getOrCreateConversation` iki kullanıcı arasında (workspace
  içinde) tek bir `conversations` satırı bulur ya da oluşturur
  (`user_one_id < user_two_id` constraint'i client'ta da garanti edilir, aksi
  halde A→B ve B→A için ayrı satır oluşur) ve `/messages/[id]` sohbet ekranına
  yönlendirir. Tabs'te ayrı bir **Mesajlar** sekmesi var — sohbet listesi, son
  mesaj önizlemesi, okunmamış rozet sayısı (satırda + tab ikonunda). Sohbet
  ekranı mesaj balonları (gönderen altın, karşı taraf lacivert) + gönderme
  kutusu. Yeni mesaj geldiğinde `notify_message_received` trigger'ı otomatik
  `message_received` bildirimi ekliyor; bildirime tıklayınca doğrudan ilgili
  konuşmaya gider. `conversations` + `messages` tabloları realtime'a ekli —
  iki kullanıcılı Playwright testiyle doğrulandı: A mesaj gönderdi, B sayfa
  yenilemeden sohbet listesinde gördü, yanıtladı, A da yenilemeden yanıtı
  gördü, A'nın bildirim zili tıklanınca doğru konuşmaya yönlendi.

## Supabase şeması / migration

`supabase/migrations/` klasöründe **birden fazla dosya** var, birbirine göre farklı davranır:

- **`0001_init.sql`** — temel şema (users, workspaces, tasks, vb.).
  ⚠️ **Yıkıcıdır**: baştaki `drop table ... cascade` satırları yüzünden her
  çalıştırıldığında TÜM VERİYİ SİLİP şemayı sıfırdan kurar. Sadece ilk kurulumda
  ya da bilerek her şeyi sıfırlamak istediğinde çalıştır.
- **`0002_workspace_invites.sql`** — davet sistemi eklentisi. Sadece kendi
  tablosunu (`workspace_invites`) drop/create eder, diğer tablolara (users,
  tasks, ...) dokunmaz. Güvenle tekrar çalıştırılabilir.
- **`0003_handoff_approval.sql`** — devir kabul/red RPC fonksiyonları
  (`accept_task_handoff`, `reject_task_handoff`). Yeni tablo eklemez, mevcut
  `task_handoffs.accepted_status` kolonunu kullanır. Güvenle tekrar çalıştırılabilir.
- **`0004_subtasks.sql`** — `tasks` tablosuna `parent_task_id` kolonu ekler
  (alt görevler). Güvenle tekrar çalıştırılabilir.
- **`0005_realtime.sql`** — `tasks`, `task_checklists`, `task_notes`,
  `task_handoffs`, `workspace_members`, `workspace_invites` tablolarını
  `supabase_realtime` publication'ına ekler + `replica identity full` ayarlar
  (UPDATE/DELETE olaylarında eski satırın tüm kolonlarıyla gelmesi için).
  Güvenle tekrar çalıştırılabilir.
- **`0006_notifications.sql`** — `notifications` tablosuna `message` kolonu +
  4 trigger (`notify_task_assigned`, `notify_task_handoff_received`,
  `notify_task_note_added`, `notify_workspace_invite_received`) + tabloyu
  realtime publication'ına ekler. Güvenle tekrar çalıştırılabilir.
- **`0007_more_motivation_quotes.sql`** — `motivation_contents` tablosuna ~140
  ek motivasyon cümlesi seed'i. Güvenle tekrar çalıştırılabilir.
- **`0008_messaging.sql`** — kişiler arası mesajlaşma: `conversations` +
  `messages` tabloları, RLS, `notify_message_received` trigger'ı,
  `notifications.conversation_id` kolonu, ikisini de realtime publication'ına
  ekler. Sadece kendi tablolarını drop/create eder. Güvenle tekrar
  çalıştırılabilir.
- **`0009_scheduled_notifications.sql`** — cron gerektiren bildirim türleri:
  `pg_cron` uzantısını açar (Supabase projesinde kapalıysa Dashboard →
  Database → Extensions'tan manuel açılması gerekebilir), 3 fonksiyon +
  3 cron job kurar (`task_due_soon`/`task_overdue`/`checklist_incomplete`
  günlük 06:00 UTC, `daily_save_reminder` günlük 19:00 UTC,
  `weekly_report_ready` pazartesi 07:00 UTC). Her fonksiyon aynı gün için
  tekrar bildirim atmaz (idempotent). Güvenle tekrar çalıştırılabilir.

Yeni migration eklerken **0001'i tekrar düzenleyip çalıştırma** — üstüne
`000N_*.sql` şeklinde yeni, sadece-ekleyen bir dosya yaz (var olan tabloları
drop etme).

Uygulama yöntemi: Supabase Studio → SQL Editor'a yapıştırıp çalıştır, ya da
`psql` ile doğrudan bağlanıp `-f dosya.sql` çalıştır. Bu makinede IPv6 rotası
olmadığı için **Direct connection** (db.xxx.supabase.co) çalışmaz — Project
Settings → Connect → **Session pooler** (aws-0-...pooler.supabase.com:5432)
connection string'i kullan.

Migration'lar toplamda: 13 tablo (`users`, `workspaces`,
`workspace_members`, `workspace_invites`, `tasks`, `task_checklists`,
`task_notes`, `task_handoffs`, `daily_saves`, `motivation_contents`,
`notifications`, `conversations`, `messages`), tüm RLS politikaları,
`accept_workspace_invite` / `decline_workspace_invite` / `accept_task_handoff` /
`reject_task_handoff` RPC fonksiyonları ve `motivation_contents` için ~150
motivasyon cümlesi seed verisi kurar.

## Klasör yapısı

```
app/                    Expo Router route'ları (ekranlar)
  index.tsx             Splash / Motivasyon
  (auth)/                Giriş / Kayıt
  (tabs)/                Dashboard, Checklist, Görevler, Ekip, Mesajlar, Raporlar
  task/create.tsx        Görev Oluşturma
  task/[id]/index.tsx    Görev Detay
  task/[id]/handoff.tsx  Görev Devretme
  messages/[id].tsx       Sohbet ekranı (mesaj balonları + gönderme kutusu)
  profile.tsx            Profil / Ayarlar (çıkış yap dahil)
src/
  components/            Ortak UI (Card, Badge, ProgressBar, TaskCard, TaskAttachments)
  data/mockData.ts        Splash fallback motivasyon verisi
  lib/supabase.ts          Supabase client
  providers/AuthProvider.tsx  Oturum durumu + signIn/signUp/signOut
  store/AppStore.tsx       Merkezi state + Supabase sorguları (bootstrap, çoklu workspace, davetler dahil)
  theme/                   Renk paleti ve karanlık/aydınlık tema (AsyncStorage'da kalıcı)
  types/                   Veri modeli tipleri (ürün dokümanı §13 ile birebir)
supabase/migrations/       SQL şema + RLS politikaları (0001 yıkıcı, 0002+ ekleyici)
```

## Sağlamlık turu (hata durumları, boş ekranlar, offline davranış)

- **Bootstrap zaman aşımı + tekrar dene ekranı**: `AppStore.tsx`'teki ilk
  yükleme (`runBootstrap`) artık `Promise.race` ile 15 saniyelik bir zaman
  aşımına tabi. Önemli bulgu: supabase-js ağ hatalarında (offline, DNS,
  timeout) reject etmiyor — `{data: null, error: {...}}` şeklinde sessizce
  çözümleniyor. Kod sadece `data`'ya bakıp `error`'u yoksayıyorsa, bu durum
  "yeni kullanıcı, henüz workspace'i yok" ile ayırt edilemiyor ve bootstrap
  sessizce boş/bozuk bir duruma düşüyordu (kullanıcı adı boş, görev listesi
  boş bir uygulama). Düzeltme: her kritik sorgudan sonra `error` alanı ayrıca
  kontrol edilip gerçek bir hata varsa throw ediliyor (`.maybeSingle()`'da
  satır yokluğu zaten `error: null` döner, bu yüzden yanlış pozitif olmaz).
  Şimdi offline durumda kullanıcı "Bağlantı kurulamadı" + "Tekrar dene"
  butonu görüyor; buton internet geri gelince kaldığı yerden değil baştan
  (ama doğru) yükleniyor. İki kullanıcılı ve ağ-kesintili Playwright testiyle
  doğrulandı (`page.route(...).abort()` ile offline simüle edilerek).
- **Tüm `.then()` zincirlerine `.catch()` eklendi** (`AppStore.tsx`, 14 nokta):
  checklist/not/görev güncellemeleri, bildirim okundu işaretleme, mesaj okundu
  işaretleme, realtime callback'leri. Not: supabase-js'in postgrest builder'ı
  `PromiseLike` (sadece `.then`) döndürüyor, `Promise` değil — bu yüzden
  `.then().catch()` zincirlemek TypeScript hatası veriyor; bunun yerine
  `.then(onFulfilled, onRejected)` iki-argümanlı formu kullanıldı.
- **`AuthProvider`'daki `getSession()`** çağrısına `.catch()` eklendi — ağ
  hatası durumunda `initializing` sonsuza kadar `true` kalıp kullanıcıyı boş
  bir ekranda kilitli bırakmasın diye (hata durumunda oturumsuz kabul edilip
  giriş ekranına düşülüyor).
- **Sign-in/sign-up ekranları** artık `signIn`/`signUp` çağrılarını try/catch
  ile sarıyor (önceden ağ hatası durumunda loading sonsuza kadar `true`
  kalabiliyordu).
- **`switchWorkspace` çağrısı** (Ekip ekranındaki workspace sekmesi) artık
  hata durumunda `Alert.alert` gösteriyor (önceden sessizce başarısız
  oluyordu).
- **Devir ekranı**: workspace'te devredilecek başka üye yoksa (tek kişilik
  personal workspace) artık açıkça "devredebileceğin başka bir üye yok"
  mesajı gösteriyor — önceden boş bir chip alanı bırakıyordu.
- **Tekrarlanan davet koruması**: aynı e-postaya zaten bekleyen bir davet
  varsa `inviteMember` artık "Bu kişiye zaten bekleyen bir davet var"
  hatasıyla reddediyor (önceden aynı e-postaya birden fazla pending davet
  satırı oluşabiliyordu).
- **Boş durum kapsamı genişletildi**: Raporlar'da hiç görev yoksa "Henüz
  görev yok" mesajı (önceden boş bir Card kutusu kalıyordu).

## Bilinen eksikler (MVP sonrası, §16)

Bkz. ürün dokümanı §15-16 — planlanan her şey artık var (aşağıdaki AI
bölümüne bakın).

## AI özellikleri (ürün dokümanı §"v4 — Yapay Zeka Katmanı")

Üç özellik, tek bir Supabase Edge Function (`supabase/functions/ai-assist/index.ts`,
Deno runtime — bu yüzden ana projenin `tsconfig.json`'ında `supabase/functions`
`exclude` edildi, aksi halde `tsc` Deno globallerini/`https://esm.sh` importlarını
çözemiyor) üzerinden Anthropic Claude API'sini (`claude-haiku-4-5-20251001`)
çağırıyor:

- **AI ile Özetle** — Görev Detay ekranı, "Notlar ve Mesajlar" bölümü. Görev +
  not geçmişini 2-3 cümlede özetler.
- **AI ile taslak oluştur** — Devir ekranı. Görev geçmişinden "Şu ana kadar
  yapılanlar" / "Kalan işler" / "Dikkat edilmesi gerekenler" alanlarını
  otomatik doldurur (JSON döndürüp client'ta parse ediliyor), kullanıcı
  gönderemeden önce düzenleyebilir.
- **AI Yorumu Al** — Checklist ekranı, gün sonu save alındıktan sonra.
  Günün istatistiklerine (tamamlanan/başarısız/ertelenen/başarı oranı) göre
  kısa bir değerlendirme üretir.

Client tarafı: `src/lib/aiAssist.ts` (`getAiTaskSummary`, `getAiHandoffDraft`,
`getAiDailyComment` — hepsi `supabase.functions.invoke('ai-assist', ...)`
sarmalıyor).

**Güvenlik**: Anthropic API key'i client'a hiç ulaşmaz — Edge Function içinde
`ANTHROPIC_API_KEY` secret'ı olarak durur. Fonksiyon, çağıran kullanıcının
Supabase JWT'siyle RLS'e tabi bir client kurup görev/not verisini okuyor —
yani bir kullanıcı üyesi olmadığı bir workspace'in görevini AI'a asla
özetletemez (RLS zaten bunu engeller, fonksiyon service role kullanmıyor).

**Deploy**: Bu proje için Supabase CLI kurulu değil, bu yüzden fonksiyon
Dashboard üzerinden manuel deploy edilmeli: Dashboard → Edge Functions →
"Deploy a new function" → adı `ai-assist` → `index.ts` dosyasının tamamını
yapıştır → deploy et. Sonra Dashboard → Edge Functions → `ai-assist` →
Secrets'tan `ANTHROPIC_API_KEY` ekle. CLI kurulursa `supabase functions deploy
ai-assist` ile de yapılabilir.

Zamanlanmış bildirimler (`0009_scheduled_notifications.sql`) artık var —
`pg_cron` ile günlük/haftalık çalışan 3 fonksiyon: son tarih yaklaşıyor/geçti,
checklist tamamlanmadı, günlük save hatırlatması, haftalık rapor hazır.

**Dosya yükleme / sesli not** (`0010_task_attachments.sql`) artık var — Görev
Detay ekranında "Ekler" bölümü: fotoğraf (`expo-image-picker`), herhangi bir
dosya (`expo-document-picker`), sesli not kaydı (`expo-audio`,
`useAudioRecorder`/`useAudioPlayer`). Dosyalar özel (public olmayan) Storage
bucket'ında (`task-attachments`) tutulur, path convention
`{workspace_id}/{task_id}/{uuid}.ext` — hem `task_attachments` tablosu hem
`storage.objects` RLS ile korunur, sadece workspace üyeleri görüp
yükleyebilir/silebilir; görüntüleme `createSignedUrl` (1 saat geçerli) ile
yapılır. `src/components/TaskAttachments.tsx` bileşeninde toplanmıştır.
`app.json`'a `expo-image-picker`/`expo-document-picker` config plugin'leri
eklendi (izin metinleri için — gerçek cihaz build'inde gerekli).

İki cross-platform tuzağı test sırasında bulunup düzeltildi:
- Dosya okuma için önce `expo-file-system`'in yeni `File` sınıfı denendi ama
  bu sınıf **web'de desteklenmiyor** (sessizce no-op). `fetch(uri).then(r =>
  r.blob())` kullanımına geçildi — hem web'de (blob:/data: URI) hem native'de
  (file:// URI) aynı şekilde çalışıyor, ekstra pakete gerek kalmadı.
- `Alert.alert`'in çok butonlu (onay/vazgeç) hâli react-native-web'de **hiçbir
  şey yapmıyor** (dialog hiç açılmıyor, callback tetiklenmiyor) — bu yüzden
  eki silme web'de çalışmıyordu. `Platform.OS === 'web'` durumunda
  `window.confirm`'e düşen bir dal eklendi (`TaskAttachments.tsx`). Kodda bu
  desende olan tek yer buydu; ileride benzer bir onay/iptal `Alert.alert`
  eklenirse aynı çözüm uygulanmalı.

İki kullanıcılı ve tek kullanıcılı Playwright testleriyle doğrulandı: fotoğraf
yükleme (gerçek dosya seçici ile), dosya yükleme, mikrofon izniyle sesli not
kaydı (Chromium fake-device flag'leriyle), imza URL'siyle görüntüleme/oynatma,
silme (onay diyaloğu dahil) — hepsi çalışıyor.
