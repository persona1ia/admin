import type { IconProps } from './icon.types'

const paths = {
  up: 'M6 15l6-6 6 6',
  down: 'M6 9l6 6 6-6',
  check: 'M5 12l4 4L19 6',
  plus: 'M12 5v14 M5 12h14',
  close: 'M6 6l12 12 M6 18L18 6',
  arrow: 'M4 12h16 M14 6l6 6-6 6',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  copy: 'M8 8h12v12H8z M16 8V4H4v12h4',
  layout: 'M3 4h18v16H3z M3 9h18 M9 9v11',
  settings: 'M4 7h16 M4 17h16 M8 4v6 M16 14v6',
  logout: 'M9 4H4v16h5 M10 12h11 M17 8l4 4-4 4',
  external: 'M14 3h7v7 M21 3L10 14 M10 3H3v18h18v-7',
  history: 'M3 10a9 9 0 1 1 1 7 M3 4v6h6 M12 7v5l3 2',
  orders: 'M5 3h14v19l-3-2-4 2-4-2-3 2z M9 8h6 M9 12h6',
  image: 'M3 3h18v18H3z M3 17l6-6 4 4 3-3 5 5 M16 7h.01',
  search: 'M16 16l5 5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  trash: 'M3 6h18 M9 6V3h6v3 M6 6l1 15h10l1-15 M10 10v7 M14 10v7',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  book: 'M4 4h6a3 3 0 0 1 3 3v14a4 4 0 0 0-4-2H4z M13 7a3 3 0 0 1 3-3h5v15h-5a3 3 0 0 0-3 2',
  hidden:
    'M3 3l18 18 M9 5a12 12 0 0 1 3 0c6 0 10 7 10 7a18 18 0 0 1-4 4 M6 6a22 22 0 0 0-4 6s4 7 10 7a12 12 0 0 0 5-1',
}

export function Icon({ name, size = 20 }: IconProps) {
  return (
    <svg
      fill="none"
      width={size}
      height={size}
      strokeWidth="1.6"
      aria-hidden="true"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name]} />
    </svg>
  )
}
