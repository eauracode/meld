/**
 * MELD "Bold Tech" brand tokens (09_UIUX_SPEC §1) — the single source for all
 * four surfaces' Tailwind configs. Ratio ≈ 65% ink / 25% greens+mist / 10% lime.
 * Lime is an ACCENT only (CTAs, key money figures, logo node) — never a large
 * fill behind body text.
 */
export const colors = {
  ink: "#0C1410",
  lime: "#B6F542",
  green: "#3F8A66",
  pine: "#2E6B4F",
  mist: "#F2F5F0",
  slate: "#5F7D6E",
  white: "#FFFFFF",
  /** Muted text on dark backgrounds (contrast rule: set explicitly, never inherit). */
  mutedOnDark: "#9DB3A8",
} as const;

export const fonts = {
  heading: `"Century Schoolbook", Georgia, serif`,
  body: `Calibri, Arial, sans-serif`,
} as const;

/** Type scale (px) per the spec. */
export const typeScale = {
  h1: { min: 34, max: 44 },
  h2: { min: 28, max: 32 },
  h3: { min: 18, max: 22 },
  body: { min: 14, max: 16 },
  caption: { min: 11, max: 13 },
} as const;

/** Shared Tailwind theme extension — spread into each app's tailwind config. */
export const tailwindTheme = {
  colors: {
    ink: colors.ink,
    lime: colors.lime,
    green: colors.green,
    pine: colors.pine,
    mist: colors.mist,
    slate: colors.slate,
    "muted-dark": colors.mutedOnDark,
  },
  fontFamily: {
    heading: ["Century Schoolbook", "Georgia", "serif"],
    body: ["Calibri", "Arial", "sans-serif"],
  },
} as const;
