// Each catalog vendor's own site. Vendor marks are loaded as favicons from it
// via Google's favicon service (VendorLogo, the page background), so no
// trademarked assets ship with the app. Vendors whose sites have no mark in
// that service (LOLIN's wemos.cc, Terasic, DOIT) are left out, and VendorLogo
// shows a neutral monogram for them instead.
export const vendorDomains: Record<string, string> = {
  Adafruit: "adafruit.com",
  Arduino: "arduino.cc",
  "Banana Pi": "banana-pi.org",
  Hardkernel: "hardkernel.com",
  "Lattice Semiconductor": "latticesemi.com",
  "Libre Computer": "libre.computer",
  LilyGO: "lilygo.cc",
  M5Stack: "m5stack.com",
  "Milk-V": "milkv.io",
  // nodemcu.com has no mark in Google's favicon service; the project's docs do.
  NodeMCU: "nodemcu.readthedocs.io",
  "Nordic Semiconductor": "nordicsemi.com",
  Particle: "particle.io",
  Pine64: "pine64.org",
  "Texas Instruments": "ti.com",
  "WeAct Studio": "weactstudio.com",
  BeagleBoard: "beagleboard.org",
  "BeagleBoard.org": "beagleboard.org",
  Digilent: "digilent.com",
  Espressif: "espressif.com",
  "Google Coral": "coral.ai",
  // microbit.org itself has no mark in the favicon service; its editor subdomain does.
  "Micro:bit Educational Foundation": "makecode.microbit.org",
  NVIDIA: "nvidia.com",
  // The bare orangepi.org answers 404 in the favicon service; www does not.
  "Orange Pi": "www.orangepi.org",
  PJRC: "pjrc.com",
  Radxa: "radxa.com",
  "Raspberry Pi": "raspberrypi.com",
  STMicroelectronics: "st.com",
  "Seeed Studio": "seeedstudio.com",
  "Flipper Devices": "flipper.net",
  Khadas: "khadas.com",
  "NXP Semiconductors": "nxp.com",
  "Silicon Labs": "silabs.com",
  StarFive: "starfivetech.com",
  Waveshare: "waveshare.com",
  SparkFun: "sparkfun.com",
};

/** Favicon URL for a vendor's site; `size` is the requested source size in px. */
export function vendorFaviconUrl(domain: string, size = 64): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
}
