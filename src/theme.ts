import type { TextStyle } from 'react-native';

export const colors = {
  ink: '#15171A',
  hiVis: '#FFC629',
  ground: '#F3F2EE',
  surface: '#FFFFFF',
  muted: '#4A4F57',
  line: '#DAD8D1',
  lineSoft: '#E2E0D9',
  divider: '#EEECE6',
  inputBorder: '#C9C6BD',
  location: '#1F6FEB',
  note: '#FFF3C7',
  noteInk: '#6B4E00',
  inkRaised: '#2C3036',
  inkMuted: '#C9CCD1',
  inkBorder: '#5A6068',
  mapGround: '#E6E3DA',
  mapPark: '#D3E2C6',
  mapWater: '#C9DCEB',
  selectedBg: '#FFFBEA',
  doneMarker: '#1E7A46',
  distance: '#1847A8',
  scrim: 'rgba(21, 23, 26, 0.6)',
};

export const fonts = {
  regular: 'Barlow_400Regular',
  medium: 'Barlow_500Medium',
  semibold: 'Barlow_600SemiBold',
  bold: 'Barlow_700Bold',
  condSemibold: 'BarlowSemiCondensed_600SemiBold',
  condBold: 'BarlowSemiCondensed_700Bold',
};

// Reusable text presets from the style kit.
export const type = {
  screenTitle: { fontFamily: fonts.condBold, fontSize: 36, lineHeight: 38, color: colors.ink },
  label: {
    fontFamily: fonts.bold,
    fontSize: 13,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  sectionHeading: {
    fontFamily: fonts.bold,
    fontSize: 14,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  body: { fontFamily: fonts.regular, fontSize: 17, color: colors.ink },
} satisfies Record<string, TextStyle>;

export const tabular: TextStyle = { fontVariant: ['tabular-nums'] };
