import type {
  Board,
  Pin,
  PinFlag,
  PinFunction,
  PinFunctionData,
  PinPeripheral,
} from "@/lib/boards";

// Pin planner: turns "2x I2C, 1x SPI, 3x PWM" into a conflict-free set of
// physical pins, using only the board's source-backed `functions` data. Pure
// and deterministic: the same board and requirements always give the same
// plan. A board without that data is "unsupported"; nothing here ever falls
// back to reading labels or aliases.

export type PlanPeripheral = PinPeripheral | "GPIO";

/** Peripherals in display order (also the order of URL tokens). */
export const planPeripherals: readonly PlanPeripheral[] = [
  "I2C",
  "SPI",
  "UART",
  "CAN",
  "PWM",
  "ADC",
  "DAC",
  "GPIO",
];
export const maxPlanCount = 8;
export const defaultPlanStepBudget = 50_000;

export type PlanRequirements = Partial<Record<PlanPeripheral, number>>;

export type PlanCaution = { flag: PinFlag; note: string };

export type PlanAssignment = {
  peripheral: PlanPeripheral;
  /** 1-based position among the units requested for this peripheral. */
  unit: number;
  /** The controller, timer, or converter; absent for plain GPIO. */
  instance?: string;
  /** The signal on the instance, or "IO" for plain GPIO. */
  signal: string;
  pin: Pin;
  /** The connector group, on grouped layouts (positions repeat across groups). */
  group?: string;
  /** Placed through a GPIO matrix rather than a fixed pin function. */
  routed: boolean;
  /** The source names this pin as the signal's default. */
  isDefault: boolean;
  /** Source-backed risks for this use of the pin, quoted from the board data. */
  cautions: PlanCaution[];
};

export type PlanResult =
  | { status: "unsupported" }
  | { status: "empty" }
  | {
      status: "ok";
      assignments: PlanAssignment[];
      /** True when a flagged pin had to be used because nothing else fitted. */
      usedFlaggedPins: boolean;
      muxModel: PinFunctionData["mux"]["model"];
      muxNote: string;
      steps: number;
    }
  | { status: "unsatisfiable"; reason: string; steps: number };

type BusPeripheral = "I2C" | "SPI" | "UART" | "CAN";
const busSignals: Record<BusPeripheral, readonly string[]> = {
  I2C: ["SDA", "SCL"],
  SPI: ["SCK", "MOSI", "MISO", "CS"],
  UART: ["TX", "RX"],
  CAN: ["TX", "RX"],
};
const isBus = (peripheral: PlanPeripheral): peripheral is BusPeripheral =>
  peripheral in busSignals;
/** Most constrained first, so fixed channels are claimed before flexible buses. */
const placementOrder: readonly PlanPeripheral[] = [
  "ADC",
  "DAC",
  "I2C",
  "SPI",
  "UART",
  "CAN",
  "PWM",
  "GPIO",
];
/**
 * Flags that make a pin a last resort whatever it is used for, weighted by
 * what goes wrong: a JTAG pin only matters while debugging over JTAG; a
 * strapping pin or LED pin works unless the circuit pulls it at the wrong
 * moment; module memory, the USB link, and the boot button break outright.
 * The weight only orders last-resort pins; every use still carries the caution.
 */
const riskWeights: Partial<Record<PinFlag, number>> = {
  jtag: 1,
  strapping: 2,
  "onboard-led": 2,
  "module-memory": 3,
  usb: 3,
  boot: 3,
};
const riskFlags = new Set(Object.keys(riskWeights) as PinFlag[]);

function riskWeight(candidate: Candidate, peripheral: PlanPeripheral): number {
  return (candidate.pin.flags ?? []).reduce(
    (total, flag) =>
      total +
      (riskWeights[flag] ?? (flag === "adc-unavailable-with-wifi" && peripheral === "ADC" ? 1 : 0)),
    0,
  );
}
const neverAssigned = new Set(["power", "ground", "reserved"]);
const inputSignals = new Set(["MISO", "RX"]);
const numberWords = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight"];

type Candidate = {
  pin: Pin;
  group?: string;
  /** Physical order: position on dual-row maps, group then row on grouped maps. */
  order: number;
  inputOnly: boolean;
};

