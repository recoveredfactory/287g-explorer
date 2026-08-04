<script lang="ts">
  import type { CompareData } from "./+page.server";
  import { goto } from "$app/navigation";
  import { localizeHref, getLocale } from "$lib/paraglide/runtime";
  import { m } from "$lib/paraglide/messages.js";
  import { NAVIGABLE_STATES } from "$lib/states";
  import { MODEL_ORDER, MODEL_COLORS, MODEL_TEXT_COLORS, MODEL_SHORT } from "$lib/colors";
  import { ogImage } from "$lib/ogImage";
  import DataNavTabs from "$lib/components/DataNavTabs.svelte";

  export let data: CompareData;

  const localeTag = getLocale() === "es" ? "es-MX" : "en-US";
  const intFmt = new Intl.NumberFormat(localeTag);
  const popFmt = new Intl.NumberFormat(localeTag, { notation: "compact", maximumFractionDigits: 1 });
  const dateFmt = new Intl.DateTimeFormat(localeTag, { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

  $: title = m.compare_meta_title();
  $: description = m.compare_meta_description();

  $: allAbbrs = Object.keys(NAVIGABLE_STATES).sort((a, b) =>
    NAVIGABLE_STATES[a].localeCompare(NAVIGABLE_STATES[b]),
  );

  function updateSelection(next: string[]) {
    const qs = next.length ? `?states=${next.join(",")}` : "";
    goto(`${localizeHref("/compare")}${qs}`, { keepFocus: true, noScroll: true });
  }

  function addState(abbr: string) {
    if (!abbr || data.selected.includes(abbr) || data.selected.length >= 3) return;
    updateSelection([...data.selected, abbr]);
  }

  function removeState(abbr: string) {
    updateSelection(data.selected.filter((a) => a !== abbr));
  }

  const localLePct = (row: CompareData["rows"][number]): string | null => {
    if (!row.localLeAgencies) return null;
    const pct = Math.round(((row.localParticipating ?? 0) / row.localLeAgencies) * 100);
    return `${pct}%`;
  };
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:image" content={ogImage('compare.png')} />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="twitter:card" content="summary_large_image" />
  <meta property="twitter:image" content={ogImage('compare.png')} />
</svelte:head>

<main id="main-content" class="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
  <DataNavTabs />
  <p class="text-xs font-semibold uppercase tracking-widest" style="color: var(--color-ink-500);">{m.compare_eyebrow()}</p>
  <h1 class="mt-1 text-[length:var(--text-h1)] font-black" style="color: var(--color-ink-900);">{m.compare_title()}</h1>
  <p class="prose-editorial mt-3 max-w-xl">{m.compare_subtitle()}</p>

  <!-- Picker -->
  <div class="mt-6 flex flex-wrap items-center gap-2">
    {#each data.selected as abbr}
      <button
        type="button"
        on:click={() => removeState(abbr)}
        aria-label={m.compare_remove({ state: NAVIGABLE_STATES[abbr] })}
        class="flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs font-semibold text-white"
        style="background: var(--color-ink-900); border-color: var(--color-ink-900);"
      >
        {NAVIGABLE_STATES[abbr]}
        <span aria-hidden="true" class="opacity-70">×</span>
      </button>
    {/each}
    {#if data.selected.length < 3}
      <select
        class="rounded-md border py-1.5 pl-3 pr-7 text-sm focus:outline-none focus:ring-1"
        style="border-color: var(--color-paper-200); background: var(--color-paper-50); color: var(--color-ink-700);"
        aria-label={m.compare_picker_label()}
        on:change={(e) => { addState(e.currentTarget.value); e.currentTarget.value = ""; }}
      >
        <option value="">{m.compare_picker_label()}</option>
        {#each allAbbrs.filter((a) => !data.selected.includes(a)) as abbr}
          <option value={abbr}>{NAVIGABLE_STATES[abbr]}</option>
        {/each}
      </select>
      <span class="text-xs" style="color: var(--color-ink-500);">{m.compare_max_note()}</span>
    {/if}
  </div>

  {#if data.snapshotDate}
    <p class="mt-2 text-xs italic" style="color: var(--color-ink-500);">{m.compare_as_of({ date: dateFmt.format(new Date(data.snapshotDate)) })}</p>
  {/if}

  <!-- Results -->
  {#if data.rows.length === 0}
    <div class="mt-8 rounded-lg border px-6 py-10 text-center" style="border-color: var(--color-paper-200); background: var(--color-paper-50);">
      <p class="font-medium" style="color: var(--color-ink-700);">{m.compare_empty_title()}</p>
    </div>
  {:else}
    <div
      class="compare-grid mt-8 grid grid-cols-1 gap-4"
      style="--cmp-cols: {data.rows.length};"
    >
      {#each data.rows as row}
        <div class="rounded-lg border p-4" style="border-color: var(--color-paper-200); background: var(--color-paper-50);">
          <a
            href={localizeHref(`/state/${row.abbr.toLowerCase()}`)}
            class="font-serif text-lg font-bold no-underline hover:underline"
            style="color: var(--color-ink-900);"
          >{row.stateName}</a>

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
  {/if}
</main>

<style>
  /* Stacked cards on mobile; side-by-side columns once there's room. Column
     count is dynamic (1-3 selected states), so this uses the --cmp-cols
     custom property rather than a fixed Tailwind grid-cols-N class. */
  @media (min-width: 640px) {
    .compare-grid {
      grid-template-columns: repeat(var(--cmp-cols), minmax(0, 1fr));
    }
  }
</style>
