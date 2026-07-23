<script lang="ts">
  // Static, WebGL-free state map: a light outline, a hint of highways clipped to
  // the border, and agency dots — all pre-projected server-side into the w×h
  // viewBox. Cheap enough to render as 53 small-multiples. See $lib/stateGeometry.
  export let w: number;
  export let h: number;
  export let outline: string;
  export let highways: string[] = [];
  // `c` = dot color, `o` = sworn-officer count (radius). `n`/`s` are only set by
  // the surge graphic (new/old coloring): n = "signed since threshold", s = the
  // dot's normalized signing order in [0,1] for the reveal sweep.
  export let dots: { x: number; y: number; c: string; o: number; n?: boolean; s?: number }[] = [];
  export let id: string; // unique per card, for the clipPath
  export let label = "";
  // Dark theme — for the surge graphic's dark composite. Off (default) keeps the
  // /states index card look byte-for-byte.
  export let dark = false;
  // Reveal progress 0→1 (surge graphic). At 0 only old dots show; at 1 every new
  // dot is fully in. Ignored for dots without an `n` flag (they stay fully on).
  export let reveal = 1;

  // Radius by sworn-officer count, à la the homepage map: sqrt scale, domain
  // capped at ~1,000 officers (sqrt ≈ 32). Big departments pop; rural sheriffs
  // stay a legible floor. A stand-in until county/jurisdiction shapes land.
  const R_MIN = 0.9;
  const R_MAX = 5;
  const radius = (officers: number) =>
    R_MIN + Math.min(1, Math.sqrt(Math.max(0, officers)) / 32) * (R_MAX - R_MIN);

  // Reveal sweep (mirrors NationalMap's newOld reveal): a soft leading edge in
  // signing order. p1 is referenced directly in the template so Svelte re-renders
  // the dots when `reveal` changes.
  const REVEAL_BAND = 0.32;
  const NEW_MIN_SCALE = 0.4;
  $: p1 = reveal * (1 + REVEAL_BAND);

  $: landFill = dark ? "#1b2736" : "#eef2f6";
  $: landStroke = dark ? "#38495f" : "#cbd5e1";
  $: hwStroke = dark ? "#3c4c62" : "#94a3b8";
  $: dotStroke = dark ? "rgba(8,12,18,0.55)" : "#ffffff";
</script>

<svg
  viewBox="0 0 {w} {h}"
  class="block h-full w-full"
  role="img"
  aria-label={label}
  preserveAspectRatio="xMidYMid meet"
>
  <!-- Land — also the clip source (referenced via <use> so the outline path
       isn't serialized twice). -->
  <path id="statemap-land-{id}" d={outline} fill={landFill} stroke={landStroke} stroke-width="0.8" stroke-linejoin="round" />
  <defs>
    <clipPath id="statemap-{id}"><use href="#statemap-land-{id}" /></clipPath>
  </defs>

  <!-- Highways, trimmed to the outline -->
  <g clip-path="url(#statemap-{id})">
    {#each highways as d}
      <path
        {d}
        fill="none"
        stroke={hwStroke}
        stroke-width="0.8"
        stroke-opacity="0.9"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    {/each}
  </g>

  <!-- Agency locations, sized by sworn-officer count -->
  {#each dots as dot}
    {@const lr = dot.n === true ? Math.max(0, Math.min(1, (p1 - (dot.s ?? 0)) / REVEAL_BAND)) : 1}
    <circle
      cx={dot.x}
      cy={dot.y}
      r={radius(dot.o) * (dot.n === true ? NEW_MIN_SCALE + (1 - NEW_MIN_SCALE) * lr : 1)}
      fill={dot.c}
      fill-opacity={lr}
      stroke={dotStroke}
      stroke-width="0.45"
    />
  {/each}
</svg>
