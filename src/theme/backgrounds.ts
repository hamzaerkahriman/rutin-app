// Splash ve Auth ekranlarında dönüşümlü kullanılan arka plan havuzu.
// Gerçek fotoğraflar (kullanıcının sağladığı) + mood'a uyan gradient'ler.
// Yeni bir fotoğraf eklemek için: dosyayı assets/backgrounds/ içine koy,
// aşağıya bir require() satırı ekle — başka hiçbir şeyi değiştirmen gerekmez.

export type BackgroundDef =
  | { type: 'gradient'; name: string; colors: [string, string, string] }
  | { type: 'image'; name: string; source: number };

export const BACKGROUNDS: BackgroundDef[] = [
  // Gerçek fotoğraflar — kaynak: ~/Desktop/claude/Wallpaper/*.jpg (2560x1600),
  // her biri 900x1600'e ortadan crop edilip buraya kopyalandı. Metin ağırlıklı
  // olan (uçtan uca yazı içeren) ve karikatür/off-brand olan kaynaklar
  // kırpmada kenarları kesildiği ya da temaya uymadığı için elenmiştir.
  { type: 'image', name: 'joker', source: require('../../assets/backgrounds/bg-01-joker.jpg') },
  { type: 'image', name: 'focus', source: require('../../assets/backgrounds/bg-02-focus.jpg') },
  { type: 'image', name: 'crypto-laptop', source: require('../../assets/backgrounds/bg-03-crypto-laptop.jpg') },
  { type: 'image', name: 'cash-stacks', source: require('../../assets/backgrounds/bg-04-cash-stacks.jpg') },
  { type: 'image', name: 'cash-mountain', source: require('../../assets/backgrounds/bg-05-cash-mountain.jpg') },
  { type: 'image', name: 'money-falling', source: require('../../assets/backgrounds/bg-06-money-falling.jpg') },

  // Gradient placeholder'lar (fotoğraf havuzunu genişletmek için)
  { type: 'gradient', name: 'midnight-purple', colors: ['#1A1440', '#20243F', '#0F1115'] },
  { type: 'gradient', name: 'money-green', colors: ['#0B1F17', '#0F2A1E', '#0A0F0C'] },
  { type: 'gradient', name: 'ember-focus', colors: ['#1F1208', '#2A1A0A', '#0D0805'] },
  { type: 'gradient', name: 'crimson-noir', colors: ['#210808', '#2A0A0A', '#0D0505'] },
  { type: 'gradient', name: 'steel-mentality', colors: ['#10161D', '#1B242F', '#0A0D11'] },
  { type: 'gradient', name: 'gold-hustle', colors: ['#241A05', '#33270A', '#0F0B03'] },
  { type: 'gradient', name: 'deep-teal', colors: ['#07201E', '#0B2B28', '#050F0E'] },
  { type: 'gradient', name: 'slate-discipline', colors: ['#16181D', '#22252C', '#0B0C0F'] },
  { type: 'gradient', name: 'wine-power', colors: ['#230C1A', '#2E1022', '#0D0509'] },
  { type: 'gradient', name: 'graphite-focus', colors: ['#14151A', '#1E2026', '#08090B'] },
];

export function pickRandomBackground(): BackgroundDef {
  return BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)];
}
