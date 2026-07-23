<script lang="ts">
  // ── Expansion-graphic time element (feat/surge-map-graphic) ─────────────────
  // A thin, understated Apr→Jul timeline synced to the reveal `progress` (0→1).
  // A muted track fills orange left→right as `progress` grows, a marker rides
  // the growing edge, month ticks (Apr May Jun Jul) sit beneath, and the current
  // month's label lights up. The newest data month (July) carries a persistent
  // "partial" caption. Everything is a pure function of `progress`, so the bake's
  // monotonic seek(0..1) reads as time passing — never random popping.
  import { m } from "$lib/paraglide/messages.js";

  export let progress = 1; // 0 = April, 1 = newest signing (right edge)
  export let threshold = "2026-04-01"; // window start (left edge)
  export let newMax = "2026-07-01"; // newest since-April signing (right edge)
  export let localeTag = "en-US";
  export let compact = false; // smaller type for the states / nation overlays

  const dayNum = (d: string): number => Date.parse(d + "T00:00:00Z") / 86_400_000;
  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
  const monthFmt = (d: Date) =>
    new Intl.DateTimeFormat(localeTag, { month: "short", timeZone: "UTC" }).format(d);

  $: t0 = dayNum(threshold);
  $: t1 = Math.max(t0 + 1, dayNum(newMax));
  $: span = t1 - t0;
  $: newMaxYm = newMax.slice(0, 7);

  // Month ticks: first-of-month from the window's start month through the
  // newest data month. Positioned by their fraction along [threshold, newMax].
  $: ticks = (() => {
    const out: { pct: number; label: string; ym: string; tx: string; isLast: boolean }[] = [];
    let y = Number(threshold.slice(0, 4));
    let mo = Number(threshold.slice(5, 7));
    const endY = Number(newMaxYm.slice(0, 4));
    const endM = Number(newMaxYm.slice(5, 7));
    while (y < endY || (y === endY && mo <= endM)) {
      const iso = `${y}-${String(mo).padStart(2, "0")}-01`;
      const ym = iso.slice(0, 7);
      const day = dayNum(iso);
      const pct = clamp01((day - t0) / span) * 100;
      const tx = pct <= 1 ? "0%" : pct >= 99 ? "-100%" : "-50%";
      out.push({ pct, label: monthFmt(new Date(day * 86_400_000)), ym, tx, isLast: ym === newMaxYm });
      mo += 1;
      if (mo > 12) { mo = 1; y += 1; }
    }
    return out;
  })();

  $: markerPct = clamp01(progress) * 100;
  // Current month = the month containing the marker's date.
  $: cursorDate = new Date((t0 + clamp01(progress) * span) * 86_400_000);
  $: cursorYm = `${cursorDate.getUTCFullYear()}-${String(cursorDate.getUTCMonth() + 1).padStart(2, "0")}`;
</script>

<div class="tl" class:tl--compact={compact} role="img" aria-label={m.surge_timeline_aria()}>
  <div class="tl-track">
    <div class="tl-fill" style="width: {markerPct}%;"></div>
    {#each ticks as t}
      <span class="tl-tick" style="left: {t.pct}%;"></span>
    {/each}
    <span class="tl-marker" style="left: {markerPct}%;"></span>
  </div>
  <div class="tl-labels">
    {#each ticks as t}
      <span
        class="tl-label"
        class:is-current={t.ym === cursorYm}
        style="left: {t.pct}%; transform: translateX({t.tx});"
      >
        {t.label}{#if t.isLast}<em class="tl-partial" class:is-on={cursorYm === newMaxYm}>{m.surge_partial()}</em>{/if}
      </span>
    {/each}
  </div>
</div>

<style>
  .tl {
    width: 100%;
    font-family: "Inter", system-ui, sans-serif;
  }
  .tl-track {
    position: relative;
    height: 4px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.12);
  }
  .tl-fill {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    border-radius: 999px;
    background: linear-gradient(90deg, rgba(232, 121, 43, 0.55), #e8792b);
  }
  .tl-tick {
    position: absolute;
    top: 50%;
    width: 2px;
    height: 12px;
    transform: translate(-50%, -50%);
    background: rgba(255, 255, 255, 0.22);
    border-radius: 1px;
  }
  .tl-marker {
    position: absolute;
    top: 50%;
    width: 15px;
    height: 15px;
    transform: translate(-50%, -50%);
    border-radius: 999px;
    background: #e8792b;
    box-shadow:
      0 0 0 3px rgba(232, 121, 43, 0.22),
      0 0 14px rgba(232, 121, 43, 0.6);
  }
  .tl-labels {
    position: relative;
    height: 24px;
    margin-top: 10px;
  }
  .tl-label {
    position: absolute;
    top: 0;
    white-space: nowrap;
    font-size: 21px;
    font-weight: 700;
    letter-spacing: 0.02em;
    color: #7c8a9b;
    transition: color 120ms linear;
  }
  .tl-label.is-current {
    color: #f0a869;
  }
  .tl-partial {
    margin-left: 7px;
    font-size: 0.62em;
    font-style: normal;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #5c6b7e;
  }
  .tl-partial.is-on {
    color: #e8792b;
  }

  /* Compact — for the states-grid + nation overlays */
  .tl--compact .tl-track { height: 3px; }
  .tl--compact .tl-tick { height: 9px; }
  .tl--compact .tl-marker {
    width: 11px;
    height: 11px;
    box-shadow:
      0 0 0 2px rgba(232, 121, 43, 0.22),
      0 0 9px rgba(232, 121, 43, 0.55);
  }
  .tl--compact .tl-labels { height: 17px; margin-top: 7px; }
  .tl--compact .tl-label { font-size: 15px; }
</style>
