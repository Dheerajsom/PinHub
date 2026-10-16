"use client";

import Image from "next/image";
import { useState } from "react";
import { vendorDomains, vendorFaviconUrl } from "@/lib/vendor-domains";

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
