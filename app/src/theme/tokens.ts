// Généré par replica/design/build-tokens.mjs depuis tokens.json. Ne pas modifier à la main.
export const tokens = {
  "color": {
    "bg": "#071a2c",
    "surface": "#0e2133",
    "surface-2": "#142739",
    "surface-pressed": "#1b3044",
    "tile": "#0e2133",
    "border": "#2b3b4a",
    "border-input": "#6a7c8a",
    "text": "#f4fbfc",
    "text-muted": "#8fa8b5",
    "text-subtle": "#8fa8b5",
    "accent": "#2dd4bf",
    "accent-pressed": "#25b8a6",
    "accent-soft": "#0d2f3a",
    "on-accent": "#000000",
    "on-accent-soft": "#5eead4",
    "info": "#7dd3fc",
    "info-soft": "#0c2a40",
    "focus": "#5eead4",
    "danger": "#fca5a5",
    "danger-soft": "#2a1622",
    "danger-fill": "#dc2626",
    "success": "#6ee7b7",
    "success-soft": "#0b2e2b",
    "warning": "#fcd34d",
    "warning-soft": "#2c2614",
    "star": "#fcd34d",
    "overlay": "#000000",
    "marker-pickup": "#2dd4bf",
    "marker-dropoff": "#f4fbfc",
    "route": "#2dd4bf",
    "disabled-bg": "#142739",
    "disabled-text": "#5a6b78",
    "gold": "#d4af37"
  },
  "font": {
    "sans": "Geist",
    "mono": "Geist Mono",
    "fallback": "system-ui, -apple-system, Roboto, sans-serif"
  },
  "type": {
    "xs": {
      "size": 12,
      "line": 16,
      "weight": 500
    },
    "sm": {
      "size": 14,
      "line": 20,
      "weight": 400
    },
    "base": {
      "size": 16,
      "line": 24,
      "weight": 400
    },
    "lg": {
      "size": 20,
      "line": 28,
      "weight": 700
    },
    "xl": {
      "size": 28,
      "line": 36,
      "weight": 700
    },
    "display": {
      "size": 36,
      "line": 44,
      "weight": 700
    },
    "label-sm": {
      "size": 12,
      "line": 16,
      "weight": 500
    },
    "label": {
      "size": 14,
      "line": 18,
      "weight": 500
    },
    "label-lg": {
      "size": 16,
      "line": 20,
      "weight": 500
    }
  },
  "space": [
    0,
    4,
    8,
    12,
    16,
    20,
    24,
    32,
    48,
    64
  ],
  "radius": {
    "sm": 3,
    "md": 6,
    "lg": 10,
    "xl": 16,
    "pill": 999
  },
  "shadow": {
    "card": {
      "y": 1,
      "blur": 4,
      "opacity": 0.16
    },
    "sheet": {
      "y": -2,
      "blur": 8,
      "opacity": 0.16
    },
    "pop": {
      "y": 8,
      "blur": 24,
      "opacity": 0.16
    }
  },
  "size": {
    "tap-min": 48,
    "button-sm": 36,
    "button-md": 48,
    "button-lg": 56,
    "avatar-sm": 32,
    "avatar-md": 44,
    "avatar-lg": 64,
    "icon": 20,
    "icon-lg": 24,
    "input": 52,
    "list-row": 64,
    "artwork": 64,
    "sheet-handle-width": 48
  },
  "layout": {
    "gutter": 16,
    "sheet-handle": 4,
    "sheet-peek": 280,
    "max-content": 480,
    "breakpoints": {
      "phone": 0,
      "tablet": 768
    },
    "header": 48
  },
  "motion": {
    "fast": 100,
    "base": 200,
    "slow": 300,
    "ease": "cubic-bezier(0.22, 1, 0.36, 1)",
    "offer-in": 250
  },
  "letter": {
    "mono": 0.6
  }
} as const

export type ColorRole = keyof typeof tokens.color
