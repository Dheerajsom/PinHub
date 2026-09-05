import { memo, useId } from "react";
import type { BoardGeometry } from "@/lib/board-visual-geometry";
import { raspberryPiModel, type RaspberryPiModel } from "@/lib/raspberry-pi-models";

// Original vector artwork. These shapes describe visual identity, never nets.
// Contact positions and all electrical text are supplied by BoardStage.
export const RaspberryPiArtwork = memo(function RaspberryPiArtwork({ geometry, label }: {
  geometry: BoardGeometry;
  label?: string;
}) {
  const uid = `pi-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const model = raspberryPiModel(geometry.artworkId ?? "");
  if (!model) return null;
  const paint = (name: string) => `url(#${uid}-${name})`;
  const { body } = geometry;
  const pico = model.family === "pico";
  const keyboard = model.family === "keyboard";
  const width = pico ? 420 : 1000;
  const height = pico ? 1000 : model.family === "zero" ? 435 : keyboard ? 385 : 660;

  return (
    <g aria-hidden="true" data-pi-artwork={geometry.artworkId}>
      <defs>
        <linearGradient id={`${uid}-pcb`} x2="0.7" y2="1">
          <stop stopColor="#29844e" />
          <stop offset="0.45" stopColor="#176638" />
          <stop offset="1" stopColor="#0c432c" />
        </linearGradient>
        <linearGradient id={`${uid}-metal`} x2="0.25" y2="1">
          <stop stopColor="#edf0e9" /><stop offset="0.18" stopColor="#a8b2ae" />
          <stop offset="0.45" stopColor="#d9ded8" /><stop offset="1" stopColor="#727e7b" />
        </linearGradient>
        <linearGradient id={`${uid}-chip`} x2="0.3" y2="1">
          <stop stopColor="#3c4542" /><stop offset="0.14" stopColor="#222a28" /><stop offset="1" stopColor="#101816" />
        </linearGradient>
        <linearGradient id={`${uid}-gold`} x2="1" y2="1">
          <stop stopColor="#f0d77d" /><stop offset="0.5" stopColor="#c5a247" /><stop offset="1" stopColor="#7a612a" />
        </linearGradient>
        <linearGradient id={`${uid}-case`} x2="0" y2="1">
          <stop stopColor="#f3f1e9" /><stop offset="1" stopColor="#babeb7" />
        </linearGradient>
        <pattern id={`${uid}-grain`} width="7" height="7" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.45" fill="#d8eece" opacity="0.16" />
          <path d="M4 3h2" stroke="#061c10" strokeWidth="0.5" opacity="0.3" />
        </pattern>
        <pattern id={`${uid}-vias`} width="37" height="31" patternUnits="userSpaceOnUse">
          <circle cx="7" cy="9" r="1.8" fill="#476747" stroke="#c7b776" strokeWidth="0.8" />
          <circle cx="7" cy="9" r="0.65" fill="#133b25" />
        </pattern>
        <g id={`${uid}-resistor`}>
          <rect width="15" height="7" rx="1" fill="#cbd0c3" />
          <rect x="3" width="9" height="7" fill="#242d26" />
          <path d="M4 1h7" stroke="#667466" strokeWidth="0.7" />
        </g>
        <g id={`${uid}-capacitor`}>
          <rect width="11" height="7" rx="1" fill="#dce0ca" />
          <rect x="2" width="7" height="7" fill="#b29b70" />
          <path d="M3 1h5" stroke="#e6d5a4" strokeWidth="1" />
        </g>
      </defs>

      <rect x={body.x + 1} y={body.y + 7} width={body.w} height={body.h} rx={body.rx} fill="#020906" opacity="0.65" />
      <rect x={body.x} y={body.y} width={body.w} height={body.h} rx={body.rx} fill={paint(keyboard ? "case" : "pcb")} stroke={keyboard ? "#858e88" : "#89a761"} strokeWidth="2" />
      <rect x={body.x + 4} y={body.y + 4} width={body.w - 8} height={body.h - 8} rx={body.rx} fill="none" stroke={keyboard ? "#ffffff" : "#80b278"} strokeOpacity="0.4" />
      {!keyboard ? <rect x={body.x + 6} y={body.y + 6} width={body.w - 12} height={body.h - 12} rx={body.rx} fill={paint("grain")} /> : null}

      <g transform={`translate(${body.x} ${body.y}) scale(${body.w / width} ${body.h / height})`}>
        {keyboard ? <Keyboard model={model} paint={paint} /> : pico ? (
          <Pico model={model} uid={uid} paint={paint} />
        ) : model.family === "zero" ? (
          <Zero model={model} uid={uid} paint={paint} />
        ) : (
          <Sbc model={model} uid={uid} paint={paint} />
        )}
        {model.family === "zero" ? (
          <text x={355} y={height - 35} fill="#d7e7c4" fontSize={17} fontFamily="var(--font-technical), monospace" letterSpacing="0.5">
            {label?.replace("Raspberry Pi ", "")}
          </text>
        ) : null}
      </g>

      {geometry.holes.map((hole, i) => (
        <g key={i}>
          <circle cx={hole.x} cy={hole.y} r={hole.r + 9} fill={paint("gold")} stroke="#d4cd80" strokeWidth="1" />
          <circle cx={hole.x} cy={hole.y} r={hole.r + 2} fill="#183921" />
          <circle cx={hole.x} cy={hole.y} r={hole.r} fill="#080e10" stroke="#0b2213" strokeWidth="2" />
        </g>
      ))}
      {geometry.headerZones.map((zone, i) => (
        <g key={i}>
          <rect {...rectProps(zone)} fill={pico ? "#2c6944" : "#090e0d"} stroke={pico ? "#8eac78" : "#687265"} strokeWidth="1.5" />
          {!pico ? <path d={`M${zone.x + 3} ${zone.y + 3}h${zone.w - 6}`} stroke="#849184" strokeOpacity="0.4" strokeWidth="2" /> : null}
        </g>
      ))}
    </g>
  );
});

function rectProps(rect: { x: number; y: number; w: number; h: number; rx?: number }) {
  return { x: rect.x, y: rect.y, width: rect.w, height: rect.h, rx: rect.rx };
}

type Paint = (name: string) => string;
type ArtProps = { model: RaspberryPiModel; uid: string; paint: Paint };

function Chip({ x, y, w, h, label, metal = false, paint }: {
  x: number; y: number; w: number; h: number; label: string; metal?: boolean; paint: Paint;
}) {
  return <g transform={`translate(${x} ${y})`}>
    <rect x="-5" y="-5" width={w + 10} height={h + 10} rx="5" fill="#1c3025" stroke="#6a8266" strokeWidth="1" />
    {Array.from({ length: 12 }, (_, i) => <g key={i} fill="#b1b5a4">
      <rect x={8 + i * (w - 16) / 12} y="-7" width="3" height="5" />
      <rect x={8 + i * (w - 16) / 12} y={h + 2} width="3" height="5" />
      <rect x="-7" y={8 + i * (h - 16) / 12} width="5" height="3" />
      <rect x={w + 2} y={8 + i * (h - 16) / 12} width="5" height="3" />
    </g>)}
    <rect x="2" y="4" width={w} height={h} rx="4" fill="#07130a" opacity="0.6" />
    <rect width={w} height={h} rx={metal ? 10 : 3} fill={paint(metal ? "metal" : "chip")} stroke={metal ? "#d6ded0" : "#3a463d"} strokeWidth="2" />
    {metal ? <rect x="8" y="8" width={w - 16} height={h - 16} rx="7" fill="none" stroke="#7d8780" strokeWidth="1" /> : null}
    <circle cx="10" cy={h - 10} r="3" fill={metal ? "#737e75" : "#5e685d"} />
    <text x={w / 2} y={h * 0.47} fill={metal ? "#36463b" : "#afbba9"} textAnchor="middle" fontFamily="var(--font-technical), monospace" fontSize={Math.min(15, w / 9)} letterSpacing="0.6">{label}</text>
    {label.startsWith("RP") || label.startsWith("BCM") ? <text x={w / 2} y={h * 0.47 + 19} fill={metal ? "#5c6a5b" : "#748374"} textAnchor="middle" fontFamily="monospace" fontSize="8">{label.startsWith("RP") ? "Raspberry Pi" : "Broadcom"}</text> : null}
  </g>;
}

function Port({ x, y, w, h, label, type = "usb", blue = false, paint }: {
  x: number; y: number; w: number; h: number; label: string; type?: "usb" | "hdmi" | "ethernet" | "power"; blue?: boolean; paint: Paint;
}) {
  const side = type === "usb" || type === "ethernet";
  return <g transform={`translate(${x} ${y})`}>
    <rect x="3" y="5" width={w} height={h} rx="4" fill="#062219" opacity="0.5" />
    <rect width={w} height={h} rx="4" fill={paint("metal")} stroke="#e0e4d7" strokeWidth="1.5" />
    <rect x="5" y="5" width={w - 10} height={h - 10} rx="2" fill="none" stroke="#7b8980" />
    <path d={`M8 8H${w - 8} M8 ${h - 8}H${w - 8}`} stroke="#f8f9ee" strokeOpacity="0.5" />
    {side ? <>
      {(type === "ethernet" ? [0.48] : [0.27, 0.68]).map((at, i) => <g key={i}>
        <path d={`M${w - 32} ${h * at - 9}l23 -5v23l-23 -5z`} fill="#34463e" stroke="#66736b" />
        <path d={`M${w - 23} ${h * at - 6}v15`} stroke={blue ? "#087fac" : "#0b1712"} strokeWidth="9" />
        <path d={`M${w - 11} ${h * at - 5}v12`} stroke="#e8e9da" strokeWidth="2" />
      </g>)}
      {type === "ethernet" ? <>
        <rect x={w - 12} y="8" width="7" height="9" fill="#d2aa44" />
        <rect x={w - 12} y={h - 17} width="7" height="9" fill="#7cab48" />
      </> : null}
    </> : <>
      <path d={`M8 ${h - 20}H${w - 8}l-5 14H13z`} fill="#152720" stroke="#697c70" strokeWidth="2" />
      <path d={`M15 ${h - 13}H${w - 15}`} stroke={paint("gold")} strokeWidth="3" />
      <rect x="10" y="9" width="8" height="4" rx="1" fill="#6b7d70" />
      <rect x={w - 18} y="9" width="8" height="4" rx="1" fill="#6b7d70" />
    </>}
    <text x={side ? w * 0.4 : w / 2} y={side ? h * 0.51 : 26} textAnchor="middle" fontSize="11" fill="#4b5c50" fontFamily="monospace">{label}</text>
  </g>;
}

function Ribbon({ x, y, height, label }: { x: number; y: number; height: number; label: string }) {
  return <g transform={`translate(${x} ${y})`}>
    <rect width="28" height={height} rx="2" fill="#c7d2bc" stroke="#e3e9d7" />
    <rect x="3" y="4" width="8" height={height - 8} fill="#0e2119" />
    {Array.from({ length: 15 }, (_, i) => <path key={i} d={`M18 ${8 + i * (height - 16) / 15}h17`} stroke="#dec987" strokeWidth="2" />)}
    <rect x="-5" y="2" width="7" height={height - 4} rx="2" fill="#202d23" />
    <text x="-13" y={height / 2} transform={`rotate(-90 -13 ${height / 2})`} textAnchor="middle" fill="#d3e1bc" fontFamily="monospace" fontSize="12">{label}</text>
  </g>;
}

function Parts({ x, y, cols, rows, uid, step = 22 }: { x: number; y: number; cols: number; rows: number; uid: string; step?: number }) {
  return <g transform={`translate(${x} ${y})`}>
    {Array.from({ length: cols * rows }, (_, i) => <use key={i} href={`#${uid}-${i % 3 === 0 ? "resistor" : "capacitor"}`} x={(i % cols) * step} y={Math.floor(i / cols) * 16} />)}
  </g>;
}

function Traces({ width, height }: { width: number; height: number }) {
  return <g fill="none" stroke="#6b9a58" strokeWidth="1.1" opacity="0.33">
    {Array.from({ length: 20 }, (_, i) => <path key={i} d={`M${100 + i * 19} 108v${38 + i * 3}l${75 + i * 2} ${75 + i * 2}v${height * 0.23}l${90 + i * 2} ${40 + i * 2}H${width - 65}`} />)}
    {Array.from({ length: 9 }, (_, i) => <path key={`b${i}`} d={`M40 ${height - 100 - i * 6}h${80 + i * 10}l${90 + i * 4} -${90 + i * 4}h${width * 0.32}`} />)}
  </g>;
}

function Sbc({ model, uid, paint }: ArtProps) {
  const modern = (model.generation ?? 0) >= 4;
  const pi5 = model.generation === 5;
  return <>
    <rect x="52" y="122" width="720" height="465" fill={paint("vias")} opacity="0.65" />
    <Traces width={1000} height={660} />
    {model.wireless ? <Chip x={80} y={145} w={105} h={115} label="Wireless" metal paint={paint} /> : <Parts x={70} y={150} cols={5} rows={6} uid={uid} />}
    <Chip x={275} y={235} w={170} h={185} label={model.silicon} metal={(model.generation ?? 0) >= 3} paint={paint} />
    {modern ? <Chip x={500} y={240} w={110} h={160} label="LPDDR4" paint={paint} /> : null}
    {!model.compact ? <Chip x={650} y={pi5 ? 420 : 340} w={105} h={100} label={pi5 ? "RP1" : modern ? "VL805" : "USB / LAN"} paint={paint} /> : null}
    <Parts x={260} y={169} cols={10} rows={3} uid={uid} />
    <Parts x={250} y={443} cols={9} rows={4} uid={uid} />
    <Parts x={76} y={442} cols={5} rows={5} uid={uid} />
    <Parts x={650} y={230} cols={6} rows={5} uid={uid} />
    <Parts x={650} y={560} cols={5} rows={3} uid={uid} />
    <Chip x={86} y={350} w={52} h={55} label="PMIC" paint={paint} />
    <rect x="154" y="349" width="38" height="47" rx="4" fill="#788476" stroke="#b9c3ab" />
    <text x="173" y="378" textAnchor="middle" fontSize="14" fill="#263c29">4R7</text>
    {!model.compact ? <>
      <Port x={815} y={pi5 ? 80 : 450} w={179} h={168} type="ethernet" label="Ethernet" paint={paint} />
      <Port x={840} y={pi5 ? 290 : 92} w={155} h={145} label={pi5 ? "USB 3" : "USB 2"} blue={pi5} paint={paint} />
      <Port x={840} y={pi5 ? 466 : 267} w={155} h={145} label={pi5 ? "USB 2" : modern ? "USB 3" : "USB 2"} blue={modern && !pi5} paint={paint} />
    </> : <Port x={840} y={280} w={150} h={170} label="USB 2" paint={paint} />}
    <Port x={100} y={577} w={modern ? 90 : 70} h={78} type="power" label={modern ? "USB-C" : "PWR"} paint={paint} />
    {modern ? <>
      <Port x={290} y={590} w={77} h={63} type="hdmi" label="HDMI0" paint={paint} />
      <Port x={417} y={590} w={77} h={63} type="hdmi" label="HDMI1" paint={paint} />
    </> : <Port x={293} y={557} w={157} h={95} type="hdmi" label="HDMI" paint={paint} />}
    {!pi5 ? <>
      <Ribbon x={33} y={291} height={136} label="Display" />
      <Ribbon x={572} y={484} height={144} label="Camera" />
      <rect x="658" y="559" width="66" height="95" rx="5" fill={paint("chip")} stroke="#617260" />
      <ellipse cx="691" cy="638" rx="20" ry="9" fill="#030c08" stroke="#758677" strokeWidth="3" />
      <text x="691" y="548" fill="#cadabd" textAnchor="middle" fontSize="12">A/V</text>
    </> : <>
      <Ribbon x={570} y={535} height={94} label="CAM/DISP 0" />
      <Ribbon x={706} y={535} height={94} label="CAM/DISP 1" />
      <rect x="48" y="529" width="31" height="40" rx="3" fill="#dce2d1" />
      <text x="67" y="516" textAnchor="middle" fontSize="10" fill="#dae4c5">BAT</text>
    </>}
    <text x="265" y="552" fill="#d0e0c1" fontSize="23" fontFamily="var(--font-sans), sans-serif" fontWeight="600">Raspberry Pi</text>
    <text x="280" y="575" fill="#8eb891" fontSize="10" fontFamily="monospace">Component side · illustrated</text>
  </>;
}

function Zero({ model, uid, paint }: ArtProps) {
  return <>
    <rect x="50" y="135" width="870" height="236" fill={paint("vias")} />
    <Traces width={1000} height={435} />
    <Chip x={350} y={180} w={160} h={155} label={model.silicon} paint={paint} />
    <Parts x={238} y={182} cols={4} rows={8} uid={uid} />
    <Parts x={545} y={195} cols={9} rows={4} uid={uid} />
    <Port x={180} y={350} w={125} h={79} type="hdmi" label="Mini HDMI" paint={paint} />
    <Port x={595} y={357} w={84} h={72} type="power" label="USB" paint={paint} />
    <Port x={755} y={357} w={84} h={72} type="power" label="PWR" paint={paint} />
    <Ribbon x={944} y={203} height={113} label="Camera" />
    <rect x="20" y="195" width="130" height="118" rx="6" fill={paint("metal")} stroke="#c5d3bd" />
    <path d="M25 209h96v84H25" fill="#657864" stroke="#bcc9b4" strokeWidth="2" />
    <text x="76" y="257" fill="#d4ddce" textAnchor="middle" fontSize="14">microSD</text>
    {model.wireless ? <>
      <Chip x={770} y={188} w={83} h={83} label="Radio" paint={paint} />
      <path d="M872 315v-35h20v22h20v-32h18" fill="none" stroke="#c8bb71" strokeWidth="4" />
    </> : null}
  </>;
}

function Pico({ model, uid, paint }: ArtProps) {
  return <>
    <rect x="67" y="154" width="285" height="675" fill={paint("vias")} />
    <g fill="none" stroke="#8eac64" strokeWidth="1.1" opacity="0.45">
      {Array.from({ length: 18 }, (_, i) => <path key={i} d={`M40 ${130 + i * 41}h${60 + i % 4 * 9}l${45 + i % 3 * 7} -32H270l35 32h75`} />)}
    </g>
    <Port x={130} y={4} w={160} h={118} label="USB" type="power" paint={paint} />
    <rect x="233" y="145" width="66" height="42" rx="3" fill="#b9c4b0" stroke="#d6e0ce" />
    <rect x="246" y="152" width="40" height="28" rx="3" fill="#e1dece" stroke="#747f6e" />
    <text x="266" y="207" textAnchor="middle" fill="#e0eaca" fontSize="11">BOOTSEL</text>
    <rect x="108" y="156" width="20" height="11" rx="2" fill="#a7d267" stroke="#d7e8a7" />
    <text x="109" y="146" fill="#d4e2b8" fontSize="10">LED</text>
    <Parts x={97} y={229} cols={10} rows={5} step={22} uid={uid} />
    <g transform="rotate(45 210 425)"><Chip x={142} y={357} w={136} h={136} label={model.silicon} paint={paint} /></g>
    <Parts x={92} y={556} cols={10} rows={5} step={22} uid={uid} />
    <Chip x={142} y={658} w={66} h={73} label="Flash" paint={paint} />
    {model.wireless ? <>
      <Chip x={100} y={733} w={217} h={124} label="Wireless" metal paint={paint} />
      <path d="M117 931v-36h28v28h29v-28h30v28h30v-28h30v36" fill="none" stroke="#d4c883" strokeWidth="5" />
    </> : <>
      <Parts x={109} y={764} cols={9} rows={4} step={22} uid={uid} />
      <text x="210" y="899" textAnchor="middle" fill="#d7e6c5" fontSize="27" fontWeight="600">Raspberry Pi</text>
      <text x="210" y="931" textAnchor="middle" fill="#a1c99c" fontSize="18">Pico{model.generation === 2 ? " 2" : ""}</text>
    </>}
  </>;
}

function Keyboard({ model, paint }: { model: RaspberryPiModel; paint: Paint }) {
  return <>
    <path d="M5 371h990v10H5z" fill={model.generation === 4 ? "#a83943" : "#859087"} />
    <text x="500" y="152" textAnchor="middle" fontSize="17" fill="#4c6154" fontFamily="var(--font-sans), sans-serif">Raspberry Pi {model.generation === 4 ? "400" : "500"} · rear connector reference above</text>
    {Array.from({ length: 4 }, (_, row) => <g key={row}>
      {Array.from({ length: 15 }, (_, col) => <g key={col} transform={`translate(${40 + col * 62} ${182 + row * 39})`}>
        <rect x="1" y="3" width="54" height="31" rx="4" fill="#8f9a8e" />
        <rect width="54" height="30" rx="4" fill={paint("case")} stroke="#9ca898" />
        <path d="M8 8h10" stroke="#83917f" strokeWidth="1.5" />
      </g>)}
    </g>)}
    <rect x="283" y="342" width="435" height="24" rx="4" fill="#d6dbd0" stroke="#94a08f" />
  </>;
}
