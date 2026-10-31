"use client";

import Image from "next/image";
import { useState } from "react";
import { vendorDomains, vendorFaviconUrl } from "@/lib/vendor-domains";

type VendorLogoProps = {
  vendor: string;
  size?: number;
};

/** "Generic" names no maker, so it gets no mark at all. */
const UNMARKED_VENDORS = new Set(["Generic"]);

/** The first letter or digit of a vendor's name, for the fallback mark. */
export function vendorMonogram(vendor: string): string {
  return vendor.match(/[\p{L}\p{N}]/u)?.[0]?.toUpperCase() ?? "";
}

export function VendorLogo({ vendor, size = 18 }: VendorLogoProps) {
  const [failed, setFailed] = useState(false);
  const domain = vendorDomains[vendor];

  if (UNMARKED_VENDORS.has(vendor)) return null;

  if (!domain || failed) {
    const letter = vendorMonogram(vendor);
    if (!letter) return null;
    // A neutral stand-in keeps rows aligned when a vendor has no working mark.
    return (
      <span
        className="ph-vendor-monogram"
        style={{ width: size, height: size, fontSize: Math.max(9, Math.round(size * 0.56)) }}
        aria-hidden="true"
      >
        {letter}
      </span>
    );
  }

  return (
    <Image
      src={vendorFaviconUrl(domain)}
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
