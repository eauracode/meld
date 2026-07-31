import type { SVGProps } from "react";

/** Minimal consistent-stroke icon set for the marketing site. currentColor throughout. */
function Icon(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" {...props} />;
}

export const Icons = {
  warehouse: (p: SVGProps<SVGSVGElement>) => (
    <Icon {...p}>
      <path d="M3 10.5 12 4l9 6.5M5 9.5V20h14V9.5M9 20v-6h6v6" />
    </Icon>
  ),
  clipboard: (p: SVGProps<SVGSVGElement>) => (
    <Icon {...p}>
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M9 11h6M9 15h6" />
    </Icon>
  ),
  truck: (p: SVGProps<SVGSVGElement>) => (
    <Icon {...p}>
      <path d="M3 7h11v9H3z" />
      <path d="M14 10h4l3 3v3h-7z" />
      <circle cx="7.5" cy="18.5" r="1.5" />
      <circle cx="17.5" cy="18.5" r="1.5" />
    </Icon>
  ),
  card: (p: SVGProps<SVGSVGElement>) => (
    <Icon {...p}>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18M7 15h4" />
    </Icon>
  ),
  cash: (p: SVGProps<SVGSVGElement>) => (
    <Icon {...p}>
      <rect x="2.5" y="7" width="19" height="11" rx="2" />
      <circle cx="12" cy="12.5" r="2.5" />
      <path d="M6 9v0M18 16v0" />
    </Icon>
  ),
  scale: (p: SVGProps<SVGSVGElement>) => (
    <Icon {...p}>
      <path d="M12 3v18M7 7l-4 6a4 4 0 0 0 8 0zM17 7l-4 6a4 4 0 0 0 8 0zM6 3h12" />
    </Icon>
  ),
  bell: (p: SVGProps<SVGSVGElement>) => (
    <Icon {...p}>
      <path d="M6 10a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14 6 10Z" />
      <path d="M9.5 18a2.5 2.5 0 0 0 5 0" />
    </Icon>
  ),
  map: (p: SVGProps<SVGSVGElement>) => (
    <Icon {...p}>
      <circle cx="12" cy="10" r="3" />
      <path d="M12 21s7-6.5 7-11a7 7 0 1 0-14 0c0 4.5 7 11 7 11Z" />
    </Icon>
  ),
  bike: (p: SVGProps<SVGSVGElement>) => (
    <Icon {...p}>
      <circle cx="6" cy="17" r="3" />
      <circle cx="18" cy="17" r="3" />
      <path d="M6 17 10 9h5l3 5M10 9 8.5 6H6M13 9l2 5" />
    </Icon>
  ),
  clock: (p: SVGProps<SVGSVGElement>) => (
    <Icon {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </Icon>
  ),
  shield: (p: SVGProps<SVGSVGElement>) => (
    <Icon {...p}>
      <path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z" />
      <path d="M9 12l2 2 4-4" />
    </Icon>
  ),
} as const;
