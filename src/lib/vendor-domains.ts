// Each catalog vendor's own site. Vendor marks are loaded as favicons from it
// via Google's favicon service (VendorLogo, the page background), so no
// trademarked assets ship with the app.
export const vendorDomains: Record<string, string> = {
  Adafruit: "adafruit.com",
  Arduino: "arduino.cc",
  "Banana Pi": "banana-pi.org",
  Hardkernel: "hardkernel.com",
  "Lattice Semiconductor": "latticesemi.com",
  "Libre Computer": "libre.computer",
  LilyGO: "lilygo.cc",
  LOLIN: "wemos.cc",
  M5Stack: "m5stack.com",
  "Milk-V": "milkv.io",
  NodeMCU: "nodemcu.com",
  "Nordic Semiconductor": "nordicsemi.com",
  Particle: "particle.io",
  Pine64: "pine64.org",
  "Texas Instruments": "ti.com",
  "WeAct Studio": "weactstudio.cn",
  BeagleBoard: "beagleboard.org",
  Digilent: "digilent.com",
  Espressif: "espressif.com",
  "Google Coral": "coral.ai",
  "Micro:bit Educational Foundation": "microbit.org",
  NVIDIA: "nvidia.com",
  // "Orange Pi" is deliberately absent: Google's favicon endpoint currently
  // returns 404 for orangepi.org, and the mark is optional, so omitting the
  // entry avoids a known-failing production request.
  PJRC: "pjrc.com",
  Radxa: "radxa.com",
  "Raspberry Pi": "raspberrypi.com",
  STMicroelectronics: "st.com",
  "Seeed Studio": "seeedstudio.com",
  SparkFun: "sparkfun.com",
};

/** Favicon URL for a vendor's site; `size` is the requested source size in px. */
export function vendorFaviconUrl(domain: string, size = 64): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
}
