// Tasarım dili v2 — Rolex esintili premium kimlik: koyu safir zemin, ince
// altın vurgu, fildişi metin. Durum renkleri (in_progress/in_review vb.)
// bilinçli olarak marka altınından ayrı tutulur ki "bu tıklanabilir" (altın)
// ile "bu görev şu durumda" (mavi/mor/vb.) karışmasın.

export const palette = {
  sapphire: '#080F1E',
  sapphireElevated: '#0D1830',
  sapphireCard: '#111F3B',
  ivory: '#F3EEE2',
  ivoryMuted: '#8B93A8',
  emerald: '#1F9A63',
  gold: '#C9A227',
  goldLight: '#E8CD7A',
  amber: '#E0932E',
  crimson: '#D6524F',
  infoBlue: '#5B8DEF',
  violet: '#8471E0',
  slateBorder: '#20304F',
  goldBorder: 'rgba(201,162,39,0.30)',
};

export const gradients = {
  motivation: ['#1A1440', '#20243F', '#0F1115'] as [string, string, string],
  gold: ['#F7E4AC', '#D9B45C', '#B8872E'] as [string, string, string],
};

export const darkTheme = {
  background: palette.sapphire,
  surface: palette.sapphireElevated,
  card: palette.sapphireCard,
  border: palette.slateBorder,
  cardBorder: palette.goldBorder,
  text: palette.ivory,
  textMuted: palette.ivoryMuted,
  success: palette.emerald,
  accent: palette.gold,
  accentLight: palette.goldLight,
  accentText: palette.sapphire,
  warning: palette.amber,
  danger: palette.crimson,
  purple: palette.violet,
  info: palette.infoBlue,
};

export const lightTheme = {
  background: '#F7F5EF',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  border: '#E4E1D6',
  cardBorder: '#E7DFC8',
  text: '#14161A',
  textMuted: '#5B606B',
  success: palette.emerald,
  accent: '#A9821E',
  accentLight: '#C9A227',
  accentText: '#FFFFFF',
  warning: '#B4820F',
  danger: '#C63F3E',
  purple: palette.violet,
  info: '#3D6FE0',
};

export type Theme = typeof darkTheme;

export const statusColors: Record<string, string> = {
  pending: palette.ivoryMuted,
  started: palette.infoBlue,
  in_progress: palette.infoBlue,
  in_review: palette.violet,
  handed_off: palette.amber,
  completed: palette.emerald,
  failed: palette.crimson,
  postponed: palette.amber,
  cancelled: palette.ivoryMuted,
};

export const priorityColors: Record<string, string> = {
  low: palette.ivoryMuted,
  medium: palette.infoBlue,
  high: palette.amber,
  critical: palette.crimson,
};