type Option = {
  candidate: Candidate;
  instance?: string;
  signal: string;
  routed: boolean;
  isDefault: boolean;
};

type Unit = { peripheral: PlanPeripheral; unit: number };

class BudgetExceeded extends Error {}

function signalMatches(wanted: string, signal: string): boolean {
  return wanted === "CS" ? /^CS\d*$/.test(signal) : wanted === signal;
}

function needsOutput(peripheral: PlanPeripheral, signal: string): boolean {
  if (peripheral === "ADC") return false;
  return !inputSignals.has(signal);
}

function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, "en", { numeric: true });
}

function clampCount(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(maxPlanCount, Math.max(0, Math.floor(value)));
}

function candidatesOf(board: Board): Candidate[] {
  const pinout = board.pinout;
  if (!pinout) return [];
  const rows: { pin: Pin; group?: string; order: number }[] = pinout.pins
    ? [...pinout.pins.left, ...pinout.pins.right].map((pin) => ({
        pin,
        order: pin.position,
      }))
    : (pinout.groups ?? []).flatMap((group, groupIndex) =>
        group.pins.map((pin, index) => ({
          pin,
          group: group.label,
          order: groupIndex * 1000 + index,
        })),
      );
  return rows
    .filter(({ pin }) => {
      if (!pin.mcu || neverAssigned.has(pin.role)) return false;
      // "system" pins (EN, RUN, RESET) are never assigned; a system-role GPIO
      // with a stated risk (an ESP32 strapping pin) is a flagged last resort.
      return pin.role !== "system" || Boolean(pin.flags?.length);
    })
    .sort((a, b) => a.order - b.order)
    .map((row) => ({ ...row, inputOnly: Boolean(row.pin.flags?.includes("input-only")) }));
}

function isRisky(candidate: Candidate, peripheral: PlanPeripheral): boolean {
  return (candidate.pin.flags ?? []).some(
    (flag) =>
      riskFlags.has(flag) ||
      (flag === "adc-unavailable-with-wifi" && peripheral === "ADC"),
  );
}

function cautionsFor(
  candidate: Candidate,
  peripheral: PlanPeripheral,
  notes: PinFunctionData["flagNotes"],
): PlanCaution[] {
  return (candidate.pin.flags ?? [])
    .filter((flag) => flag !== "adc-unavailable-with-wifi" || peripheral === "ADC")
    .flatMap((flag) => {
      const note = notes[flag];
      return note ? [{ flag, note }] : [];
    });
}

/** Clamps each count to 0..8, drops unknown keys, and caps the total at `maxUnits`. */
export function normalizePlanRequirements(
  requirements: PlanRequirements,
  maxUnits = Number.POSITIVE_INFINITY,
): PlanRequirements {
  const result: PlanRequirements = {};
  let total = 0;
  for (const peripheral of planPeripherals) {
    const count = Math.min(
      clampCount(requirements[peripheral]),
      Math.max(0, maxUnits - total),
    );
    if (count > 0) {
      result[peripheral] = count;
      total += count;
    }
  }
  return result;
}

/**
 * The planning model for one board: which instances and channels exist and
 * which pins can carry each signal. Built once per board and reused.
 */
export class PinPlanModel {
  readonly candidates: Candidate[];
  readonly data: PinFunctionData;

  constructor(
    readonly board: Board,
    /** Pins already in use (manual claims); they are treated as absent. */
    exclude?: ReadonlySet<Pin>,
  ) {
    if (!board.pinFunctions) throw new Error(`${board.id} has no pin function data`);
    this.data = board.pinFunctions;
    const candidates = candidatesOf(board);
    this.candidates = exclude?.size
      ? candidates.filter((candidate) => !exclude.has(candidate.pin))
      : candidates;
  }

  private routable(peripheral: PlanPeripheral) {
    return this.data.mux.model === "matrix"
      ? this.data.mux.routable?.find((entry) => entry.peripheral === peripheral)
      : undefined;
  }

  private fixedFunctions(candidate: Candidate, peripheral: PlanPeripheral): PinFunction[] {
    return (candidate.pin.functions ?? []).filter((item) => item.peripheral === peripheral);
  }

