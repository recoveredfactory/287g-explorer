<script lang="ts">
  // ── /video/surge — "the 287(g) network keeps expanding" graphic ─────────────
  // A fixed-size dark canvas (email/social) rendered in FOUR variants, selected
  // by ?variant=:
  //   card              16:9 full composition (national map + 2×3 state strip,
  //                     title/legend/branding) — GIF + MP4
  //   states-portrait   2×3 state mini-maps only, watermark + tiny legend — GIF
  //   states-landscape  3×2 state mini-maps only, watermark + tiny legend — GIF
  //   nation            national map only, watermark + tiny legend — GIF
  //
  // Dots are colored old (muted slate, pre-April) vs new (orange, since April).
  // A smooth Apr→Jul timeline (SurgeTimeline) is synced to the reveal so the
  // baked sweep reads as time passing. This is a NON-DEFAULT NationalMap variant
  // (colorMode="newOld"); the site's model coloring is untouched everywhere else.
  //
  // The bake script (scripts/bake-surge-graphic.mjs) frame-steps
  // window.__bake.seek(0..1) to reveal the new dots and screenshots
  // [data-surge-canvas]. A plain visit renders the final frame (all dots in).
  import type { PageData } from "./$types";
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { getLocale } from "$lib/paraglide/runtime";
  import { m } from "$lib/paraglide/messages.js";
  import NationalMap from "$lib/components/NationalMap.svelte";
  import StateMiniMap from "$lib/components/StateMiniMap.svelte";
  import SurgeTimeline from "$lib/components/SurgeTimeline.svelte";

  export let data: PageData;

  $: localeTag = getLocale() === "es" ? "es-MX" : "en-US";
  const intFmt = (tag: string, n: number) => new Intl.NumberFormat(tag).format(n);

  // Variant + its fixed canvas dimensions.
  const DIMS: Record<string, { w: number; h: number; scols: number; dot: number }> = {
    card: { w: 1600, h: 900, scols: 2, dot: 1.15 },
    "states-portrait": { w: 1080, h: 1440, scols: 2, dot: 1 },
    "states-landscape": { w: 1500, h: 1000, scols: 3, dot: 1 },
    nation: { w: 1200, h: 750, scols: 2, dot: 1.25 },
  };
  $: variant = (() => {
    const v = $page.url.searchParams.get("variant") ?? "card";
    return v in DIMS ? v : "card";
  })();
  $: dims = DIMS[variant];
  $: hasNationalMap = variant === "card" || variant === "nation";
  $: isStates = variant === "states-portrait" || variant === "states-landscape";

  // Data-freshness stamp.
  $: asOf = data.snapshotDate
    ? new Intl.DateTimeFormat(localeTag, { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(data.snapshotDate))
    : "";

  // Reveal 0→1. Default 1 so a plain visit shows the finished graphic.
  let revealProgress = 1;
  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

  // Bake hook. ready() waits for the WebGL national map's first idle paint on the
  // map variants; the states variants are pure SVG (instant → ready at once).
  let mapReady = 0;
  const onMapReady = () => (mapReady += 1);
  onMount(() => {
    (window as any).__bake = {
      ready: () => (hasNationalMap ? mapReady >= 1 : true),
      reveal: (p: number) => (revealProgress = clamp01(p)),
      seek: (p: number) => (revealProgress = clamp01(p)),
    };
    return () => {
      delete (window as any).__bake;
    };
  });
</script>

<svelte:head>
  <title>287(g) Watch — expansion graphic</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="surge-canvas surge--{variant}" data-surge-canvas style="width: {dims.w}px; height: {dims.h}px; --scols: {dims.scols};">
  {#if variant === "card"}
    <!-- ── card: 16:9 full composition ──────────────────────────────────────── -->
    <header class="card-head">
      <div class="card-head-main">
        <div class="surge-title">{m.surge_title()}</div>
        <div class="surge-sub">
          <span class="surge-count">{intFmt(localeTag, data.newCount)}</span>
          <span class="surge-sub-text">{m.surge_subtitle()}</span>
        </div>
      </div>
      <div class="surge-legend" aria-hidden="true">
        <span class="surge-leg-item">
          <span class="surge-swatch" style="background: {data.oldColor}; opacity: 0.5;"></span>
          {m.surge_legend_old()}
        </span>
        <span class="surge-leg-item">
          <span class="surge-swatch surge-swatch--new" style="background: {data.newColor};"></span>
          {m.surge_legend_new()}
        </span>
      </div>
    </header>

    <div class="card-body">
      <div class="card-map">
        <NationalMap
          agencies={data.agencies}
          lower48
          dotScale={dims.dot}
          colorMode="newOld"
          newOldThreshold={data.threshold}
          newColor={data.newColor}
          oldColor={data.oldColor}
          {revealProgress}
          onReady={onMapReady}
        />
      </div>
      <div class="card-states">
        <div class="surge-strip-heading">{m.surge_strip_heading()}</div>
        <div class="surge-strip">
          {#each data.strip as s}
            <div class="surge-card">
              <div class="surge-card-map">
                <StateMiniMap id={`surge-${s.abbr}`} w={s.w} h={s.h} outline={s.outline} highways={s.highways} dots={s.dots} dark reveal={revealProgress} label={s.name} />
              </div>
              <div class="surge-card-label">
                <span class="surge-card-abbr">{s.abbr}</span>
                <span class="surge-card-new">+{intFmt(localeTag, s.newCount)}</span>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <div class="card-timeline">
      <SurgeTimeline progress={revealProgress} threshold={data.threshold} newMax={data.newMax} {localeTag} />
    </div>

    <footer class="surge-foot">
      <div class="surge-source">{m.video_source()}</div>
      <div class="surge-brand">
        <span class="surge-wm">287(g) Watch</span>
        <span class="surge-url">287g.recoveredfactory.net</span>
        {#if asOf}<span class="surge-asof">{m.video_data_as_of()} {asOf} · CC BY 4.0</span>{/if}
      </div>
    </footer>

  {:else if isStates}
    <!-- ── states-portrait / states-landscape: mini-maps only ───────────────── -->
    <div class="states-top">
      <div class="surge-legend surge-legend--tiny" aria-hidden="true">
        <span class="surge-leg-item">
          <span class="surge-swatch" style="background: {data.oldColor}; opacity: 0.5;"></span>
          {m.surge_legend_old()}
        </span>
        <span class="surge-leg-item">
          <span class="surge-swatch surge-swatch--new" style="background: {data.newColor};"></span>
          {m.surge_legend_new()}
        </span>
      </div>
      <div class="states-timeline">
        <SurgeTimeline progress={revealProgress} threshold={data.threshold} newMax={data.newMax} {localeTag} compact />
      </div>
    </div>

    <div class="surge-strip states-grid">
      {#each data.strip as s}
        <div class="surge-card">
          <div class="surge-card-map">
            <StateMiniMap id={`surge-${s.abbr}`} w={s.w} h={s.h} outline={s.outline} highways={s.highways} dots={s.dots} dark reveal={revealProgress} label={s.name} />
          </div>
          <div class="surge-card-label">
            <span class="surge-card-abbr">{s.abbr}</span>
            <span class="surge-card-new">+{intFmt(localeTag, s.newCount)}</span>
          </div>
        </div>
      {/each}
    </div>

    <div class="surge-watermark">287g.recoveredfactory.net</div>

  {:else}
    <!-- ── nation: national map only ────────────────────────────────────────── -->
    <div class="nation-map">
      <NationalMap
        agencies={data.agencies}
        lower48
        dotScale={dims.dot}
        colorMode="newOld"
        newOldThreshold={data.threshold}
        newColor={data.newColor}
        oldColor={data.oldColor}
        {revealProgress}
        onReady={onMapReady}
      />
    </div>
    <div class="nation-legend surge-legend surge-legend--tiny" aria-hidden="true">
      <span class="surge-leg-item">
        <span class="surge-swatch" style="background: {data.oldColor}; opacity: 0.5;"></span>
        {m.surge_legend_old()}
      </span>
      <span class="surge-leg-item">
        <span class="surge-swatch surge-swatch--new" style="background: {data.newColor};"></span>
        {m.surge_legend_new()}
      </span>
    </div>
    <div class="nation-timeline">
      <SurgeTimeline progress={revealProgress} threshold={data.threshold} newMax={data.newMax} {localeTag} compact />
    </div>
    <div class="surge-watermark">287g.recoveredfactory.net</div>
  {/if}
</div>

<style>
  /* Fixed dark canvas. Sized per-variant from the inline style. */
  .surge-canvas {
    position: relative;
    overflow: hidden;
    background: #0c1117;
    color: #ffffff;
    font-family: "Inter", system-ui, sans-serif;
    box-sizing: border-box;
  }

  /* Hide MapLibre's on-canvas controls + attribution — this is a baked still. */
  .surge-canvas :global(.maplibregl-ctrl-top-left),
  .surge-canvas :global(.maplibregl-ctrl-top-right),
  .surge-canvas :global(.maplibregl-ctrl-bottom-left),
  .surge-canvas :global(.maplibregl-ctrl-bottom-right) {
    display: none !important;
  }

  /* ── Shared legend ───────────────────────────────────────────────────────── */
  .surge-legend {
    display: flex;
    gap: 28px;
    align-items: center;
  }
  .surge-leg-item {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    font-size: 24px;
    font-weight: 600;
    color: #b7c1cd;
  }
  .surge-swatch {
    width: 22px;
    height: 22px;
    border-radius: 999px;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.16) inset;
  }
  .surge-swatch--new {
    box-shadow: 0 0 0 1px rgba(255, 214, 170, 0.6) inset, 0 0 10px rgba(232, 121, 43, 0.5);
  }
  .surge-legend--tiny {
    gap: 18px;
  }
  .surge-legend--tiny .surge-leg-item {
    font-size: 17px;
    font-weight: 600;
    color: #93a0af;
    gap: 7px;
  }
  .surge-legend--tiny .surge-swatch {
    width: 14px;
    height: 14px;
  }

  /* ── Shared state strip / cards ──────────────────────────────────────────── */
  /* minmax(0, 1fr) on every track: a bare `1fr` has an implicit min of
     min-content, so the mini-map SVGs (which carry an intrinsic size) would push
     the tracks past the container and overflow. minmax(0,…) forces the tracks to
     obey the container's definite size and stay equal. */
  .surge-strip {
    display: grid;
    grid-template-columns: repeat(var(--scols), minmax(0, 1fr));
    gap: 16px;
  }
  .surge-card {
    background: #101822;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 12px;
    padding: 10px 10px 8px;
    display: flex;
    flex-direction: column;
  }
  .surge-card-map {
    flex: 1 1 auto;
    min-height: 0;
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

  /* ── Shared title / hero ─────────────────────────────────────────────────── */
  .surge-title {
    font-family: "Bitter", Georgia, serif;
    font-weight: 900;
    line-height: 1;
    letter-spacing: -0.01em;
    color: #ffffff;
  }
  .surge-sub {
    display: flex;
    align-items: baseline;
    gap: 14px;
  }
  .surge-count {
    font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
    font-variant-numeric: tabular-nums;
    font-weight: 500;
    line-height: 0.9;
    letter-spacing: -0.02em;
    color: #E8792B;
    text-shadow: 0 0 40px rgba(232, 121, 43, 0.35);
  }
  .surge-sub-text {
    font-weight: 600;
    color: #d7dee8;
  }
  .surge-strip-heading {
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #8a97a6;
  }

  /* ── Shared branding / watermark ─────────────────────────────────────────── */
  .surge-foot {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 24px;
  }
  .surge-source {
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
    font-weight: 800;
    letter-spacing: 0.02em;
    color: #BE6079;
  }
  .surge-url {
    font-weight: 600;
    color: #cbd5e1;
  }
  .surge-asof {
    color: #94a3b8;
  }
  .surge-watermark {
    position: absolute;
    right: 26px;
    bottom: 20px;
    z-index: 20;
    font-size: 22px;
    font-weight: 600;
    letter-spacing: 0.01em;
    color: rgba(255, 255, 255, 0.34);
    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
    pointer-events: none;
  }

  /* ══ card ════════════════════════════════════════════════════════════════ */
  /* Grid (not flex) so the body's 1fr row is a definite height — the nested
     state-strip's repeat(3,1fr) rows only resolve equally against a definite
     parent; a flex leftover leaves them auto-sizing to content and overflowing. */
  .surge--card {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto auto;
    row-gap: 18px;
    padding: 38px 48px 30px;
  }
  .surge--card .card-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 32px;
  }
  .surge--card .surge-title { font-size: 52px; }
  .surge--card .surge-sub { margin-top: 12px; }
  .surge--card .surge-count { font-size: 56px; }
  .surge--card .surge-sub-text { font-size: 30px; }
  .surge--card .surge-legend { margin-top: 8px; flex-shrink: 0; }

  .surge--card .card-body {
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 600px;
    grid-template-rows: minmax(0, 1fr);
    column-gap: 26px;
  }
  .surge--card .card-map {
    min-width: 0;
    position: relative;
    border-radius: 12px;
    overflow: hidden;
  }
  .surge--card .card-states {
    min-height: 0;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    row-gap: 12px;
  }
  .surge--card .surge-strip-heading { font-size: 19px; }
  .surge--card .card-states .surge-strip {
    min-height: 0;
    grid-template-rows: repeat(3, minmax(0, 1fr));
  }
  .surge--card .surge-source { max-width: 780px; font-size: 20px; }
  .surge--card .surge-wm { font-size: 30px; }
  .surge--card .surge-url { font-size: 21px; }
  .surge--card .surge-asof { font-size: 18px; }

  /* ══ states-portrait / states-landscape ═══════════════════════════════════ */
  .surge--states-portrait,
  .surge--states-landscape {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    row-gap: 22px;
    padding: 34px 38px 40px;
  }
  .states-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 40px;
  }
  .states-timeline {
    flex: 1 1 auto;
    max-width: 620px;
  }
  .states-grid {
    min-height: 0;
  }
  .surge--states-portrait .states-grid { grid-template-rows: repeat(3, minmax(0, 1fr)); }
  .surge--states-landscape .states-grid { grid-template-rows: repeat(2, minmax(0, 1fr)); }

  /* ══ nation ════════════════════════════════════════════════════════════════ */
  .surge--nation .nation-map {
    position: absolute;
    inset: 0;
  }
  .surge--nation .nation-legend {
    position: absolute;
    top: 24px;
    left: 28px;
    z-index: 20;
    padding: 9px 14px;
    border-radius: 10px;
    background: rgba(12, 17, 23, 0.55);
    backdrop-filter: blur(2px);
  }
  .surge--nation .nation-timeline {
    position: absolute;
    left: 40px;
    right: 40px;
    bottom: 34px;
    z-index: 20;
    padding: 14px 20px 12px;
    border-radius: 12px;
    background: rgba(12, 17, 23, 0.5);
    backdrop-filter: blur(2px);
  }
  .surge--nation .surge-watermark { bottom: 92px; }
</style>
