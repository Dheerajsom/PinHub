"use client";

import Image from "next/image";
import { useState } from "react";

// Vendor marks are loaded as favicons from each vendor's own site via
// Google's favicon service, so no trademarked assets ship with the app.
const vendorDomains: Record<string, string> = {
  Adafruit: "adafruit.com",
  Arduino: "arduino.cc",
  "Banana Pi": "banana-pi.org",
  Hardkernel: "hardkernel.com",
  "Lattice Semiconductor": "latticesemi.com",
  "Libre Computer": "libre.computer",
  LilyGO: "lilygo.cc",
  LOLIN: "wemos.cc",
  "M5Stack": "m5stack.com",
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
  // Google's favicon endpoint currently returns 404 for orangepi.org. Omit
  // the optional mark instead of issuing a known-failing production request.
  PJRC: "pjrc.com",
  Radxa: "radxa.com",
  "Raspberry Pi": "raspberrypi.com",
  STMicroelectronics: "st.com",
  "Seeed Studio": "seeedstudio.com",
  SparkFun: "sparkfun.com",
};

type VendorLogoProps = {
  vendor: string;
  size?: number;
};

export function VendorLogo({ vendor, size = 18 }: VendorLogoProps) {
  const [failed, setFailed] = useState(false);
  const domain = vendorDomains[vendor];

  if (!domain || failed) {
    return null;
  }

  return (
    <Image
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
      alt=""
      width={size}
      height={size}
      decoding="async"
      referrerPolicy="no-referrer"
      className="shrink-0 rounded-sm"
      aria-hidden="true"
      onError={() => setFailed(true)}
    />
  );
}
