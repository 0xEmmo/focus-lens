const paths = {
  close: <path d="M6 6l12 12M18 6L6 18" />,
  chevron: <path d="M7 10l5 5 5-5" />,
  copy: (
    <g>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
      <path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" />
    </g>
  ),
  download: <path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 19.5h14" />,
  target: (
    <g>
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="12" cy="12" r="2.5" />
    </g>
  ),
  wrench: <path d="M14.5 5.5a4 4 0 0 0 4.9 5L20 11l-9 9a2.1 2.1 0 0 1-3-3l9-9 .5.6a4 4 0 0 0-3-3.1z" />,
  refresh: <path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  undo: <path d="M9 7L4.5 11.5 9 16M5 11.5h9.5a5 5 0 0 1 0 10H12" />,
} as const

export type IconName = keyof typeof paths

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.1}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  )
}

/** The lens: a black tile, a yellow loupe, a dash for the tab path. */
export function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect width="24" height="24" rx="6" fill="#161616" />
      <circle cx="11" cy="11" r="5" fill="none" stroke="#ffd400" strokeWidth="2.2" />
      <path d="M15 15l4 4M8.6 11h4.8" stroke="#ffd400" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}
