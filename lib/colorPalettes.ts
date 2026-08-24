// S-Invite — Theme Color Palettes Definition
export interface ColorPalette {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  bgLight: string;
  bgDark: string;
}

export const COLOR_PALETTES: Record<string, ColorPalette> = {
  champagne: {
    name: "Champagne Gold",
    primary: "#a67c52",
    secondary: "#c5a059",
    accent: "#e5c158",
    bgLight: "#faf7f2",
    bgDark: "#1a1614",
  },
  emerald: {
    name: "Royal Emerald",
    primary: "#1b4931",
    secondary: "#2d6a4f",
    accent: "#52b788",
    bgLight: "#f2f7f4",
    bgDark: "#0d2318",
  },
  rose: {
    name: "Dusty Rose",
    primary: "#9d5c63",
    secondary: "#c47b83",
    accent: "#e0989f",
    bgLight: "#fbf5f5",
    bgDark: "#231416",
  },
  midnight: {
    name: "Midnight Navy",
    primary: "#1c2d42",
    secondary: "#2c4563",
    accent: "#4a6fa5",
    bgLight: "#f0f4f8",
    bgDark: "#0c1520",
  },
  monochrome: {
    name: "Editorial Monochrome",
    primary: "#262626",
    secondary: "#525252",
    accent: "#a3a3a3",
    bgLight: "#fafafa",
    bgDark: "#0a0a0a",
  },
  terracotta: {
    name: "Warm Terracotta",
    primary: "#a85d42",
    secondary: "#c8765c",
    accent: "#e0937a",
    bgLight: "#fbf5f2",
    bgDark: "#24130e",
  },
};
