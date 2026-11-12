const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': 2,
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
  'aria-hidden': true,
} as const

export const MenuIcon = () => (
  <svg {...base}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
)
export const ChartIcon = () => (
  <svg {...base}>
    <path d="M5 20V10M12 20V4M19 20v-7" />
  </svg>
)
export const BackIcon = () => (
  <svg {...base}>
    <path d="M15 6l-6 6 6 6" />
  </svg>
)
export const ImageIcon = () => (
  <svg {...base}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <circle cx="9" cy="11" r="1.5" />
    <path d="M21 16l-5-5-8 8" />
  </svg>
)
export const ForwardIcon = () => (
  <svg {...base}>
    <path d="M9 6l6 6-6 6" />
  </svg>
)
