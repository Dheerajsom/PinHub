"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpRight, CircuitBoard, Search, X } from "lucide-react";
import { clsx } from "clsx";
import { formatPrice, formatPriceDate, isPriceStale } from "@/lib/board-prices";
import { defaultPriceFilters, filterPrices, parsePriceFilters, pricesUrl, type PriceFilters, type PriceListing } from "@/lib/price-filters";
import { VendorLogo } from "@/components/VendorLogo";

const categories = [{ value: "all", label: "All boards" }, { value: "Microcontroller", label: "Microcontrollers" }, { value: "SBC", label: "SBCs" }];

export function PricesApp({ listings, now }: {
  listings: PriceListing[];
  now: number;
}) {
  const searchParams = useSearchParams();
  const filters = parsePriceFilters(new URLSearchParams(searchParams.toString()));
  const [clock, setClock] = useState(now);

  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  function update(next: PriceFilters, replace = false) {
    const url = pricesUrl(next);
    if (`${location.pathname}${location.search}` !== url) {
      if (replace) history.replaceState(null, "", url);
      else history.pushState(null, "", url);
    }
  }

  const matches = filterPrices(listings, filters, clock);
  const selectedBoard = listings.find((item) => item.boardId === filters.board);
  const filtered = Boolean(filters.query || filters.board || filters.category !== "all" || filters.inStock);
  const staleCount = listings.filter((item) => isPriceStale(item, clock)).length;

  return (
    <div className="mx-auto max-w-[1560px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
        <div>
          <div className="mb-2 hidden font-mono text-xs uppercase tracking-[0.14em] text-amber-200 sm:block">Board buying reference</div>
          <h1 className="brand-title text-2xl leading-tight text-white sm:text-3xl">Prices &amp; availability</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">Popular boards. Exact variants. A direct route to the pins.</p>
        </div>
        <div className="border-l-2 border-amber-300/60 pl-3 text-xs leading-5 text-zinc-400">
          <div className="font-medium text-zinc-200">US stores · USD · one board</div>
          <div>Shipping and tax excluded.</div>
          <a href="#price-notes" className="inline-flex min-h-6 items-center text-amber-200 underline underline-offset-4">Dated checks, not live prices</a>
        </div>
      </div>

      <section aria-label="Find board prices" className="price-filters surface-panel grid gap-3 rounded-xl p-3 sm:p-4">
          <label className="price-filter-search relative block min-w-0">
            <span className="sr-only">Search board prices</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
            <input type="search" value={filters.query} maxLength={100}
              onChange={(event) => update({ ...filters, query: event.target.value }, true)}
              placeholder="Search board, variant, or retailer…"
              className="price-search surface-well min-h-11 w-full rounded-lg pl-10 pr-12 text-base text-white sm:text-sm" />
            {filters.query ? <button type="button" aria-label="Clear price search" onClick={() => update({ ...filters, query: "" }, true)} className="absolute right-0 top-0 grid size-11 place-items-center text-zinc-400 hover:text-white"><X className="size-4" aria-hidden="true" /></button> : null}
          </label>
          <label className="price-filter-sort flex min-h-11 min-w-0 items-center text-xs text-zinc-400">
            <span className="sr-only">Sort by</span>
            <select value={filters.sort} onChange={(event) => update({ ...filters, sort: event.target.value })} className="surface-well min-h-11 min-w-0 w-full rounded-lg px-2 text-base text-zinc-200 sm:px-3 sm:text-sm">
              <option value="featured">Featured</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="name">Board name</option>
            </select>
          </label>
          <div className="price-filter-category flex flex-wrap gap-1" role="group" aria-label="Board category">
            {categories.map(({ value, label }) => <button key={value} type="button" aria-pressed={filters.category === value} onClick={() => update({ ...filters, category: value })}
              className={clsx("min-h-11 rounded-lg border px-2 text-xs font-medium transition sm:px-3", filters.category === value ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100" : "border-transparent text-zinc-400 hover:bg-white/[0.05] hover:text-white")}>{label}</button>)}
          </div>
          <label className="price-filter-stock flex min-h-11 cursor-pointer items-center justify-end gap-2 text-xs text-zinc-300">
            <input type="checkbox" checked={filters.inStock} onChange={(event) => update({ ...filters, inStock: event.target.checked })} className="size-4 shrink-0 accent-cyan-300" /> In stock at check
          </label>
      </section>

      <div className="flex min-h-14 flex-wrap items-center justify-between gap-2 py-3 text-xs">
        <p role="status" aria-live="polite" className="font-mono text-zinc-400">{matches.length} of {listings.length} listings{selectedBoard ? ` · ${selectedBoard.name}` : ""}</p>
        {filtered ? <button type="button" onClick={() => update(defaultPriceFilters)} className="inline-flex min-h-11 items-center gap-1.5 text-cyan-200 hover:text-white"><X className="size-3.5" aria-hidden="true" /> Show all boards</button> : <span className="text-zinc-400">Price &amp; stock as of the date shown</span>}
      </div>
      {staleCount > 0 ? <p className="mb-4 rounded-lg border border-amber-300/30 bg-amber-300/10 p-3 text-sm text-amber-100">{staleCount} {staleCount === 1 ? "listing needs" : "listings need"} a new check. Older prices are for reference; confirm price and stock with the retailer.</p> : null}

      <section aria-label="Board price listings" className="surface-panel overflow-hidden rounded-xl">
        <div aria-hidden="true" className="price-grid hidden border-b border-white/10 px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-zinc-400 lg:grid">
          <span>Board / exact variant</span><span>Listed price</span><span>Seller / availability</span><span>Last checked</span><span>Explore</span>
        </div>
        {matches.length ? <ul className="divide-y divide-white/10">
          {matches.map((listing) => <PriceRow key={listing.boardId} listing={listing} now={clock} />)}
        </ul> : <div className="px-4 py-12 text-center">
          <h2 className="text-lg font-semibold text-white">No matching listings</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-400">Try another board name or clear the filters. Pricing currently covers a selection of the PinHub catalog.</p>
          <button type="button" onClick={() => update(defaultPriceFilters)} className="mt-5 min-h-11 rounded-lg border border-cyan-300/40 bg-cyan-300/10 px-4 text-sm text-cyan-100">Show all boards</button>
        </div>}
      </section>

      <details id="price-notes" className="surface-panel mt-5 scroll-mt-24 rounded-xl px-4 sm:px-5">
        <summary className="cursor-pointer py-4 text-sm font-medium text-zinc-200">How to read these prices</summary>
        <div className="grid gap-4 border-t border-white/10 py-4 text-sm leading-6 text-zinc-400 md:grid-cols-3">
          <p><strong className="font-medium text-zinc-200">A checked snapshot.</strong> Listings are manually checked, not automatically refreshed. After seven days, we label the price as an older check and stop treating its stock status as current.</p>
          <p><strong className="font-medium text-zinc-200">The exact board matters.</strong> Prices apply to the named variant at quantity one. Memory, headers, and bundles can change the cost. Shipping, taxes, and import charges are extra.</p>
          <p><strong className="font-medium text-zinc-200">Confirm before buying.</strong> These are selected US listings, not a lowest-price guarantee. The retailer sets the final price and availability. PinHub does not sell boards.</p>
        </div>
      </details>
      <p className="mt-4 text-xs leading-5 text-zinc-400">Shipping and tax excluded. Need a board that isn’t listed? <Link href="/" className="inline-flex min-h-6 items-center text-cyan-200 underline underline-offset-4">Explore the full pinout catalog</Link>.</p>
    </div>
  );
}

function PriceRow({ listing, now }: { listing: PriceListing; now: number }) {
  const stale = isPriceStale(listing, now);
  const stock = stale || listing.stock === "unknown" ? "Check with seller" : listing.stock === "in-stock" ? "In stock at check" : "Out of stock at check";
  return (
    <li className="price-grid grid gap-x-4 gap-y-4 p-4 transition hover:bg-white/[0.02] sm:p-5">
      <div className="price-board min-w-0">
        <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-wider text-zinc-400"><VendorLogo vendor={listing.vendor} size={16} />{listing.vendor} / {listing.category === "SBC" ? "SBC" : "MCU"}</div>
        <h2><Link href={`/boards/${listing.boardId}`} className="inline-flex min-h-11 items-center text-base font-semibold leading-6 text-white hover:text-cyan-200">{listing.name}</Link></h2>
        <p className="text-xs leading-5 text-zinc-400">{listing.variant}</p>
      </div>
      <div className="price-amount min-w-0 border-l-2 border-amber-300/40 pl-3">
        <div className="text-[10px] uppercase tracking-wider text-zinc-400">{stale ? "Older price" : "Listed price"} · USD</div>
        <div className="mt-1 font-mono text-2xl font-medium tabular-nums tracking-tight text-amber-100">{formatPrice(listing)}</div>
        {listing.stock === "out-of-stock" && !stale ? <div className="mt-1 text-[11px] text-zinc-400">Unavailable at check</div> : null}
      </div>
      <div className="price-seller min-w-0 text-xs leading-5">
        <div className="font-semibold text-zinc-200">{listing.retailer} <span className="font-normal text-zinc-400">/ {listing.sellerType}</span></div>
        <div className={clsx("mt-1", !stale && listing.stock === "in-stock" ? "text-emerald-200" : "text-zinc-400")}>{stock}</div>
        <div className="mt-1 font-mono text-[11px] text-zinc-400">SKU {listing.sku}</div>
      </div>
      <div className="price-checked text-xs leading-5 text-zinc-400">
        <span className="mr-1 lg:hidden">Checked</span><time dateTime={listing.checkedAt} title={listing.checkedAt}>{formatPriceDate(listing.checkedAt)}</time>
        <div className={clsx("text-[11px]", stale ? "text-amber-200" : "text-zinc-400")}>{stale ? "Needs a new check" : "Manual snapshot"}</div>
      </div>
      <div className="price-actions flex gap-2 lg:flex-col">
        <a href={listing.url} target="_blank" rel="noopener noreferrer" aria-label={`View ${listing.name} at ${listing.retailer} (opens in a new tab)`}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 text-xs font-medium text-amber-100 transition hover:border-amber-300/60 hover:bg-amber-300/20">View store <ArrowUpRight className="size-3.5" aria-hidden="true" /></a>
        <Link href={`/pinout/${listing.boardId}`} aria-label={`Pinout for ${listing.name}`} className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 px-3 text-xs text-cyan-200 transition hover:bg-white/[0.05]"><CircuitBoard className="size-3.5" aria-hidden="true" /> Pinout</Link>
      </div>
    </li>
  );
}
