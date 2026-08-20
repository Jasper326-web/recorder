import type { ReactNode } from 'react'

export type IconName =
  | 'bot'
  | 'calendar'
  | 'camera'
  | 'check'
  | 'chevron-left'
  | 'chevron-right'
  | 'download'
  | 'file'
  | 'flame'
  | 'heart'
  | 'home'
  | 'list'
  | 'mic'
  | 'music'
  | 'play'
  | 'plus'
  | 'search'
  | 'settings'
  | 'sparkles'
  | 'square'
  | 'target'
  | 'trash'
  | 'upload'
  | 'video'

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 2,
  }
  const paths: Record<IconName, ReactNode> = {
    bot: (
      <>
        <rect x="5" y="8" width="14" height="10" rx="3" />
        <path d="M12 4v4M8.5 13h.01M15.5 13h.01M9 18v2h6v-2" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M8 3v4M16 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
      </>
    ),
    camera: (
      <>
        <path d="M4 8h3l1.6-2h6.8L17 8h3v11H4z" />
        <circle cx="12" cy="13.5" r="3.2" />
      </>
    ),
    check: <path d="M5 12.5l4 4L19 6.5" />,
    'chevron-left': <path d="M15 18l-6-6 6-6" />,
    'chevron-right': <path d="M9 6l6 6-6 6" />,
    download: <path d="M12 4v10m0 0l-4-4m4 4l4-4M5 20h14" />,
    file: (
      <>
        <path d="M6 3h8l4 4v14H6z" />
        <path d="M14 3v5h5M9 13h6M9 17h6" />
      </>
    ),
    flame: <path d="M12 2s4 4 4 8a4 4 0 0 1-8 0c0-1.5.5-2.5 1-3 0 2 1 3 2 3s2-1 2-3c0-2-1-3-1-5 0 0-3 2-3 5a6 6 0 0 0 12 0c0-5-4-8-7-10z" />,
    heart: <path d="M4 10a4 4 0 0 1 7-2.6A4 4 0 0 1 18 10c0 2.1-1.5 3.6-3 5l-4 4-4-4c-1.5-1.4-3-2.9-3-5ZM6 13h3l1-2 2 5 2-7 1 4h3" />,
    home: <path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z" />,
    list: <path d="M4 6h16M7 12h13M10 18h10" />,
    mic: (
      <>
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
      </>
    ),
    music: <path d="M9 18V6l10-2v12M9 10l10-2M6 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM16 20a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />,
    play: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M10 8l6 4-6 4z" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    search: (
      <>
        <circle cx="11" cy="11" r="6" />
        <path d="M16 16l4 4" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.4 1a7 7 0 0 0-1.8-1L14.4 3h-4.8L9.3 6a7 7 0 0 0-1.8 1L5.1 6l-2 3.5 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.5 2.4-1a7 7 0 0 0 1.8 1l.3 3h4.8l.3-3a7 7 0 0 0 1.8-1l2.4 1 2-3.5-2-1.5c.1-.3.1-.7.1-1Z" />
      </>
    ),
    sparkles: <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5zM5 15l.8 2.2L8 18l-2.2.8L5 21l-.8-2.2L2 18l2.2-.8zM19 14l.7 1.8 1.8.7-1.8.7L19 19l-.7-1.8-1.8-.7 1.8-.7z" />,
    square: <rect x="7" y="7" width="10" height="10" rx="1" />,
    target: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1.5" />
      </>
    ),
    trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3" />,
    upload: <path d="M12 20V10m0 0l-4 4m4-4l4 4M5 4h14" />,
    video: (
      <>
        <rect x="3" y="5" width="13" height="14" rx="2" />
        <path d="M16 10l5-3v10l-5-3z" />
      </>
    ),
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={common}
    >
      {paths[name]}
    </svg>
  )
}
