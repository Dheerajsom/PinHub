/**
 * Static graphite instrument plates with restrained PCB routing. The hardware
 * detail is intentionally confined to the desktop gutters so catalog content
 * stays dominant and mobile keeps a calm, low-cost background.
 */
export function CircuitBackground() {
  const vias = [
    [112, 184],
    [238, 314],
    [92, 486],
    [224, 642],
    [128, 798],
    [1488, 164],
    [1362, 332],
    [1506, 492],
    [1378, 674],
    [1480, 824],
  ] as const;

  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden="true"
    >
      <div className="pinhub-background-base absolute inset-0" />
      <div className="pinhub-background-grain absolute inset-0" />
      <div className="pinhub-background-grid absolute inset-0" />

      <svg
        className="pinhub-trace-map absolute inset-0 h-full w-full"
        viewBox="0 0 1600 1000"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <defs>
          <linearGradient id="plate-fill" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#17212a" stopOpacity="0.62" />
            <stop offset="0.5" stopColor="#0c1218" stopOpacity="0.38" />
            <stop offset="1" stopColor="#131c24" stopOpacity="0.56" />
          </linearGradient>
          <linearGradient id="trace-left" x1="18" y1="0" x2="304" y2="0">
            <stop stopColor="#6e94a7" stopOpacity="0.16" />
            <stop offset="0.36" stopColor="#65d8e7" stopOpacity="0.52" />
            <stop offset="1" stopColor="#65d8e7" stopOpacity="0.14" />
          </linearGradient>
          <linearGradient id="trace-right" x1="1582" y1="0" x2="1296" y2="0">
            <stop stopColor="#6e94a7" stopOpacity="0.16" />
            <stop offset="0.36" stopColor="#65d8e7" stopOpacity="0.52" />
            <stop offset="1" stopColor="#65d8e7" stopOpacity="0.14" />
          </linearGradient>
          <radialGradient id="via-fill">
            <stop stopColor="#a8f1f7" stopOpacity="0.34" />
            <stop offset="0.5" stopColor="#43bfcd" stopOpacity="0.12" />
            <stop offset="1" stopColor="#43bfcd" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Dark equipment plates give the graphite workbench a physical edge. */}
        <g className="pinhub-bench-plates">
          <rect x="20" y="72" width="278" height="850" rx="18" fill="url(#plate-fill)" stroke="#9bb4c4" strokeOpacity="0.16" />
          <rect x="1302" y="72" width="278" height="850" rx="18" fill="url(#plate-fill)" stroke="#9bb4c4" strokeOpacity="0.16" />
          <path d="M20 230H298M20 744H298M1302 230H1580M1302 744H1580" stroke="#94abba" strokeOpacity="0.1" />
          <path d="M38 214H128M1472 214H1562M38 760H104M1496 760H1562" stroke="#8ee8f1" strokeOpacity="0.22" strokeWidth="2" />
        </g>

        {/* Orthogonal signal routes and edge pads, kept outside the content. */}
        <g stroke="url(#trace-left)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 142H112V184H214L238 208V314H286" />
          <path d="M20 362H92V486H174L198 462H284" />
          <path d="M20 548H122L146 524H224V642H286" />
          <path d="M20 832H128V798H214L244 768H286" />
          <path d="M62 230V276L82 296H174" strokeDasharray="3 8" />
          <path d="M54 744V700L78 676H156" strokeDasharray="3 8" />
        </g>
        <g stroke="url(#trace-right)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1580 128H1488V164H1406L1380 190V288H1314" />
          <path d="M1580 374H1506V492H1424L1398 466H1314" />
          <path d="M1580 552H1488L1462 526H1378V674H1314" />
          <path d="M1580 850H1480V824H1400L1368 792H1314" />
          <path d="M1538 230V278L1516 300H1422" strokeDasharray="3 8" />
          <path d="M1546 744V704L1520 678H1438" strokeDasharray="3 8" />
        </g>

        <g fill="#6ed8e3" fillOpacity="0.28">
          {[138, 158, 178, 198].map((y) => <rect key={`lp-${y}`} x="20" y={y} width="9" height="8" rx="1" />)}
          {[124, 144, 164, 184].map((y) => <rect key={`rp-${y}`} x="1571" y={y} width="9" height="8" rx="1" />)}
        </g>

        <g stroke="#86e5ef" strokeOpacity="0.5" strokeWidth="1.2">
          {vias.map(([cx, cy]) => (
            <g key={`${cx}-${cy}`}>
              <circle cx={cx} cy={cy} r="13" fill="url(#via-fill)" stroke="none" />
              <circle cx={cx} cy={cy} r="6" />
              <circle cx={cx} cy={cy} r="2" fill="#9ceef5" fillOpacity="0.44" />
            </g>
          ))}
        </g>

        {/* Registration marks and tiny plate labels finish the bench-tool feel. */}
        <g stroke="#9fb4c2" strokeOpacity="0.22" strokeWidth="1">
          <path d="M48 104H88M68 84V124M1512 104H1552M1532 84V124" />
          <circle cx="68" cy="104" r="13" />
          <circle cx="1532" cy="104" r="13" />
        </g>
        <g fill="#a8bdca" fillOpacity="0.28" fontFamily="var(--font-mono)" fontSize="9" letterSpacing="1.6">
          <text x="42" y="902">SIGNAL PLATE / A</text>
          <text x="1430" y="902">SIGNAL PLATE / B</text>
        </g>
      </svg>

      <div className="pinhub-background-light absolute inset-0" />
      <div className="pinhub-background-vignette absolute inset-0" />
    </div>
  );
}
