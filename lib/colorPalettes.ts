// S-Invite — Theme Color Palettes Definition
export interface ColorPalette {
  id?: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  bgLight: string;
  bgDark: string;
  textDark?: string;
}

export const COLOR_PALETTES: Record<string, ColorPalette> = {
  champagne: {
    id: "champagne",
    name: "Royal Champagne Gold",
    primary: "#a67c52",
    secondary: "#7a5430",
    accent: "#b38b4d",
    bgLight: "#faf7f2",
    bgDark: "#1a1614",
    textDark: "#2b2725",
  },
  emerald: {
    id: "emerald",
    name: "Emerald Green & Gold",
    primary: "#1b4332",
    secondary: "#2d6a4f",
    accent: "#c9a227",
    bgLight: "#f2f7f4",
    bgDark: "#0b1c14",
    textDark: "#132a20",
  },
  burgundy: {
    id: "burgundy",
    name: "Burgundy & Rose Gold",
    primary: "#54192b",
    secondary: "#7a253f",
    accent: "#d4a373",
    bgLight: "#faf2f4",
    bgDark: "#1c070e",
    textDark: "#2c0e17",
  },
  sage: {
    id: "sage",
    name: "Botanical Sage Green",
    primary: "#4a5d4e",
    secondary: "#627d68",
    accent: "#b89f81",
    bgLight: "#f1f5f2",
    bgDark: "#141c16",
    textDark: "#212d24",
  },
  terracotta: {
    id: "terracotta",
    name: "Warm Terracotta & Sand",
    primary: "#8c583a",
    secondary: "#a86b47",
    accent: "#c99a57",
    bgLight: "#fdf8f4",
    bgDark: "#21150e",
    textDark: "#2c1c13",
  },
  monochrome: {
    id: "monochrome",
    name: "Monochrome Dark & Silver",
    primary: "#262626",
    secondary: "#404040",
    accent: "#c0a062",
    bgLight: "#f5f5f5",
    bgDark: "#0f0f0f",
    textDark: "#171717",
  },
  // Aliases for backwards compatibility
  rose: {
    id: "rose",
    name: "Dusty Rose",
    primary: "#9d5c63",
    secondary: "#c47b83",
    accent: "#e0989f",
    bgLight: "#fbf5f5",
    bgDark: "#231416",
    textDark: "#2c0e17",
  },
  midnight: {
    id: "midnight",
    name: "Midnight Navy",
    primary: "#1c2d42",
    secondary: "#2c4563",
    accent: "#4a6fa5",
    bgLight: "#f0f4f8",
    bgDark: "#0c1520",
    textDark: "#132a20",
  },
};
