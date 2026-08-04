<script lang="ts">
  import type { StatesPageData, StateRow, AgencyRow } from "./+page.server";
  import { page } from "$app/stores";
  import { browser } from "$app/environment";
  import { localizeHref, getLocale } from "$lib/paraglide/runtime";
  import { m } from "$lib/paraglide/messages.js";
  import { MODEL_ORDER, MODEL_COLORS, MODEL_TEXT_COLORS, MODEL_SHORT } from "$lib/colors";
  import { ogImage } from "$lib/ogImage";

  export let data: StatesPageData;

  const localeTag = getLocale() === "es" ? "es-MX" : "en-US";
  const intFmt = new Intl.NumberFormat(localeTag);
  const popFmt = new Intl.NumberFormat(localeTag, { notation: "compact", maximumFractionDigits: 1 });
  const dateFmt = new Intl.DateTimeFormat(localeTag, { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

  $: title = m.browse_meta_title();
  $: description = m.browse_meta_description();

  type Mode = "states" | "agencies";

  // Read once from $page.url (correct on both SSR and hydration, unlike
  // onMount reading location.search — a shared ?view=agencies&sel=... link
  // used to render "states" first and flash to "agencies" post-hydration).
  const initialParams = $page.url.searchParams;
  const initialView = initialParams.get("view");
  let mode: Mode = initialView === "agencies" ? "agencies" : "states";
  const initialSel = initialParams.get("sel");
  const initialSelSet = new Set((initialSel ?? "").split(",").filter(Boolean));
  let selectedStates: Set<string> = mode === "states" ? initialSelSet : new Set();
  let selectedAgencies: Set<string> = mode === "agencies" ? initialSelSet : new Set();
  let query = "";
  let mounted = false;
  let dropdownOpen = false;

  const DISPLAY_CAP = 150;

  $: if (browser && !mounted) mounted = true;

  $: if (browser && mounted) {
    const params = new URLSearchParams();
    params.set("view", mode);
    const sel = mode === "agencies" ? selectedAgencies : selectedStates;
    if (sel.size) params.set("sel", [...sel].join(","));
    const qs = params.toString();
    history.replaceState(history.state, "", qs ? `?${qs}` : location.pathname);
  }

  function toggleSelection(set: Set<string>, id: string): Set<string> {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else if (next.size < 3) next.add(id);
    return next;
  }

  $: q = query.trim().toLowerCase();

  $: filteredStates = data.states.filter((s) => !q || s.stateName.toLowerCase().includes(q) || s.abbr.toLowerCase().includes(q));
  $: filteredAgenciesAll = data.agencies.filter((a) =>
    !q || a.name.toLowerCase().includes(q) || a.state.toLowerCase().includes(q),
  );
  $: agenciesTotal = filteredAgenciesAll.length;
  $: filteredAgencies = filteredAgenciesAll.slice(0, DISPLAY_CAP);

  $: compareStates = data.states.filter((s) => selectedStates.has(s.abbr));
  $: compareAgencies = data.agencies.filter((a) => selectedAgencies.has(a.slug));

  const localLePct = (row: StateRow): string | null => {
    if (!row.localLeAgencies) return null;
    return `${Math.round(((row.localParticipating ?? 0) / row.localLeAgencies) * 100)}%`;
  };

  function onOutsidePointer(e: PointerEvent) {
    if (!(e.target as HTMLElement).closest(".browse-search")) dropdownOpen = false;
  }

  function onWindowKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") dropdownOpen = false;
  }
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:image" content={ogImage('states.png')} />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="twitter:card" content="summary_large_image" />
  <meta property="twitter:image" content={ogImage('states.png')} />
</svelte:head>

<svelte:window on:pointerdown={onOutsidePointer} on:keydown={onWindowKeydown} />

<main id="main-content" class="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
  <p class="text-xs font-semibold uppercase tracking-widest" style="color: var(--color-ink-500);">{m.browse_eyebrow()}</p>
  <h1 class="mt-1 text-[length:var(--text-h1)] font-black" style="color: var(--color-ink-900);">{m.browse_title()}</h1>
  <p class="prose-editorial mt-3 max-w-xl">{m.browse_subtitle()}</p>
  {#if data.snapshotDate}
    <p class="mt-2 text-xs italic" style="color: var(--color-ink-500);">{m.browse_as_of({ date: dateFmt.format(new Date(data.snapshotDate)) })}</p>
  {/if}

  <!-- Mode toggle -->
  <div class="mt-6 flex gap-1 rounded-md border p-1" style="border-color: var(--color-paper-200); background: var(--color-paper-100); width: fit-content;">
    {#each [["states", m.browse_mode_states()], ["agencies", m.browse_mode_agencies()]] as [key, label]}
      <button
        type="button"
        on:click={() => { mode = key as Mode; query = ""; }}
        class="rounded px-3 py-1.5 text-sm font-semibold transition-colors"
        style={mode === key
          ? "background: var(--color-ink-900); color: #fff;"
          : "background: transparent; color: var(--color-ink-700);"}
      >{label}</button>
    {/each}
  </div>

  <!-- Search + inline checklist dropdown -->
  <div class="browse-search relative mt-3 max-w-sm">
    <svg class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style="color: var(--color-ink-500);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
    </svg>
    <input
      type="search"
      bind:value={query}
      on:focus={() => (dropdownOpen = true)}
      placeholder={mode === "states" ? m.browse_search_placeholder_states() : m.browse_search_placeholder_agencies()}
      class="w-full rounded-md border py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-1"
      style="border-color: var(--color-paper-200); background: var(--color-paper-50); color: var(--color-ink-900);"
    />

    {#if dropdownOpen}
      <ol class="absolute left-0 top-full z-20 mt-1.5 max-h-96 w-full overflow-y-auto rounded-md border shadow-lg" style="border-color: var(--color-paper-200); background: var(--color-paper-50);">
        {#if mode === "states"}
          {#if filteredStates.length === 0}
            <li class="py-6 text-center text-sm" style="color: var(--color-ink-500);">{m.browse_no_results()}</li>
          {/if}
          {#each filteredStates as row (row.abbr)}
            {@const checked = selectedStates.has(row.abbr)}
            <li>
              <label
                class="flex cursor-pointer items-center gap-3 border-b px-3 py-2.5 last:border-b-0"
                style="border-color: var(--color-paper-100); background: {checked ? 'var(--color-paper-100)' : 'transparent'};"
              >
                <input
                  type="checkbox"
                  {checked}
                  disabled={!checked && selectedStates.size >= 3}
                  on:change={() => (selectedStates = toggleSelection(selectedStates, row.abbr))}
                  class="h-4 w-4 shrink-0 rounded"
                />
                <a
                  href={localizeHref(`/state/${row.abbr.toLowerCase()}`)}
                  class="min-w-0 flex-1 no-underline hover:underline"
                  on:click|stopPropagation
                >
                  <p class="truncate text-sm font-semibold" style="color: var(--color-ink-900);">{row.stateName}</p>
                </a>
                <span class="shrink-0 font-mono text-xs tabular-nums" style="color: var(--color-ink-500);">
                  {intFmt.format(row.agencyCount)} {m.leaderboard_unit_agencies()}
                </span>
              </label>
            </li>
          {/each}
        {:else}
          {#if filteredAgencies.length === 0}
            <li class="py-6 text-center text-sm" style="color: var(--color-ink-500);">{m.browse_no_results()}</li>
          {/if}
          {#each filteredAgencies as row (row.slug)}
            {@const checked = selectedAgencies.has(row.slug)}
            <li>
              <label
                class="flex cursor-pointer items-center gap-3 border-b px-3 py-2.5 last:border-b-0"
                style="border-color: var(--color-paper-100); background: {checked ? 'var(--color-paper-100)' : 'transparent'};"
              >
                <input
                  type="checkbox"
                  {checked}
                  disabled={!checked && selectedAgencies.size >= 3}
                  on:change={() => (selectedAgencies = toggleSelection(selectedAgencies, row.slug))}
                  class="h-4 w-4 shrink-0 rounded"
                />
                <a
                  href={localizeHref(`/agency/${row.slug}`)}
                  class="min-w-0 flex-1 no-underline hover:underline"
                  on:click|stopPropagation
                >
                  <p class="truncate text-sm font-semibold" style="color: var(--color-ink-900);">{row.name}</p>
                  <p class="truncate text-xs" style="color: var(--color-ink-500);">{row.state}</p>
                </a>
                {#if row.primary_model}
                  <span class="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold" style="background: {MODEL_COLORS[row.primary_model]}; color: {MODEL_TEXT_COLORS[row.primary_model]};">{MODEL_SHORT[row.primary_model]}</span>
                {/if}
                <span class="shrink-0 font-mono text-xs tabular-nums" style="color: var(--color-ink-500);">
                  {row.officerCt ? `${intFmt.format(row.officerCt)} ${m.leaderboard_unit_officers()}` : "—"}
                </span>
              </label>
            </li>
          {/each}
          {#if agenciesTotal > DISPLAY_CAP}
            <li class="py-3 text-center text-xs italic" style="color: var(--color-ink-500);">
              {m.browse_result_count_capped({ shown: DISPLAY_CAP, total: intFmt.format(agenciesTotal) })}
            </li>
          {/if}
        {/if}
      </ol>
    {/if}
  </div>

  <!-- Selection bar -->
  {#if (mode === "states" ? selectedStates.size : selectedAgencies.size) > 0}
    {@const n = mode === "states" ? selectedStates.size : selectedAgencies.size}
    <div class="mt-3 flex items-center justify-between gap-3 rounded-md border px-3 py-2" style="border-color: #BE6079; background: var(--color-paper-100);">
      <span class="text-sm font-semibold" style="color: var(--color-ink-900);">{m.browse_selected_count({ count: n })}</span>
      <button
        type="button"
        on:click={() => { if (mode === "states") selectedStates = new Set(); else selectedAgencies = new Set(); }}
        class="text-xs font-semibold underline underline-offset-2"
        style="color: var(--color-ink-700);"
      >{m.browse_clear_selection()}</button>
    </div>
  {/if}

  <!-- Compare -->
  {#if mode === "states" && compareStates.length > 0}
    <section class="mt-10 border-t pt-8" style="border-color: var(--color-paper-200);">
      <h2 class="font-serif text-lg font-bold" style="color: var(--color-ink-900);">{m.browse_compare_heading({ count: compareStates.length })}</h2>
      <div class="compare-grid mt-4 grid grid-cols-1 gap-4" style="--cmp-cols: {compareStates.length};">
        {#each compareStates as row}
          <div class="rounded-lg border p-4" style="border-color: var(--color-paper-200); background: var(--color-paper-50);">
            <a href={localizeHref(`/state/${row.abbr.toLowerCase()}`)} class="font-serif text-lg font-bold no-underline hover:underline" style="color: var(--color-ink-900);">{row.stateName}</a>
            <dl class="mt-4 space-y-4">
              <div>
                <dt class="text-[10px] font-semibold uppercase tracking-wider" style="color: var(--color-ink-500);">{m.compare_stat_agencies()}</dt>
                <dd class="mt-0.5 font-mono text-xl font-bold tabular-nums" style="color: var(--color-ink-900);">{intFmt.format(row.agencyCount)}</dd>
              </div>
              {#if row.populationServed}
                <div>
                  <dt class="text-[10px] font-semibold uppercase tracking-wider" style="color: var(--color-ink-500);">{m.compare_stat_population()}</dt>
                  <dd class="mt-0.5 font-mono text-xl font-bold tabular-nums" style="color: var(--color-ink-900);">{popFmt.format(row.populationServed)}</dd>
                </div>
              {/if}
              {#if localLePct(row)}
                <div>
                  <dt class="text-[10px] font-semibold uppercase tracking-wider" style="color: var(--color-ink-500);">{m.compare_stat_participation()}</dt>
                  <dd class="mt-0.5 font-mono text-xl font-bold tabular-nums" style="color: var(--color-ink-900);">{localLePct(row)}</dd>
                </div>
              {/if}
              <div>
                <dt class="text-[10px] font-semibold uppercase tracking-wider" style="color: var(--color-ink-500);">{m.compare_stat_models()}</dt>
                <dd class="mt-1.5 space-y-1">
                  {#each MODEL_ORDER as model}
                    {#if row.modelCounts[model]}
                      <div class="flex items-center justify-between gap-2 text-xs">
                        <span class="rounded px-1.5 py-0.5 font-semibold" style="background: {MODEL_COLORS[model]}; color: {MODEL_TEXT_COLORS[model]};">{MODEL_SHORT[model]}</span>
                        <span class="font-mono tabular-nums" style="color: var(--color-ink-700);">{row.modelCounts[model]}</span>
                      </div>
                    {/if}
                  {/each}
                </dd>
              </div>
            </dl>
          </div>
        {/each}
      </div>
    </section>
  {:else if mode === "agencies" && compareAgencies.length > 0}
    <section class="mt-10 border-t pt-8" style="border-color: var(--color-paper-200);">
      <h2 class="font-serif text-lg font-bold" style="color: var(--color-ink-900);">{m.browse_compare_heading({ count: compareAgencies.length })}</h2>
      <div class="compare-grid mt-4 grid grid-cols-1 gap-4" style="--cmp-cols: {compareAgencies.length};">
        {#each compareAgencies as row}
          <div class="rounded-lg border p-4" style="border-color: var(--color-paper-200); background: var(--color-paper-50);">
            <a href={localizeHref(`/agency/${row.slug}`)} class="font-serif text-base font-bold leading-tight no-underline hover:underline" style="color: var(--color-ink-900);">{row.name}</a>
            <p class="mt-0.5 text-xs" style="color: var(--color-ink-500);">{row.state}</p>
            <dl class="mt-4 space-y-4">
              <div>
                <dt class="text-[10px] font-semibold uppercase tracking-wider" style="color: var(--color-ink-500);">{m.leaderboard_unit_officers()}</dt>
                <dd class="mt-0.5 font-mono text-xl font-bold tabular-nums" style="color: var(--color-ink-900);">{row.officerCt ? intFmt.format(row.officerCt) : "—"}</dd>
              </div>
              {#if row.population}
                <div>
                  <dt class="text-[10px] font-semibold uppercase tracking-wider" style="color: var(--color-ink-500);">{m.browse_agency_population()}</dt>
                  <dd class="mt-0.5 font-mono text-xl font-bold tabular-nums" style="color: var(--color-ink-900);">{popFmt.format(row.population)}</dd>
                </div>
              {/if}
              {#if row.primary_model}
                <div>
                  <dt class="text-[10px] font-semibold uppercase tracking-wider" style="color: var(--color-ink-500);">{m.browse_agency_model_label()}</dt>
                  <dd class="mt-1">
                    <span class="rounded px-1.5 py-0.5 text-xs font-semibold" style="background: {MODEL_COLORS[row.primary_model]}; color: {MODEL_TEXT_COLORS[row.primary_model]};">{MODEL_SHORT[row.primary_model]}</span>
                  </dd>
                </div>
              {/if}
            </dl>
          </div>
        {/each}
      </div>
    </section>
  {/if}
</main>

<style>
  @media (min-width: 640px) {
    .compare-grid {
      grid-template-columns: repeat(var(--cmp-cols), minmax(0, 1fr));
    }
  }
</style>