  /** Bus instances in preference order: ones with source defaults first. */
  busInstances(peripheral: BusPeripheral): string[] {
    const routable = this.routable(peripheral);
    if (routable) return [...routable.instances];
    const withDefaults = new Set<string>();
    const all = new Set<string>();
    for (const candidate of this.candidates) {
      for (const item of this.fixedFunctions(candidate, peripheral)) {
        all.add(item.instance);
        if (item.default) withDefaults.add(item.instance);
      }
    }
    return [...all].sort(
      (a, b) =>
        Number(withDefaults.has(b)) - Number(withDefaults.has(a)) || naturalCompare(a, b),
    );
  }

  /** Pins that can carry `signal` of a bus instance, before ordering. */
  busOptions(peripheral: BusPeripheral, instance: string, signal: string): Option[] {
    const routable = this.routable(peripheral);
    const options: Option[] = [];
    for (const candidate of this.candidates) {
      if (candidate.inputOnly && needsOutput(peripheral, signal)) continue;
      const fixed = this.fixedFunctions(candidate, peripheral).find(
        (item) => item.instance === instance && signalMatches(signal, item.signal),
      );
      if (fixed) {
        options.push({
          candidate,
          instance,
          signal: fixed.signal,
          routed: false,
          isDefault: Boolean(fixed.default),
        });
      } else if (routable) {
        options.push({ candidate, instance, signal, routed: true, isDefault: false });
      }
    }
    return options;
  }

  /** Every (pin, channel) pair for PWM, ADC, or DAC, before ordering. */
  channelOptions(peripheral: "PWM" | "ADC" | "DAC"): Option[] {
    const routable = this.routable(peripheral);
    const options: Option[] = [];
    for (const candidate of this.candidates) {
      if (candidate.inputOnly && needsOutput(peripheral, "")) continue;
      for (const item of this.fixedFunctions(candidate, peripheral)) {
        options.push({
          candidate,
          instance: item.instance,
          signal: item.signal,
          routed: false,
          isDefault: Boolean(item.default),
        });
      }
      if (routable) {
        for (const instance of routable.instances) {
          for (const signal of routable.signals) {
            options.push({ candidate, instance, signal, routed: true, isDefault: false });
          }
        }
      }
    }
    return options;
  }

  gpioOptions(): Option[] {
    return this.candidates
      .filter((candidate) => !candidate.inputOnly)
      .map((candidate) => ({ candidate, signal: "IO", routed: false, isDefault: false }));
  }

  /** How many units of each peripheral this board could ever supply. */
  capacity(): Record<PlanPeripheral, number> {
    const result = Object.fromEntries(planPeripherals.map((p) => [p, 0])) as Record<
      PlanPeripheral,
      number
    >;
    for (const peripheral of planPeripherals) {
      if (peripheral === "GPIO") {
        result.GPIO = this.gpioOptions().length;
      } else if (isBus(peripheral)) {
        result[peripheral] = this.busInstances(peripheral).filter((instance) =>
          busSignals[peripheral].every(
            (signal) => this.busOptions(peripheral, instance, signal).length > 0,
          ),
        ).length;
      } else {
        const channels = new Set(
          this.channelOptions(peripheral).map((option) => `${option.instance}:${option.signal}`),
        );
        result[peripheral] = Math.min(
          channels.size,
          new Set(this.channelOptions(peripheral).map((option) => option.candidate)).size,
        );
      }
    }
    return result;
  }
}

