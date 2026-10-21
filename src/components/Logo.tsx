export default function FolioLogo({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="5"
        y="7"
        width="26"
        height="29"
        rx="7"
        stroke="currentColor"
        strokeWidth="2.5"
        transform="rotate(-9 5 7)"
      />
      <path
        d="M16 4h13l7 8v18a6 6 0 0 1-6 6H16a6 6 0 0 1-6-6V10a6 6 0 0 1 6-6Z"
        fill="currentColor"
        stroke="#000"
        strokeWidth="2"
      />
      <path
        d="M27 4v9h9M17 25q6 6 12 0"
        stroke="#000"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="18" cy="20" r="1.5" fill="#000" />
      <circle cx="28" cy="20" r="1.5" fill="#000" />
    </svg>
  );
}
