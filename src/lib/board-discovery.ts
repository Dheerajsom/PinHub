import type { Board, BoardInterface } from "@/lib/boards";

export type ComputeClass =
  | "Linux SBC"
  | "Microcontroller"
  | "FPGA"
  | "AI accelerator";

export type LogicProfile = "1.8 V" | "3.3 V" | "5 V" | "Mixed" | "Unknown";
export type FiveVoltTolerance = "Yes" | "No" | "Mixed" | "Unknown";

export type BoardDiscoveryProfile = {
  computeClass: ComputeClass;
  logicProfile: LogicProfile;
  fiveVoltTolerance: FiveVoltTolerance;
  wireless: BoardInterface[];
  connectorEcosystems: string[];
};

const wirelessInterfaces = new Set<BoardInterface>([
  "Wi-Fi",
  "Bluetooth",
  "Zigbee",
  "Thread",
]);

export function getBoardDiscoveryProfile(board: Board): BoardDiscoveryProfile {
  const searchable = [
    board.processor,
    board.family,
    board.formFactor,
    ...board.tags,
  ]
    .join(" ")
    .toLowerCase();

  const computeClass: ComputeClass =
    board.category === "SBC"
      ? "Linux SBC"
      : board.category === "AI Dev Kit"
        ? "AI accelerator"
        : searchable.includes("fpga") ||
            searchable.includes("artix") ||
            searchable.includes("lattice") ||
            searchable.includes("max 10")
          ? "FPGA"
          : "Microcontroller";

  const logic = board.logicLevel.toLowerCase();
  const has18 = /1[.]8\s*v/.test(logic);
  const has33 = /3[.]3\s*v/.test(logic);
  const has5 = /(^|[^0-9])5\s*v/.test(logic);
  const logicProfile: LogicProfile =
    [has18, has33, has5].filter(Boolean).length > 1
      ? "Mixed"
      : has18
        ? "1.8 V"
        : has33
          ? "3.3 V"
          : has5
            ? "5 V"
            : "Unknown";

  const fiveVoltTolerance: FiveVoltTolerance = logic.includes("not 5 v tolerant")
    ? "No"
    : logic.includes("5 v tolerant") &&
        (logic.includes("some") || logic.includes("input") || logic.includes("mixed"))
      ? "Mixed"
      : logic.includes("5 v tolerant") || logicProfile === "5 V"
        ? "Yes"
        : "Unknown";

  const connectorEcosystems = new Set<string>();
  const formFactor = board.formFactor.toLowerCase();
  if (formFactor.includes("arduino") || formFactor.includes("uno")) {
    connectorEcosystems.add("Arduino shield");
  }
  if (formFactor.includes("raspberry pi") || formFactor.includes("40-pin header")) {
    connectorEcosystems.add("Raspberry Pi 40-pin");
  }
  if (formFactor.includes("feather")) connectorEcosystems.add("Feather");
  if (formFactor.includes("xiao")) connectorEcosystems.add("XIAO");
  if (formFactor.includes("mkr")) connectorEcosystems.add("MKR");
  if (formFactor.includes("pmod")) connectorEcosystems.add("Pmod");
  if (formFactor.includes("boosterpack")) connectorEcosystems.add("BoosterPack");
  if (formFactor.includes("mikrobus")) connectorEcosystems.add("mikroBUS");

  return {
    computeClass,
    logicProfile,
    fiveVoltTolerance,
    wireless: board.interfaces.filter((item) => wirelessInterfaces.has(item)),
    connectorEcosystems: [...connectorEcosystems],
  };
}

export function sharedDiscoveryReasons(a: Board, b: Board): string[] {
  const aProfile = getBoardDiscoveryProfile(a);
  const bProfile = getBoardDiscoveryProfile(b);
  const reasons: string[] = [];
  if (a.category === b.category) reasons.push(`same ${a.category.toLowerCase()} class`);
  if (aProfile.computeClass === bProfile.computeClass) {
    reasons.push(`same ${aProfile.computeClass.toLowerCase()} platform`);
  }
  const connector = aProfile.connectorEcosystems.find((item) =>
    bProfile.connectorEcosystems.includes(item),
  );
  if (connector) reasons.push(`${connector} compatible`);
  const sharedWireless = aProfile.wireless.find((item) => bProfile.wireless.includes(item));
  if (sharedWireless) reasons.push(`both support ${sharedWireless}`);
  const sharedInterfaces = a.interfaces.filter((item) => b.interfaces.includes(item));
  if (sharedInterfaces.length >= 4) reasons.push(`${sharedInterfaces.length} shared interfaces`);
  return [...new Set(reasons)].slice(0, 2);
}
