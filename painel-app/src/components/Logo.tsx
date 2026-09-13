/** Logotipo Precifica+ em SVG (mesmo traço do mockup estático). */
export function LogoMark({ stroke = "#059669" }: { stroke?: string }) {
  return (
    <svg viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M 120 230 L 100 230 A 30 30 0 0 1 70 200 L 70 100 A 30 30 0 0 1 100 70 L 140 70 A 55 55 0 0 1 195 125 A 55 55 0 0 1 140 180 L 100 180 A 20 20 0 0 0 80 200"
        stroke={stroke}
        strokeWidth="42"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 235 60 L 235 110 M 210 85 L 260 85"
        stroke={stroke}
        strokeWidth="22"
        strokeLinecap="round"
      />
    </svg>
  );
}