function orderOptions(
  options: Option[],
  peripheral: PlanPeripheral,
  anchorOrder: number | null,
): Option[] {
  return [...options].sort((a, b) => {
    const risk = riskWeight(a.candidate, peripheral) - riskWeight(b.candidate, peripheral);
    if (risk) return risk;
    const preferred = Number(b.isDefault) - Number(a.isDefault);
    if (preferred) return preferred;
    const fixed = Number(a.routed) - Number(b.routed);
    if (fixed) return fixed;
    if (!needsOutput(peripheral, a.signal)) {
      // Input-only pins can serve nothing else, so inputs use them first.
      const inputOnly = Number(b.candidate.inputOnly) - Number(a.candidate.inputOnly);
      if (inputOnly) return inputOnly;
    }
    if (anchorOrder !== null) {
      const near =
        Math.abs(a.candidate.order - anchorOrder) - Math.abs(b.candidate.order - anchorOrder);
      if (near) return near;
    }
    if (peripheral === "GPIO" || a.routed) {
      // Keep pins with fixed functions free for the peripherals that need them.
      const spare =
        (a.candidate.pin.functions?.length ?? 0) - (b.candidate.pin.functions?.length ?? 0);
      if (spare) return spare;
    }
    return (
      a.candidate.order - b.candidate.order ||
      naturalCompare(a.instance ?? "", b.instance ?? "") ||
      naturalCompare(a.signal, b.signal)
    );
  });
}

type SearchState = {
  used: Set<Pin>;
  usedInstances: Set<string>;
  usedChannels: Set<string>;
  assignments: PlanAssignment[];
  steps: number;
};

function solve(
  model: PinPlanModel,
  units: Unit[],
  allowRisky: boolean,
  budget: number,
  state: SearchState,
): boolean {
  const notes = model.data.flagNotes;
  const tick = () => {
    state.steps += 1;
    if (state.steps > budget) throw new BudgetExceeded();
  };
  const allowed = (option: Option, peripheral: PlanPeripheral) =>
    !state.used.has(option.candidate.pin) &&
    (allowRisky || !isRisky(option.candidate, peripheral));
  const assign = (unit: Unit, option: Option): PlanAssignment => ({
    peripheral: unit.peripheral,
    unit: unit.unit,
    ...(option.instance ? { instance: option.instance } : {}),
    signal: option.signal,
    pin: option.candidate.pin,
    ...(option.candidate.group ? { group: option.candidate.group } : {}),
    routed: option.routed,
    isDefault: option.isDefault,
    cautions: cautionsFor(option.candidate, unit.peripheral, notes),
  });

  // Units of one peripheral are interchangeable, so each takes an option (or
  // instance) later in the ordering than the previous one: the same plan is
  // never searched twice in a different order.
  const lastIndex = new Map<PlanPeripheral, number>();
  const orderedCache = new Map<string, Option[]>();

  // Pins the remaining units still need: outputs can only use output-capable
  // pins, and every signal needs a pin of its own. Checking these counts at
  // each unit prunes branches (above all on GPIO-matrix boards, where almost
  // any pin can carry any signal) that cannot possibly finish.
  const outputsFrom: number[] = new Array(units.length + 1).fill(0);
  const pinsFrom: number[] = new Array(units.length + 1).fill(0);
  for (let i = units.length - 1; i >= 0; i -= 1) {
    const { peripheral } = units[i];
    const signals = isBus(peripheral) ? busSignals[peripheral] : [peripheral === "GPIO" ? "IO" : ""];
    outputsFrom[i] =
      outputsFrom[i + 1] + signals.filter((signal) => needsOutput(peripheral, signal)).length;
    pinsFrom[i] = pinsFrom[i + 1] + signals.length;
  }
  const canFinish = (index: number) => {
    let freeOutputs = 0;
    let freePins = 0;
    for (const candidate of model.candidates) {
      if (state.used.has(candidate.pin)) continue;
      if (!allowRisky && (candidate.pin.flags ?? []).some((flag) => riskFlags.has(flag))) continue;
      freePins += 1;
      if (!candidate.inputOnly) freeOutputs += 1;
    }
    return outputsFrom[index] <= freeOutputs && pinsFrom[index] <= freePins;
  };

  function place(index: number): boolean {
    if (index === units.length) return true;
    if (!canFinish(index)) return false;
    const unit = units[index];
    const { peripheral } = unit;
    const floor = lastIndex.get(peripheral) ?? -1;

    if (isBus(peripheral)) {
      const instances = model.busInstances(peripheral);
      for (let i = floor + 1; i < instances.length; i += 1) {
        const instance = instances[i];
        const key = `${peripheral}:${instance}`;
        if (state.usedInstances.has(key)) continue;
        tick();
        state.usedInstances.add(key);
        lastIndex.set(peripheral, i);
        if (placeSignals(unit, instance, 0, null, index)) return true;
        lastIndex.set(peripheral, floor);
        state.usedInstances.delete(key);
      }
      return false;
    }

    const cacheKey = peripheral;
    let options = orderedCache.get(cacheKey);
    if (!options) {
      options = orderOptions(
        peripheral === "GPIO"
          ? model.gpioOptions()
          : model.channelOptions(peripheral as "PWM" | "ADC" | "DAC"),
        peripheral,
        null,
      );
      orderedCache.set(cacheKey, options);
    }
    for (let i = floor + 1; i < options.length; i += 1) {
      const option = options[i];
      if (!allowed(option, peripheral)) continue;
      const channel = `${peripheral}:${option.instance}:${option.signal}`;
      if (peripheral !== "GPIO" && state.usedChannels.has(channel)) continue;
      tick();
      state.used.add(option.candidate.pin);
      if (peripheral !== "GPIO") state.usedChannels.add(channel);
      state.assignments.push(assign(unit, option));
      lastIndex.set(peripheral, i);
      if (place(index + 1)) return true;
      lastIndex.set(peripheral, floor);
      state.assignments.pop();
      state.used.delete(option.candidate.pin);
      if (peripheral !== "GPIO") state.usedChannels.delete(channel);
    }
    return false;
  }

  function placeSignals(
    unit: Unit,
    instance: string,
    signalIndex: number,
    anchorOrder: number | null,
    unitIndex: number,
  ): boolean {
    const peripheral = unit.peripheral as BusPeripheral;
    const signals = busSignals[peripheral];
    if (signalIndex === signals.length) return place(unitIndex + 1);
    const options = orderOptions(
      model.busOptions(peripheral, instance, signals[signalIndex]),
      peripheral,
      anchorOrder,
    );
    for (const option of options) {
      if (!allowed(option, peripheral)) continue;
      tick();
      state.used.add(option.candidate.pin);
      state.assignments.push(assign(unit, option));
      if (
        placeSignals(
          unit,
          instance,
          signalIndex + 1,
          anchorOrder ?? option.candidate.order,
          unitIndex,
        )
      ) {
        return true;
      }
      state.assignments.pop();
      state.used.delete(option.candidate.pin);
    }
    return false;
  }

  return place(0);
}

