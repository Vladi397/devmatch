export const darkColors = {
  bg: "#0D0F1E",
  bgCard: "#131629",
  bgCardDeep: "#0A0C18",
  bgInput: "#1A1D35",
  bgChip: "#1E2240",
  border: "#252A4A",
  borderFocus: "#2D6EF5",
  blue: "#2D6EF5",
  blueBright: "#4D8EFF",
  cyan: "#00D4FF",
  pink: "#FF2D8A",
  magenta: "#C930E8",
  textPrimary: "#EDEFFF",
  textSecondary: "#8890BB",
  textMuted: "#4A5180",
  success: "#00C97A",
  warning: "#FFAA00",
  danger: "#FF3B60",
  matchHigh: "#FF2D8A",
  matchMed: "#FFAA00",
  matchLow: "#8890BB",
} as const;

export const lightColors = {
  bg: "#F0F2FF",
  bgCard: "#FFFFFF",
  bgCardDeep: "#E8ECFF",
  bgInput: "#F5F7FF",
  bgChip: "#EDF0FF",
  border: "#D0D8F0",
  borderFocus: "#2D6EF5",
  blue: "#2D6EF5",
  blueBright: "#4D8EFF",
  cyan: "#0099BB",
  pink: "#C81062",
  magenta: "#9920C0",
  textPrimary: "#0D0F2E",
  textSecondary: "#3A4270",
  textMuted: "#7A84B0",
  success: "#007A55",
  warning: "#A07000",
  danger: "#C42040",
  matchHigh: "#C81062",
  matchMed: "#A07000",
  matchLow: "#7A84B0",
} as const;

// Keep Colors as the dark palette for any static usage
export const Colors = darkColors;

export type ColorPalette = typeof darkColors;

export const Fonts = {
  black: "800" as const,
  bold: "700" as const,
  semibold: "600" as const,
  medium: "500" as const,
  regular: "400" as const,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};
