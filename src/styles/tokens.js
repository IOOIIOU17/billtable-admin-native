export const colors = {
  ink: '#1A1A1A',
  paper: '#FEFEFE',
  pencil: '#4A4A4A',
  light: '#E8E8E8',
  // Placeholder / hint text: #767676 is the lightest gray that still
  // meets WCAG AA contrast (4.5:1) on white. #E8E8E8 was unreadable.
  placeholder: '#767676',
}

export const fonts = {
  logo: 'Caveat-Bold',
  // TigTagTrue wordmark: Caveat Regular (thin), chosen 7 Oct 2026
  brand: 'Caveat-Regular',
  body: 'PatrickHand-Regular',
  hint: 'Kalam-Regular',
}

export const radius = 16

export const spacing = {
  xs: 8,
  sm: 16,
  md: 24,
  lg: 32,
  xl: 48,
}

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 36,
}

// Status colours for the owner dashboard only (the rest of the app stays
// black / white / gray). Muted so they sit with the pencil look, and each
// one passes 4.5:1 on paper. A status is never shown by colour alone: the
// light also carries a glyph (✓ ! ✕) and a word.
export const status = {
  ok: '#2E6B45',
  warn: '#8A5A00',
  bad: '#B3261E',
  none: '#767676',
  okBg: '#EEF5F0',
  warnBg: '#FBF3E2',
  badBg: '#FBECEA',
  noneBg: '#F2F2F2',
}