function unitsFor(requirements: PlanRequirements, peripherals = placementOrder): Unit[] {
  return peripherals.flatMap((peripheral) =>
    Array.from({ length: requirements[peripheral] ?? 0 }, (_, index) => ({
      peripheral,
      unit: index + 1,
    })),
  );
}

function pinsNeeded(requirements: PlanRequirements): number {
  return planPeripherals.reduce(
    (total, peripheral) =>
      total +
      (requirements[peripheral] ?? 0) *
        (isBus(peripheral) ? busSignals[peripheral].length : 1),
    0,
  );
}

function countWord(count: number): string {
  return numberWords[count] ?? String(count);
}

function unitLabel(peripheral: PlanPeripheral, count: number): string {
  return `${count}× ${peripheral}`;
}

function capacityReason(peripheral: PlanPeripheral, available: number): string {
  const word = countWord(available);
  if (isBus(peripheral)) {
    return available === 0
      ? `No ${peripheral} instance is routable on this board.`
      : `Only ${word} ${peripheral} ${available === 1 ? "instance is" : "instances are"} routable on this board.`;
  }
  if (peripheral === "GPIO") {
    if (available === 0) return "No pin on this board is left to assign as plain GPIO.";
    return `Only ${word} ${available === 1 ? "pin" : "pins"} on this board can be assigned as plain GPIO.`;
  }
  return available === 0
    ? `This board has no ${peripheral} channel PinHub can assign.`
    : `Only ${word} ${peripheral} ${available === 1 ? "channel is" : "channels are"} available on this board.`;
}

/**
 * Plans pins for `requirements` on `board`. `budget` caps the backtracking
 * search; a search that runs out reports so instead of returning a guess.
 * `exclude` lists pins the user has claimed by hand; they are never assigned
 * and do not count toward capacity.
 */
