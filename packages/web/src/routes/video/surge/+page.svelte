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
  //   card  is now 9:16 VERTICAL (story/portrait) — 1080×1920.
  //   nation is bumped up for a crisper standalone map.
  // `mdot` is the per-variant mini-map dot bump (the flat radius pop passed to
  // StateMiniMap; see the NAT_DOT_BUMP note below): the standalone states GIFs
  // run a touch smaller than the card strip so the orange field doesn't crowd at
  // the larger cell size.
  const DIMS: Record<string, { w: number; h: number; scols: number; dot: number; mdot: number }> = {
    card: { w: 1080, h: 1920, scols: 2, dot: 1.15, mdot: 0.45 },
    "states-portrait": { w: 1080, h: 1440, scols: 2, dot: 1, mdot: 0.2 },
    "states-landscape": { w: 1500, h: 1000, scols: 3, dot: 1, mdot: 0.2 },
    nation: { w: 1280, h: 800, scols: 2, dot: 1.25, mdot: 0 },
  };

  // Flat radius "pop" applied to the surge dots (see NationalMap / StateMiniMap):
  // NAT_DOT_BUMP is in screen px on the WebGL map; the mini-map bump (DIMS.mdot)
  // is in the mini maps' ~120-unit viewBox (so a smaller number lands ~the same
  // on screen).
  const NAT_DOT_BUMP = 1.5;
  $: variant = (() => {
    const v = $page.url.searchParams.get("variant") ?? "card";
    return v in DIMS ? v : "card";
  })();
  $: dims = DIMS[variant];
  $: hasNationalMap = variant === "card" || variant === "nation";
  $: isStates = variant === "states-portrait" || variant === "states-landscape";
  // Portrait is a phone/story asset: give it the full-size (non-tiny) legend and
  // the full (non-compact) timeline so both stay legible at mobile size.
  $: bigStates = variant === "states-portrait";

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
    // Fast-preview hook: ?p=0.5 statically renders the reveal at that progress on
    // load (seek + hold, no bake), so a single screenshot captures any frame.
    const pParam = $page.url.searchParams.get("p");
    if (pParam !== null && pParam !== "") {
      const p = Number(pParam);
      if (!Number.isNaN(p)) revealProgress = clamp01(p);
    }
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
    <!-- ── card: 9:16 vertical full composition ─────────────────────────────── -->
    <header class="card-head">
      <div class="surge-title">{m.surge_title()}</div>
      <div class="surge-sub">
        <span class="surge-count">{intFmt(localeTag, data.newCount)}</span>
        <span class="surge-sub-text">{m.surge_subtitle()}</span>
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

    <div class="card-map">
      <NationalMap
        agencies={data.agencies}
        lower48
        dotScale={dims.dot}
        dotBump={NAT_DOT_BUMP}
        colorMode="newOld"
        newOldThreshold={data.threshold}
        newColor={data.newColor}
        oldColor={data.oldColor}
        {revealProgress}
        onReady={onMapReady}
      />
    </div>

    <div class="card-timeline">
      <SurgeTimeline progress={revealProgress} threshold={data.threshold} newMax={data.newMax} {localeTag} />
    </div>

    <div class="card-states">
      <div class="surge-strip-heading">{m.surge_strip_heading()}</div>
      <div class="surge-strip">
        {#each data.strip as s}
          <div class="surge-card">
            <div class="surge-card-map">
              <StateMiniMap id={`surge-${s.abbr}`} w={s.w} h={s.h} outline={s.outline} highways={s.highways} dots={s.dots} dark reveal={revealProgress} dotBump={dims.mdot} label={s.name} />
            </div>
            <div class="surge-card-label">
              <span class="surge-card-abbr">{s.abbr}</span>
              <span class="surge-card-new">+{intFmt(localeTag, s.newCount)}</span>
            </div>
          </div>
        {/each}
      </div>
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
    <div class="states-top" class:states-top--stacked={bigStates}>
      <div class="surge-legend" class:surge-legend--tiny={!bigStates} aria-hidden="true">
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
        <SurgeTimeline progress={revealProgress} threshold={data.threshold} newMax={data.newMax} {localeTag} compact={!bigStates} />
      </div>
    </div>

    <div class="surge-strip states-grid">
      {#each data.strip as s}
        <div class="surge-card">
          <div class="surge-card-map">
            <StateMiniMap id={`surge-${s.abbr}`} w={s.w} h={s.h} outline={s.outline} highways={s.highways} dots={s.dots} dark reveal={revealProgress} dotBump={dims.mdot} label={s.name} />
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
    <!-- ── nation: national map + a clear timeline band (zero overlaps) ──────── -->
    <div class="nation-map">
      <NationalMap
        agencies={data.agencies}
        lower48
        dotScale={dims.dot}
        dotBump={NAT_DOT_BUMP}
        colorMode="newOld"
        newOldThreshold={data.threshold}
        newColor={data.newColor}
        oldColor={data.oldColor}
        {revealProgress}
        onReady={onMapReady}
      />
      <!-- Watermark tucked into the empty top-right (Atlantic) corner. -->
      <div class="surge-watermark">287g.recoveredfactory.net</div>
    </div>
    <div class="nation-band">
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
      <div class="nation-timeline">
        <SurgeTimeline progress={revealProgress} threshold={data.threshold} newMax={data.newMax} {localeTag} />
      </div>
    </div>
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

  /* ══ card — 9:16 vertical (story/portrait) ═══════════════════════════════ */
  /* Vertical stack: header · national map (fixed height) · timeline · state
     strip (fills) · footer. The strip row is 1fr (a definite height) so its
     nested repeat(3,1fr) cards divide evenly instead of overflowing. */
  .surge--card {
    display: grid;
    grid-template-rows: auto 600px auto minmax(0, 1fr) auto;
    row-gap: 26px;
    padding: 46px 48px 40px;
  }
  .surge--card .card-head {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .surge--card .surge-title { font-size: 54px; }
  .surge--card .surge-sub { align-items: baseline; flex-wrap: wrap; row-gap: 6px; }
  .surge--card .surge-count { font-size: 72px; }
  .surge--card .surge-sub-text { font-size: 31px; }
  .surge--card .surge-legend { gap: 40px; }

  .surge--card .card-map {
    min-width: 0;
    position: relative;
    border-radius: 14px;
    overflow: hidden;
    background: #0c1117;
  }
  .surge--card .card-timeline { padding: 0 4px; }
  .surge--card .card-states {
    min-height: 0;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    row-gap: 14px;
  }
  .surge--card .surge-strip-heading { font-size: 24px; }
  .surge--card .card-states .surge-strip {
    min-height: 0;
    grid-template-rows: repeat(3, minmax(0, 1fr));
    gap: 18px;
  }
  .surge--card .surge-source { max-width: 620px; font-size: 21px; }
  .surge--card .surge-wm { font-size: 32px; }
  .surge--card .surge-url { font-size: 22px; }
  .surge--card .surge-asof { font-size: 18px; }

  /* ══ states-portrait / states-landscape ═══════════════════════════════════ */
  .surge--states-portrait,
  .surge--states-landscape {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    row-gap: 22px;
    padding: 34px 38px 40px;
  }
  /* Landscape (3×2) packs 2 card rows into 1000px, so the bottom row runs down
     toward the corner watermark. Extra bottom padding lifts the grid clear of it
     (portrait's 3 rows already leave room, so it keeps the base 40px). */
  .surge--states-landscape { padding-bottom: 68px; }
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

  /* Portrait is a phone/story asset: stack the legend over a full-width timeline
     and pump the type up so both read comfortably at mobile size. */
  .states-top--stacked {
    flex-direction: column;
    align-items: stretch;
    gap: 22px;
  }
  .states-top--stacked .states-timeline { max-width: none; }
  .surge--states-portrait .states-top .surge-legend { gap: 48px; }
  .surge--states-portrait .states-top .surge-leg-item { font-size: 30px; }
  .surge--states-portrait .states-top .surge-swatch { width: 26px; height: 26px; }
  /* Reach into the (non-compact) timeline and scale it up for the phone frame. */
  .surge--states-portrait :global(.states-timeline .tl-track) { height: 6px; }
  .surge--states-portrait :global(.states-timeline .tl-marker) { width: 21px; height: 21px; }
  .surge--states-portrait :global(.states-timeline .tl-tick) { height: 16px; width: 3px; }
  .surge--states-portrait :global(.states-timeline .tl-label) { font-size: 29px; }
  .surge--states-portrait :global(.states-timeline .tl-labels) { height: 52px; margin-top: 14px; }

  /* Landscape's legend + timeline read too small ("squinty") when the 1500px
     canvas is shown at the post's ~672px column width — enlarge both so they stay
     legible at that scale (kept trim enough that the side-by-side row won't wrap). */
  .surge--states-landscape .states-top { gap: 28px; }
  .surge--states-landscape .states-top .surge-legend { gap: 24px; }
  .surge--states-landscape .states-top .surge-leg-item { font-size: 28px; gap: 11px; color: #b7c1cd; }
  .surge--states-landscape .states-top .surge-swatch { width: 23px; height: 23px; }
  .surge--states-landscape .states-top .states-timeline { max-width: 640px; }
  .surge--states-landscape :global(.states-timeline .tl-track) { height: 6px; }
  .surge--states-landscape :global(.states-timeline .tl-marker) { width: 21px; height: 21px; }
  .surge--states-landscape :global(.states-timeline .tl-tick) { height: 17px; width: 3px; }
  .surge--states-landscape :global(.states-timeline .tl-label) { font-size: 32px; }
  .surge--states-landscape :global(.states-timeline .tl-labels) { height: 58px; margin-top: 13px; }

  /* ══ nation — map + a dedicated timeline band (zero overlaps) ═════════════ */
  /* Two rows: the map fills the top, the legend + timeline live in their own
     solid band beneath it — the scrubber never sits over the country. */
  .surge--nation {
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
  }
  .surge--nation .nation-map {
    position: relative;
    min-height: 0;
  }
  .surge--nation .nation-band {
    display: flex;
    align-items: center;
    gap: 48px;
    padding: 20px 40px 26px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    background: #0c1117;
  }
  .surge--nation .nation-band .surge-legend { flex-shrink: 0; }
  .surge--nation .nation-timeline { flex: 1 1 auto; min-width: 0; }
  /* Watermark tucked into the empty top-right (Atlantic) corner of the map. */
  .surge--nation .surge-watermark { top: 22px; right: 30px; bottom: auto; }

  /* Nation's legend + timeline were also too small at the hero's display width. */
  .surge--nation .nation-band .surge-leg-item { font-size: 30px; }
  .surge--nation .nation-band .surge-swatch { width: 26px; height: 26px; }
  .surge--nation :global(.nation-timeline .tl-track) { height: 6px; }
  .surge--nation :global(.nation-timeline .tl-marker) { width: 20px; height: 20px; }
  .surge--nation :global(.nation-timeline .tl-tick) { height: 16px; width: 3px; }
  .surge--nation :global(.nation-timeline .tl-label) { font-size: 30px; }
  .surge--nation :global(.nation-timeline .tl-labels) { height: 54px; margin-top: 12px; }
</style>
