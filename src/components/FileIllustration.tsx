export default function FileIllustration() {
  return (
    <svg
      className="file-illustration"
      viewBox="0 0 500 390"
      fill="none"
      role="img"
      aria-label="A smiling PDF and a little image file, safe on your device"
    >
      <defs>
        <pattern
          id="folio-dots"
          width="16"
          height="16"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="2" cy="2" r="1" fill="#444" />
        </pattern>
      </defs>
      <circle cx="258" cy="193" r="169" fill="url(#folio-dots)" />
      <ellipse
        cx="263"
        cy="345"
        rx="155"
        ry="12"
        stroke="#393939"
        strokeDasharray="4 7"
      />
      <g className="paper-friend" transform="rotate(-12 235 190)">
        <path
          d="M143 62h128l57 59v168a20 20 0 0 1-20 20H143a20 20 0 0 1-20-20V82a20 20 0 0 1 20-20Z"
          fill="#efefeb"
          stroke="#000"
          strokeWidth="5"
        />
        <path
          d="M267 62v46a16 16 0 0 0 16 16h45"
          stroke="#000"
          strokeWidth="5"
        />
        <rect x="145" y="85" width="61" height="26" rx="13" fill="#000" />
        <text x="159" y="103" fill="white" fontSize="14" fontFamily="monospace">
          .PDF
        </text>
        <ellipse cx="188" cy="170" rx="9" ry="15" fill="#000" />
        <ellipse cx="259" cy="170" rx="9" ry="15" fill="#000" />
        <path
          d="M202 197q22 26 43 0"
          stroke="#000"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M152 247h116m-116 19h78"
          stroke="#a5a5a2"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path
          d="m162 309-8 30-23 3m140-33 13 26 23-2"
          stroke="white"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </g>
      <g transform="rotate(12 360 270)">
        <rect
          x="296"
          y="210"
          width="131"
          height="109"
          rx="18"
          fill="#1c1c1c"
          stroke="#f5f5f5"
          strokeWidth="3"
        />
        <rect
          x="311"
          y="225"
          width="101"
          height="66"
          rx="7"
          stroke="white"
          strokeWidth="2"
        />
        <circle cx="386" cy="243" r="8" fill="white" />
        <path
          d="m312 280 27-29 25 25 14-14 33 28"
          stroke="white"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M345 303h29"
          stroke="#aaa"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>
      <path d="m76 141 6-18 6 18 18 6-18 6-6 18-6-18-18-6Z" fill="white" />
      <path d="m398 96 4-12 4 12 12 4-12 4-4 12-4-12-12-4Z" fill="white" />
      <path
        d="M373 156q48-4 55 30m-14-4 14 6 2-17"
        stroke="#888"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <g transform="rotate(7 372 65)">
        <rect
          x="312"
          y="44"
          width="134"
          height="33"
          rx="16"
          fill="#000"
          stroke="#777"
        />
        <text x="327" y="65" fill="#ddd" fontSize="11" fontFamily="monospace">
          NO CLOUD NEEDED
        </text>
      </g>
    </svg>
  );
}
