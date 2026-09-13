import type { SVGProps } from 'react'

/** Shared stroke-icon wrapper: 24×24 grid, inherits the current text colour. */
function Icon({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

export const IconClose = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="m6 6 12 12M18 6 6 18" /></Icon>
)
export const IconSearch = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.6-3.6" /></Icon>
)
export const IconPlus = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>
)
export const IconCheck = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="m5 12.5 4.5 4.5L19 7" /></Icon>
)
export const IconHome = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19v-8.5Z" /><path d="M9.5 20.5v-6h5v6" /></Icon>
)
export const IconList = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M9 6h11M9 12h11M9 18h11" /><path d="m3.5 5.8 1.2 1.2 2-2.2M3.5 11.8l1.2 1.2 2-2.2M3.5 17.8l1.2 1.2 2-2.2" /></Icon>
)
export const IconTag = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M3.5 11.2V5a1.5 1.5 0 0 1 1.5-1.5h6.2a2 2 0 0 1 1.4.6l7.3 7.3a2 2 0 0 1 0 2.8l-5.8 5.8a2 2 0 0 1-2.8 0L4.1 12.6a2 2 0 0 1-.6-1.4Z" /><circle cx="8" cy="8" r="1.6" /></Icon>
)
export const IconWallet = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h11.5A1.5 1.5 0 0 1 19 6.5V9" /><path d="M3.5 7.5v9A2.5 2.5 0 0 0 6 19h12.5a1.5 1.5 0 0 0 1.5-1.5v-6A1.5 1.5 0 0 0 18.5 10H6a2.5 2.5 0 0 1-2.5-2.5Z" /><circle cx="16.5" cy="14.5" r="1.1" fill="currentColor" stroke="none" /></Icon>
)
export const IconSettings = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><circle cx="12" cy="12" r="3.2" /><path d="M19.4 14.5a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5v.2a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H2a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H8a1.6 1.6 0 0 0 1-1.5V2a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V8a1.6 1.6 0 0 0 1.5 1h.2a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" /></Icon>
)
export const IconEdit = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M4 20h4l10.5-10.5a2.8 2.8 0 0 0-4-4L4 16v4Z" /><path d="m14.5 5.5 4 4" /></Icon>
)
export const IconTrash = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M4 7h16M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7" /><path d="M6.5 7 7.6 19a1.8 1.8 0 0 0 1.8 1.6h5.2a1.8 1.8 0 0 0 1.8-1.6L17.5 7" /><path d="M10.5 11v5.5M13.5 11v5.5" /></Icon>
)
export const IconExternal = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M14 4h6v6" /><path d="m20 4-8.5 8.5" /><path d="M18 14.5V19a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 19V8a1.5 1.5 0 0 1 1.5-1.5H10" /></Icon>
)
export const IconChevronRight = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="m9 5 7 7-7 7" /></Icon>
)
export const IconChevronDown = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="m5 9 7 7 7-7" /></Icon>
)
export const IconArrowLeft = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M19 12H5M11 6l-6 6 6 6" /></Icon>
)
export const IconUpload = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M12 16V4M8 8l4-4 4 4" /><path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15" /></Icon>
)
export const IconDownload = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M12 4v12M8 12l4 4 4-4" /><path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15" /></Icon>
)
export const IconImage = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><rect x="3.5" y="5" width="17" height="14" rx="2.5" /><circle cx="9" cy="10" r="1.6" /><path d="m4.5 17 4.6-4.6a1.6 1.6 0 0 1 2.2 0l3 3 1.6-1.5a1.6 1.6 0 0 1 2.2 0l2 1.9" /></Icon>
)
export const IconCart = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M3 4h2.2l2 11.2A2 2 0 0 0 9.2 17h8a2 2 0 0 0 2-1.6L21 8H6" /><circle cx="10" cy="20" r="1.3" /><circle cx="18" cy="20" r="1.3" /></Icon>
)
export const IconStore = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M4 10v9a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19v-9" /><path d="M3 6.5 4.4 4A1.5 1.5 0 0 1 5.7 3h12.6a1.5 1.5 0 0 1 1.3.8L21 6.5a2.8 2.8 0 0 1-4.5 2.2 2.8 2.8 0 0 1-4.5 0 2.8 2.8 0 0 1-4.5 0A2.8 2.8 0 0 1 3 6.5Z" /></Icon>
)
export const IconTrendDown = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="m4 7 6 6 3.5-3.5L20 16" /><path d="M20 11.5V16h-4.5" /></Icon>
)
export const IconTrendUp = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="m4 17 6-6 3.5 3.5L20 8" /><path d="M20 12.5V8h-4.5" /></Icon>
)
export const IconInfo = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5.5" /><circle cx="12" cy="7.8" r="1" fill="currentColor" stroke="none" /></Icon>
)
export const IconAlert = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M10.6 4.2 2.9 17.4A1.6 1.6 0 0 0 4.3 20h15.4a1.6 1.6 0 0 0 1.4-2.6L13.4 4.2a1.6 1.6 0 0 0-2.8 0Z" /><path d="M12 9.5v4" /><circle cx="12" cy="16.6" r="1" fill="currentColor" stroke="none" /></Icon>
)
export const IconSun = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M21.5 12h-2M4.5 12h-2M18.4 5.6 17 7M7 17l-1.4 1.4M18.4 18.4 17 17M7 7 5.6 5.6" /></Icon>
)
export const IconMoon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M20 13.5A8.2 8.2 0 0 1 10.5 4a8.2 8.2 0 1 0 9.5 9.5Z" /></Icon>
)
export const IconSort = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M7 4v16M7 20l-3-3M7 20l3-3" /><path d="M14 7h6M14 12h5M14 17h3" /></Icon>
)
export const IconFilter = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M4 6h16M7 12h10M10 18h4" /></Icon>
)
export const IconRefresh = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M20 11a8 8 0 1 0-.6 4" /><path d="M20 4.5V11h-6.5" /></Icon>
)
export const IconSparkle = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M12 3.5 13.8 9 19.5 10.8 13.8 12.6 12 18.2 10.2 12.6 4.5 10.8 10.2 9 12 3.5Z" /><path d="M18.5 16.5 19.3 18.8 21.5 19.5 19.3 20.3 18.5 22.5 17.7 20.3 15.5 19.5 17.7 18.8Z" /></Icon>
)
export const IconClipboard = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M9 4.5h6M9 4.5A1.5 1.5 0 0 0 7.5 6v.5h9V6A1.5 1.5 0 0 0 15 4.5" /><path d="M7.5 6H6a1.5 1.5 0 0 0-1.5 1.5v11A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5v-11A1.5 1.5 0 0 0 18 6h-1.5" /><path d="M8.5 12h7M8.5 16h4" /></Icon>
)