export function planPins(
  board: Board,
  requirements: PlanRequirements,
  budget = defaultPlanStepBudget,
  exclude?: ReadonlySet<Pin>,
): PlanResult {
  if (!board.pinFunctions || !board.pinout) return { status: "unsupported" };
  // Counts are only clamped to the planner's range here, never to what the
  // board has left: a request that cannot fit must be reported, not shrunk.
  const wanted = normalizePlanRequirements(requirements);
  if (!planPeripherals.some((peripheral) => (wanted[peripheral] ?? 0) > 0)) {
    return { status: "empty" };
  }
  const model = new PinPlanModel(board, exclude);

  const capacity = model.capacity();
  for (const peripheral of placementOrder) {
    const count = wanted[peripheral] ?? 0;
    if (count > capacity[peripheral]) {
      return { status: "unsatisfiable", reason: capacityReason(peripheral, capacity[peripheral]), steps: 0 };
    }
  }
  const need = pinsNeeded(wanted);
  if (need > model.candidates.length) {
    return {
      status: "unsatisfiable",
      reason: `This plan needs ${need} pins, but PinHub can assign only ${model.candidates.length} on this board.`,
      steps: 0,
    };
  }

  let steps = 0;
  const attempt = (units: Unit[], allowRisky: boolean) => {
    const state: SearchState = {
      used: new Set(),
      usedInstances: new Set(),
      usedChannels: new Set(),
      assignments: [],
      steps: 0,
    };
    try {
      return solve(model, units, allowRisky, budget - steps, state)
        ? state.assignments
        : null;
    } finally {
      steps += state.steps;
    }
  };

  try {
    const units = unitsFor(wanted);
    for (const allowRisky of [false, true]) {
      const assignments = attempt(units, allowRisky);
      if (assignments) {
        return {
          status: "ok",
          assignments: sortAssignments(assignments),
          usedFlaggedPins: allowRisky,
          muxModel: model.data.mux.model,
          muxNote: model.data.mux.note,
          steps,
        };
      }
    }

    // Find the first peripheral that cannot join the ones before it.
    const present = placementOrder.filter((peripheral) => (wanted[peripheral] ?? 0) > 0);
    for (let size = 1; size <= present.length; size += 1) {
      if (!attempt(unitsFor(wanted, present.slice(0, size)), true)) {
        const binding = present[size - 1];
        const earlier = present
          .slice(0, size - 1)
          .map((peripheral) => unitLabel(peripheral, wanted[peripheral]!));
        const reason = earlier.length
          ? `${unitLabel(binding, wanted[binding]!)} doesn't fit alongside ${earlier.join(", ")}: they need the same pins.`
          : `${unitLabel(binding, wanted[binding]!)} needs more separate pins than this board offers.`;
        return { status: "unsatisfiable", reason, steps };
      }
    }
    return { status: "unsatisfiable", reason: "These requirements need the same pins.", steps };
  } catch (error) {
    if (!(error instanceof BudgetExceeded)) throw error;
    return {
      status: "unsatisfiable",
      reason: `PinHub stopped after checking ${budget.toLocaleString("en-US")} combinations without finding a plan. Remove a requirement and try again.`,
      steps: budget,
    };
  }
}

function sortAssignments(assignments: PlanAssignment[]): PlanAssignment[] {
  const rank = (peripheral: PlanPeripheral) => planPeripherals.indexOf(peripheral);
  return assignments
    .map((assignment, index) => ({ assignment, index }))
    .sort(
      (a, b) =>
        rank(a.assignment.peripheral) - rank(b.assignment.peripheral) ||
        a.assignment.unit - b.assignment.unit ||
        a.index - b.index,
    )
    .map(({ assignment }) => assignment);
}

/** Peripherals this board can plan, with the most units of each it can supply. */
export function planCapabilities(
  board: Board,
  exclude?: ReadonlySet<Pin>,
): { peripheral: PlanPeripheral; max: number }[] {
  if (!board.pinFunctions || !board.pinout) return [];
  const capacity = new PinPlanModel(board, exclude).capacity();
  return planPeripherals
    .filter((peripheral) => capacity[peripheral] > 0)
    .map((peripheral) => ({
      peripheral,
      max: Math.min(maxPlanCount, capacity[peripheral]),
    }));
}
