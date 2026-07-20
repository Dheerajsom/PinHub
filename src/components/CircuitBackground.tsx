/**
 * A dark electronics workbench built around two recognizable reference boards.
 * The detailed artwork lives in the wide desktop gutters, leaving the catalog
 * itself calm and readable. Motion is decorative and disabled for reduced
 * motion users and narrow screens.
 */
export function CircuitBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden="true"
    >
      <div className="pinhub-background-base absolute inset-0" />
      <div className="pinhub-background-grid absolute inset-0" />

      <svg
        className="pinhub-trace-map absolute inset-0 h-full w-full"
        viewBox="0 0 1800 1000"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <defs>
          <linearGradient id="bench-trace" x1="0" y1="0" x2="1" y2="0">
            <stop stopColor="#67e8f9" stopOpacity="0" />
            <stop offset="0.45" stopColor="#67e8f9" stopOpacity="0.38" />
            <stop offset="1" stopColor="#67e8f9" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="pi-board" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#184f45" />
            <stop offset="0.52" stopColor="#0d332f" />
            <stop offset="1" stopColor="#092622" />
          </linearGradient>
          <linearGradient id="uno-board" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#087b8c" />
            <stop offset="0.55" stopColor="#075365" />
            <stop offset="1" stopColor="#053844" />
          </linearGradient>
          <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#d6e2e8" stopOpacity="0.7" />
            <stop offset="0.5" stopColor="#596c78" stopOpacity="0.55" />
            <stop offset="1" stopColor="#263540" stopOpacity="0.8" />
          </linearGradient>
          <radialGradient id="bench-glow">
            <stop stopColor="#67e8f9" stopOpacity="0.18" />
            <stop offset="1" stopColor="#67e8f9" stopOpacity="0" />
          </radialGradient>
          <filter id="board-shadow" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="18" stdDeviation="18" floodColor="#000" floodOpacity="0.7" />
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#56d7df" floodOpacity="0.14" />
          </filter>
          <filter id="led-glow" x="-300%" y="-300%" width="700%" height="700%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <pattern id="fine-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M20 0H0V20" stroke="#8faab8" strokeOpacity="0.06" strokeWidth="1" />
          </pattern>
        </defs>

        <rect width="1800" height="1000" fill="url(#fine-grid)" />
        <ellipse cx="190" cy="390" rx="340" ry="420" fill="url(#bench-glow)" />
        <ellipse cx="1610" cy="610" rx="340" ry="420" fill="url(#bench-glow)" />

        {/* Routed copper paths connect the two feature boards to the workbench. */}
        <g className="pinhub-signal-traces" stroke="url(#bench-trace)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path pathLength="1" d="M0 154H92L126 188H244L270 214H346" />
          <path pathLength="1" d="M0 688H108L142 654H270L300 624H352" />
          <path pathLength="1" d="M1800 252H1716L1682 286H1578L1548 316H1454" />
          <path pathLength="1" d="M1800 820H1698L1660 782H1544L1514 752H1450" />
        </g>
        <g fill="#8cecf2" fillOpacity="0.5">
          {[[92, 154], [142, 654], [1716, 252], [1660, 782]].map(([cx, cy]) => (
            <g key={`${cx}-${cy}`}>
              <circle cx={cx} cy={cy} r="10" fill="#67e8f9" fillOpacity="0.05" />
              <circle cx={cx} cy={cy} r="3.5" />
            </g>
          ))}
        </g>

        {/* Raspberry Pi 5 — recognizable I/O edge, 40-pin header and RP1/BCM2712 package. */}
        <g className="pinhub-board pinhub-board-pi" transform="translate(54 250) rotate(-7 185 280)" filter="url(#board-shadow)">
          <path d="M28 12H342a28 28 0 0 1 28 28v482a28 28 0 0 1-28 28H28A28 28 0 0 1 0 522V40A28 28 0 0 1 28 12Z" fill="url(#pi-board)" stroke="#7ce5d2" strokeOpacity="0.38" strokeWidth="2" />
          <g fill="#081a18" stroke="#8be7d8" strokeOpacity="0.35" strokeWidth="2">
            <circle cx="26" cy="38" r="10" /><circle cx="344" cy="38" r="10" />
            <circle cx="26" cy="524" r="10" /><circle cx="344" cy="524" r="10" />
          </g>

          {/* Four USB/Ethernet cans along the outside edge. */}
          <g fill="url(#metal)" stroke="#b6c8d1" strokeOpacity="0.45">
            <path d="M310 78h82v78h-82z" /><path d="M310 170h82v78h-82z" />
            <path d="M304 278h94v102h-94z" /><path d="M304 402h94v98h-94z" />
          </g>
          <g stroke="#d6e4e8" strokeOpacity="0.35" strokeWidth="3">
            <path d="M326 99h50M326 121h50M326 191h50M326 213h50" />
            <path d="M326 304h50v28h-50zM326 426h50v28h-50z" />
          </g>

          {/* Dual micro-HDMI, USB-C and camera/display ribbon connectors. */}
          <g fill="#27343b" stroke="#b9cbd2" strokeOpacity="0.38">
            <path d="M28-3h60v31H28z" /><path d="M103-3h60v31h-60z" />
            <rect x="184" y="-6" width="66" height="35" rx="8" />
            <rect x="42" y="477" width="80" height="22" rx="2" fill="#d6bd6c" />
            <rect x="154" y="477" width="80" height="22" rx="2" fill="#d6bd6c" />
          </g>

          {/* 40-pin GPIO header. */}
          <g transform="translate(38 58)">
            <rect x="-9" y="-9" width="244" height="38" rx="4" fill="#171a1b" stroke="#e0c255" strokeOpacity="0.45" />
            {Array.from({ length: 20 }, (_, index) => (
              <g key={index} transform={`translate(${index * 12} 0)`}>
                <rect width="7" height="7" rx="1" fill="#d4ae45" />
                <rect y="13" width="7" height="7" rx="1" fill="#d4ae45" />
              </g>
            ))}
          </g>

          {/* Main silicon and supporting components. */}
          <g>
            <rect x="66" y="176" width="128" height="128" rx="6" fill="#26323a" stroke="#a8bec8" strokeOpacity="0.44" />
            <rect x="77" y="187" width="106" height="106" rx="3" fill="#161d22" stroke="#71858f" strokeOpacity="0.4" />
            <text x="130" y="231" textAnchor="middle" fill="#b8c9cf" fillOpacity="0.68" fontFamily="var(--font-mono)" fontSize="11" letterSpacing="1.2">BROADCOM</text>
            <text x="130" y="250" textAnchor="middle" fill="#d6e3e6" fillOpacity="0.8" fontFamily="var(--font-mono)" fontSize="14" fontWeight="700">BCM2712</text>
            <text x="130" y="270" textAnchor="middle" fill="#8ca0a8" fillOpacity="0.62" fontFamily="var(--font-mono)" fontSize="9">2.4 GHz · 4 CORE</text>
            <rect x="213" y="204" width="70" height="70" rx="4" fill="#1b252b" stroke="#95aab3" strokeOpacity="0.38" />
            <text x="248" y="237" textAnchor="middle" fill="#cbd9dd" fillOpacity="0.72" fontFamily="var(--font-mono)" fontSize="12" fontWeight="700">RP1</text>
            <text x="248" y="253" textAnchor="middle" fill="#879aa2" fillOpacity="0.6" fontFamily="var(--font-mono)" fontSize="7">I/O CONTROLLER</text>
          </g>
          <g fill="#b8c8cc" fillOpacity="0.48">
            {[[54,342],[82,342],[110,342],[138,342],[166,342],[204,326],[230,326],[256,326],[54,382],[90,382],[126,382],[162,382],[218,374],[250,374]].map(([x,y]) => <rect key={`${x}-${y}`} x={x} y={y} width="16" height="8" rx="1" />)}
          </g>
          <g stroke="#72d8cc" strokeOpacity="0.28" strokeWidth="1">
            <path d="M130 304v28H62v10M174 304v50h44v20M213 239h-19M283 239h20M130 176v-62" />
          </g>
          <circle cx="279" cy="105" r="4" fill="#67e8a3" filter="url(#led-glow)" />
          <text x="42" y="448" fill="#d6f3ed" fillOpacity="0.8" fontFamily="var(--font-sans)" fontSize="21" fontWeight="700">Raspberry Pi 5</text>
          <text x="43" y="465" fill="#8fd5c8" fillOpacity="0.62" fontFamily="var(--font-mono)" fontSize="9" letterSpacing="1.4">8GB · REV 1.0 · 3V3 GPIO</text>
        </g>

        {/* Arduino Uno R3 — teal board, DIP ATmega328P and familiar shield headers. */}
        <g className="pinhub-board pinhub-board-uno" transform="translate(1450 320) rotate(8 170 235)" filter="url(#board-shadow)">
          <path d="M22 12H306l38 38v362l-28 28H22A22 22 0 0 1 0 418V34A22 22 0 0 1 22 12Z" fill="url(#uno-board)" stroke="#67dcec" strokeOpacity="0.5" strokeWidth="2" />
          <g fill="#052b34" stroke="#7ce6ef" strokeOpacity="0.42" strokeWidth="2">
            <circle cx="24" cy="38" r="9" /><circle cx="306" cy="58" r="9" />
            <circle cx="24" cy="414" r="9" /><circle cx="306" cy="414" r="9" />
          </g>
          <path d="M-18 70h76v94h-76z" fill="url(#metal)" stroke="#c9d9df" strokeOpacity="0.5" />
          <path d="M0 91h39v52H0z" fill="#273942" stroke="#d6e2e5" strokeOpacity="0.36" />
          <rect x="-10" y="295" width="60" height="70" rx="7" fill="#171d20" stroke="#9aaeb5" strokeOpacity="0.5" />
          <circle cx="20" cy="330" r="16" fill="#0a0d0f" stroke="#53666f" strokeWidth="4" />

          {/* Female shield headers. */}
          <g fill="#121718" stroke="#9bdde4" strokeOpacity="0.32">
            <rect x="73" y="35" width="223" height="30" rx="3" />
            <rect x="73" y="382" width="223" height="30" rx="3" />
          </g>
          <g fill="#6f7d80">
            {Array.from({ length: 14 }, (_, index) => <rect key={`top-${index}`} x={82 + index * 15} y="45" width="7" height="10" rx="1" />)}
            {Array.from({ length: 14 }, (_, index) => <rect key={`bottom-${index}`} x={82 + index * 15} y="392" width="7" height="10" rx="1" />)}
          </g>

          {/* ATmega328P in DIP package. */}
          <rect x="118" y="178" width="164" height="72" rx="8" fill="#15191b" stroke="#95a7ad" strokeOpacity="0.4" />
          <circle cx="137" cy="214" r="8" fill="#090b0c" stroke="#65747a" strokeOpacity="0.5" />
          <text x="210" y="205" textAnchor="middle" fill="#d0dde0" fillOpacity="0.8" fontFamily="var(--font-mono)" fontSize="11" fontWeight="700">ATMEGA328P-PU</text>
          <text x="210" y="225" textAnchor="middle" fill="#8fa2a7" fillOpacity="0.65" fontFamily="var(--font-mono)" fontSize="8">20MHz · AVR · 5V LOGIC</text>
          <g fill="#c7d1d1" fillOpacity="0.58">
            {Array.from({ length: 8 }, (_, index) => <rect key={`dip-t-${index}`} x={132 + index * 18} y="169" width="8" height="9" />)}
            {Array.from({ length: 8 }, (_, index) => <rect key={`dip-b-${index}`} x={132 + index * 18} y="250" width="8" height="9" />)}
          </g>
          <rect x="70" y="112" width="60" height="60" rx="4" fill="#26343a" stroke="#a9bdc4" strokeOpacity="0.42" />
          <text x="100" y="139" textAnchor="middle" fill="#d4e0e2" fillOpacity="0.72" fontFamily="var(--font-mono)" fontSize="8">ATMEGA16U2</text>
          <text x="100" y="153" textAnchor="middle" fill="#84979d" fillOpacity="0.64" fontFamily="var(--font-mono)" fontSize="7">USB BRIDGE</text>
          <g stroke="#69dbe7" strokeOpacity="0.24" strokeWidth="1.2">
            <path d="M58 118h12M130 142h26v27M200 169V66M282 214h28v80H52M102 250v46H52" />
          </g>
          <g fill="#d8c06b" fillOpacity="0.75">
            <circle cx="77" cy="292" r="5" /><circle cx="94" cy="292" r="5" /><circle cx="111" cy="292" r="5" />
          </g>
          <circle cx="286" cy="103" r="4" fill="#f5b942" filter="url(#led-glow)" />
          <circle cx="302" cy="103" r="4" fill="#62efb6" filter="url(#led-glow)" />
          <text x="74" y="335" fill="#d4f3f6" fillOpacity="0.88" fontFamily="var(--font-sans)" fontSize="23" fontWeight="700">ARDUINO</text>
          <text x="74" y="355" fill="#9ee1e8" fillOpacity="0.7" fontFamily="var(--font-mono)" fontSize="12" fontWeight="700" letterSpacing="1.4">UNO R3</text>
        </g>

        <g className="pinhub-bench-labels" fill="#b6c9d2" fillOpacity="0.28" fontFamily="var(--font-mono)" fontSize="9" letterSpacing="1.8">
          <text x="44" y="918">REFERENCE HARDWARE / COMPUTE</text>
          <text x="1460" y="918">REFERENCE HARDWARE / CONTROL</text>
        </g>
      </svg>

      <div className="pinhub-background-light absolute inset-0" />
      <div className="pinhub-background-vignette absolute inset-0" />
    </div>
  );
}
