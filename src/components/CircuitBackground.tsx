/**
 * A restrained, static workspace backdrop. The sparse orthogonal paths evoke
 * PCB routing without competing with the dense catalog UI, while the grid and
 * light fields give the page depth in otherwise-empty gutters.
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
        viewBox="0 0 1600 1000"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <defs>
          <linearGradient id="trace-left" x1="0" y1="0" x2="310" y2="0">
            <stop stopColor="#67e8f9" stopOpacity="0" />
            <stop offset="0.28" stopColor="#67e8f9" stopOpacity="0.28" />
            <stop offset="1" stopColor="#8fb5cf" stopOpacity="0.04" />
          </linearGradient>
          <linearGradient id="trace-right" x1="1600" y1="0" x2="1290" y2="0">
            <stop stopColor="#67e8f9" stopOpacity="0" />
            <stop offset="0.28" stopColor="#67e8f9" stopOpacity="0.24" />
            <stop offset="1" stopColor="#8fb5cf" stopOpacity="0.03" />
          </linearGradient>
          <radialGradient id="via-fill">
            <stop stopColor="#b8f3fb" stopOpacity="0.18" />
            <stop offset="1" stopColor="#67e8f9" stopOpacity="0.02" />
          </radialGradient>
        </defs>

        <g stroke="url(#trace-left)" strokeWidth="1">
          <path d="M0 152H104L126 174H246L272 200V318" />
          <path d="M0 432H82L110 404H212L238 378V294" />
          <path d="M0 716H128L158 686H264V596" />
          <path d="M48 1000V876L76 848H188L220 816H294" />
          <path d="M0 564H64L92 592H174" strokeDasharray="2 7" />
        </g>

        <g stroke="url(#trace-right)" strokeWidth="1">
          <path d="M1600 118H1510L1484 144H1370L1338 176V276" />
          <path d="M1600 352H1532L1504 380H1414L1386 408V516" />
          <path d="M1600 646H1500L1470 616H1376L1348 588V494" />
          <path d="M1554 1000V884L1526 856H1420L1390 826H1304" />
          <path d="M1600 760H1534L1506 788H1432" strokeDasharray="2 7" />
        </g>

        <g stroke="#8de9f4" strokeOpacity="0.24" strokeWidth="1">
          {[
            [126, 174],
            [238, 378],
            [158, 686],
            [220, 816],
            [1484, 144],
            [1386, 408],
            [1470, 616],
            [1390, 826],
          ].map(([cx, cy]) => (
            <g key={`${cx}-${cy}`}>
              <circle cx={cx} cy={cy} r="7" fill="url(#via-fill)" />
              <circle cx={cx} cy={cy} r="3" />
            </g>
          ))}
        </g>

        <g stroke="#9eb4c5" strokeOpacity="0.1" strokeWidth="1">
          <path d="M24 76H76M50 50V102" />
          <circle cx="50" cy="76" r="18" />
          <path d="M1524 924H1576M1550 898V950" />
          <circle cx="1550" cy="924" r="18" />
        </g>
      </svg>

      <div className="pinhub-background-light absolute inset-0" />
      <div className="pinhub-background-vignette absolute inset-0" />
    </div>
  );
}
