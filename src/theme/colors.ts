// Tasarım dili v3 — "Rutin Adaptive System" (Stitch'te üretilen tasarımdan
// birebir aktarıldı, bkz. ~/Desktop/claude/stitch_rutin_collaborative_task_tracker/
// rutin_adaptive_system/DESIGN.md). Felsefe: "Disciplined Progress" — açık,
// minimalist, az renkli, bol boşluklu bir "kurumsal modern" tema. Zümrüt
// yeşili (#006c49) hem marka vurgusu hem "başarı/tamamlandı" rengi olarak
// kasıtlı olarak aynı — DESIGN.md bunu net şekilde tarif ediyor ("Productive
// Emerald, used exclusively for success states... and primary calls to
// action"). Eski koyu safir/altın "Rolex" temasının tamamen yerini alır.

export const palette = {
  bg: '#F4FBF4',
  surfaceLow: '#EEF6EE',
  surfaceContainer: '#E8F0E9',
  surfaceContainerHigh: '#E3EAE3',
  surfaceContainerHighest: '#DDE4DD',
  white: '#FFFFFF',
  onSurface: '#161D19',
  onSurfaceVariant: '#3C4A42',
  outline: '#6C7A71',
  outlineVariant: '#BBCABF',
  primary: '#006C49',
  primaryContainer: '#10B981',
  primaryFixed: '#6FFBBE',
  primaryFixedDim: '#4EDEA3',
  onPrimaryFixedVariant: '#005236',
  onPrimaryFixed: '#002113',
  secondary: '#545F73',
  secondaryContainer: '#D5E0F8',
  tertiary: '#A43A3A',
  tertiaryContainer: '#FC7C78',
  onTertiaryContainer: '#711419',
  error: '#BA1A1A',
  errorContainer: '#FFDAD6',
  onErrorContainer: '#93000A',
  cardBorderLight: '#E2E8F0',
  // Koyu mod (mockup'larda gösterilmedi, MD3 dark-mode geleneğine göre aynı
  // token ailesinden türetildi — bkz. ThemeProvider'daki light/dark seçici).
  darkBg: '#10231A',
  darkSurfaceContainer: '#1B2E24',
  darkCard: '#18291F',
  darkBorder: '#2C3F34',
  darkOnSurface: '#E3F1E7',
  darkOnSurfaceVariant: '#A8C4B3',
};

export const gradients = {
  // Artık kullanılmıyor ama diğer dosyalarda import hatası vermemesi için
  // boş bırakmak yerine tema rengiyle uyumlu tek renkli bir "gradient" tutuyoruz.
  primary: ['#00805A', '#006C49', '#00553A'] as [string, string, string],
};

export const darkTheme = {
  background: palette.darkBg,
  surface: palette.darkBg,
  card: palette.darkCard,
  border: palette.darkBorder,
  cardBorder: palette.darkBorder,
  text: palette.darkOnSurface,
  textMuted: palette.darkOnSurfaceVariant,
  success: palette.primaryFixedDim,
  accent: palette.primaryFixedDim,
  accentLight: palette.primaryFixed,
  accentText: palette.onPrimaryFixed,
  warning: '#E0932E',
  danger: '#FFB3AF',
  purple: '#8471E0',
  info: '#9DB8E8',
};

export const lightTheme = {
  background: palette.bg,
  surface: palette.bg,
  card: palette.white,
  border: palette.outlineVariant,
  cardBorder: palette.cardBorderLight,
  text: palette.onSurface,
  textMuted: palette.onSurfaceVariant,
  success: palette.primary,
  accent: palette.primary,
  accentLight: palette.primaryContainer,
  accentText: palette.white,
  warning: '#B4820F',
  danger: palette.error,
  purple: '#6B5FB3',
  info: palette.secondary,
};

export type Theme = typeof darkTheme;

export const statusColors: Record<string, string> = {
  pending: palette.outline,
  started: palette.secondary,
  in_progress: palette.primary,
  in_review: palette.onSurfaceVariant,
  handed_off: palette.tertiary,
  completed: palette.primary,
  failed: palette.error,
  postponed: palette.secondary,
  cancelled: palette.outline,
};

export const priorityColors: Record<string, string> = {
  low: palette.outline,
  medium: palette.secondary,
  high: palette.primary,
  critical: palette.tertiary,
};
