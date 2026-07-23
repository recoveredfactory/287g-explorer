<script lang="ts">
  // ── /video/surge — "old vs new" 287(g) surge graphic (feat/surge-map-graphic) ─
  // A fixed-size dark canvas (email/social): title + legend, a national map with
  // dots colored old (slate, pre-April) vs new (orange, since April), then a
  // strip of six zoomed single-state mini-maps for the top surge states. The bake
  // script (scripts/bake-surge-graphic.mjs) frame-steps window.__bake.seek(0..1)
  // to reveal the new dots, and screenshots [data-surge-canvas] per frame.
  //
  // A plain visit renders the final frame (all dots in). This is a NON-DEFAULT
  // NationalMap variant (colorMode="newOld"); the site's model coloring is
  // untouched everywhere else.
  import type { PageData } from "./$types";
  import { onMount } from "svelte";
  import { getLocale } from "$lib/paraglide/runtime";
  import { m } from "$lib/paraglide/messages.js";
  import NationalMap from "$lib/components/NationalMap.svelte";
  import StateMiniMap from "$lib/components/StateMiniMap.svelte";

  export let data: PageData;

  $: localeTag = getLocale() === "es" ? "es-MX" : "en-US";
  const intFmt = (tag: string, n: number) => new Intl.NumberFormat(tag).format(n);

  // How many strip columns: 6 = one row (a true strip); flip to 3 for a 3×2 grid
  // if six-across reads cramped. Tuned by eye against the render.
  const STRIP_COLS = 3;

  // Data-freshness stamp.
  $: asOf = data.snapshotDate
    ? new Intl.DateTimeFormat(localeTag, { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(data.snapshotDate))
    : "";

  // Reveal 0→1. Default 1 so a plain visit shows the finished graphic.
  let revealProgress = 1;
  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

  // Bake hook. ready() waits for the WebGL national map's first idle paint; the
  // strip is server-rendered SVG (instant). seek/reveal both drive the sweep.
  let mapReady = 0;
  const onMapReady = () => (mapReady += 1);
  onMount(() => {
    (window as any).__bake = {
      ready: () => mapReady >= 1,
      reveal: (p: number) => (revealProgress = clamp01(p)),
      seek: (p: number) => (revealProgress = clamp01(p)),
    };
    return () => {
      delete (window as any).__bake;
    };
  });
</script>

<svelte:head>
  <title>287(g) Watch — surge graphic</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="surge-canvas" data-surge-canvas style="--cols: {STRIP_COLS};">
  <!-- Header: title + hero count + legend -->
  <header class="surge-head">
    <div class="surge-title">{m.surge_title()}</div>
    <div class="surge-sub">
      <span class="surge-count">{intFmt(localeTag, data.newCount)}</span>
      <span class="surge-sub-text">{m.surge_subtitle()}</span>
    </div>
    <div class="surge-legend" aria-hidden="true">
      <span class="surge-leg-item">
        <span class="surge-swatch" style="background: {data.oldColor};"></span>
        {m.surge_legend_old()}
      </span>
      <span class="surge-leg-item">
        <span class="surge-swatch" style="background: {data.newColor};"></span>
        {m.surge_legend_new()}
      </span>
    </div>
  </header>

  <!-- National map: dots colored old (slate) vs new (orange) -->
  <div class="surge-map">
    <NationalMap
      agencies={data.agencies}
      lower48
      dotScale={1.15}
      colorMode="newOld"
      newOldThreshold={data.threshold}
      newColor={data.newColor}
      oldColor={data.oldColor}
      {revealProgress}
      onReady={onMapReady}
    />
  </div>

  <!-- Strip: six zoomed state mini-maps -->
  <div class="surge-strip-heading">{m.surge_strip_heading()}</div>
  <div class="surge-strip">
    {#each data.strip as s}
      <div class="surge-card">
        <div class="surge-card-map">
          <StateMiniMap
            id={`surge-${s.abbr}`}
            w={s.w}
            h={s.h}
            outline={s.outline}
            highways={s.highways}
            dots={s.dots}
            dark
            reveal={revealProgress}
            label={s.name}
          />
        </div>
        <div class="surge-card-label">
          <span class="surge-card-abbr">{s.abbr}</span>
          <span class="surge-card-new">+{intFmt(localeTag, s.newCount)}</span>
        </div>
      </div>
    {/each}
  </div>

  <!-- Footer: source + brand -->
  <footer class="surge-foot">
    <div class="surge-source">{m.video_source()}</div>
    <div class="surge-brand">
      <span class="surge-wm">287(g) Watch</span>
      <span class="surge-url">287g.recoveredfactory.net</span>
      {#if asOf}<span class="surge-asof">{m.video_data_as_of()} {asOf} · CC BY 4.0</span>{/if}
    </div>
  </footer>
</div>

<style>
  /* Fixed dark canvas. ~600px logical wide → authored at 1200px (@2x) so the
     GIF/PNG are crisp at email display size. */
  .surge-canvas {
    position: relative;
    width: 1200px;
    height: 1500px;
    overflow: hidden;
    background: #0c1117;
    color: #ffffff;
    font-family: "Inter", system-ui, sans-serif;
    display: flex;
    flex-direction: column;
    padding: 46px 44px 34px;
    box-sizing: border-box;
  }

  /* Header */
  .surge-head {
    flex: 0 0 auto;
  }
  .surge-title {
    font-family: "Bitter", Georgia, serif;
    font-size: 62px;
    font-weight: 900;
    line-height: 1.0;
    letter-spacing: -0.01em;
    color: #ffffff;
  }
  .surge-sub {
    margin-top: 16px;
    display: flex;
    align-items: baseline;
    gap: 16px;
  }
  .surge-count {
    font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
    font-variant-numeric: tabular-nums;
    font-size: 66px;
    font-weight: 500;
    line-height: 0.9;
    letter-spacing: -0.02em;
    color: #E8792B;
    text-shadow: 0 0 40px rgba(232, 121, 43, 0.35);
  }
  .surge-sub-text {
    font-size: 34px;
    font-weight: 600;
    color: #d7dee8;
  }
  .surge-legend {
    margin-top: 22px;
    display: flex;
    gap: 34px;
    align-items: center;
  }
  .surge-leg-item {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    font-size: 27px;
    font-weight: 600;
    color: #b7c1cd;
  }
  .surge-swatch {
    width: 26px;
    height: 26px;
    border-radius: 999px;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.18) inset;
  }

  /* National map */
  .surge-map {
    position: relative;
    flex: 0 0 auto;
    height: 600px;
    margin-top: 22px;
    border-radius: 12px;
    overflow: hidden;
  }
  /* Hide MapLibre's on-canvas controls + attribution — this is a baked still. */
  .surge-map :global(.maplibregl-ctrl-top-left),
  .surge-map :global(.maplibregl-ctrl-top-right),
  .surge-map :global(.maplibregl-ctrl-bottom-left),
  .surge-map :global(.maplibregl-ctrl-bottom-right) {
    display: none !important;
  }

  /* Strip */
  .surge-strip-heading {
    flex: 0 0 auto;
    margin-top: 26px;
    margin-bottom: 14px;
    font-size: 24px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #8a97a6;
  }
  .surge-strip {
    flex: 0 0 auto;
    display: grid;
    grid-template-columns: repeat(var(--cols), 1fr);
    gap: 18px;
  }
  .surge-card {
    background: #121a25;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 12px;
    padding: 10px 10px 8px;
    display: flex;
    flex-direction: column;
  }
  .surge-card-map {
    height: 150px;
  }
  .surge-card-label {
    margin-top: 6px;
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 12px;
  }
  .surge-card-abbr {
    font-size: 30px;
    font-weight: 800;
    letter-spacing: 0.02em;
    color: #e2e8f0;
  }
  .surge-card-new {
    font-family: "IBM Plex Mono", ui-monospace, monospace;
    font-variant-numeric: tabular-nums;
    font-size: 28px;
    font-weight: 500;
    color: #E8792B;
  }

  /* Footer */
  .surge-foot {
    flex: 1 1 auto;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 24px;
    margin-top: 24px;
  }
  .surge-source {
    max-width: 620px;
    font-size: 21px;
    font-weight: 500;
    color: #94a3b8;
    line-height: 1.35;
  }
  .surge-brand {
    text-align: right;
    line-height: 1.3;
    display: flex;
    flex-direction: column;
  }
  .surge-wm {
    font-size: 34px;
    font-weight: 800;
    letter-spacing: 0.02em;
    color: #BE6079;
  }
  .surge-url {
    font-size: 22px;
    font-weight: 600;
    color: #cbd5e1;
  }
  .surge-asof {
    font-size: 19px;
    color: #94a3b8;
  }
</style>
