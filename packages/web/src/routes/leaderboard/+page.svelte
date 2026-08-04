<script lang="ts">
  import type { LeaderboardData } from "./+page.server";
  import { localizeHref, getLocale } from "$lib/paraglide/runtime";
  import { m } from "$lib/paraglide/messages.js";
  import { MODEL_COLORS, MODEL_TEXT_COLORS, MODEL_SHORT } from "$lib/colors";
  import { ogImage } from "$lib/ogImage";
  import DataNavTabs from "$lib/components/DataNavTabs.svelte";

  export let data: LeaderboardData;

  const localeTag = getLocale() === "es" ? "es-MX" : "en-US";
  const intFmt = new Intl.NumberFormat(localeTag);
  const popFmt = new Intl.NumberFormat(localeTag, { notation: "compact", maximumFractionDigits: 1 });
  const dateFmt = new Intl.DateTimeFormat(localeTag, { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

  $: title = m.leaderboard_meta_title();
  $: description = m.leaderboard_meta_description();
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:image" content={ogImage('leaderboard.png')} />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="twitter:card" content="summary_large_image" />
  <meta property="twitter:image" content={ogImage('leaderboard.png')} />
</svelte:head>

{#snippet rankList(rows: { key: string; href: string; label: string; sub?: string; value: string; badge?: { label: string; bg: string; fg: string } }[])}
  <ol class="mt-4 divide-y" style="border-color: var(--color-paper-100);">
    {#each rows as row, i}
      <li class="flex items-center gap-3 py-2.5">
        <span class="w-6 shrink-0 text-right font-mono text-sm tabular-nums" style="color: var(--color-ink-500);">{i + 1}</span>
        <a href={row.href} class="min-w-0 flex-1 no-underline hover:underline">
          <p class="truncate text-sm font-semibold" style="color: var(--color-ink-900);">{row.label}</p>
          {#if row.sub}<p class="truncate text-xs" style="color: var(--color-ink-500);">{row.sub}</p>{/if}
        </a>
        {#if row.badge}
          <span class="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold" style="background: {row.badge.bg}; color: {row.badge.fg};">{row.badge.label}</span>
        {/if}
        <span class="shrink-0 font-mono text-sm font-semibold tabular-nums" style="color: var(--color-ink-900);">{row.value}</span>
      </li>
    {/each}
  </ol>
{/snippet}

<main id="main-content" class="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
  <DataNavTabs />
  <p class="text-xs font-semibold uppercase tracking-widest" style="color: var(--color-ink-500);">{m.leaderboard_eyebrow()}</p>
  <h1 class="mt-1 text-[length:var(--text-h1)] font-black" style="color: var(--color-ink-900);">{m.leaderboard_title()}</h1>
  <p class="prose-editorial mt-3 max-w-xl">{m.leaderboard_subtitle()}</p>
  {#if data.snapshotDate}
    <p class="mt-2 text-xs italic" style="color: var(--color-ink-500);">{m.leaderboard_as_of({ date: dateFmt.format(new Date(data.snapshotDate)) })}</p>
  {/if}

  <section class="mt-10 border-t pt-8" style="border-color: var(--color-paper-200);">
    <h2 class="font-serif text-lg font-bold sm:text-xl" style="color: var(--color-ink-900);">{m.leaderboard_section_agencies_officers()}</h2>
    {@render rankList(
      data.topAgenciesByOfficers.map((a) => ({
        key: a.slug,
        href: localizeHref(`/agency/${a.slug}`),
        label: a.name,
        sub: a.state,
        value: `${intFmt.format(a.value)} ${m.leaderboard_unit_officers()}`,
        badge: a.primary_model
          ? { label: MODEL_SHORT[a.primary_model] ?? a.primary_model, bg: MODEL_COLORS[a.primary_model] ?? "#e2e8f0", fg: MODEL_TEXT_COLORS[a.primary_model] ?? "#0f172a" }
          : undefined,
      })),
    )}
    <p class="mt-3 text-xs italic" style="color: var(--color-ink-500);">{m.leaderboard_source_lee()}</p>
  </section>

  <section class="mt-10 border-t pt-8" style="border-color: var(--color-paper-200);">
    <h2 class="font-serif text-lg font-bold sm:text-xl" style="color: var(--color-ink-900);">{m.leaderboard_section_states_population()}</h2>
    {@render rankList(
      data.topStatesByPopulation.map((s) => ({
        key: s.abbr,
        href: localizeHref(`/state/${s.abbr.toLowerCase()}`),
        label: s.stateName,
        value: popFmt.format(s.value),
      })),
    )}
  </section>

  <section class="mt-10 border-t pt-8" style="border-color: var(--color-paper-200);">
    <h2 class="font-serif text-lg font-bold sm:text-xl" style="color: var(--color-ink-900);">{m.leaderboard_section_states_agencies()}</h2>
    {@render rankList(
      data.topStatesByAgencyCount.map((s) => ({
        key: s.abbr,
        href: localizeHref(`/state/${s.abbr.toLowerCase()}`),
        label: s.stateName,
        value: `${intFmt.format(s.value)} ${m.leaderboard_unit_agencies()}`,
      })),
    )}
  </section>

  <section class="mt-10 border-t pt-8" style="border-color: var(--color-paper-200);">
    <h2 class="font-serif text-lg font-bold sm:text-xl" style="color: var(--color-ink-900);">{m.leaderboard_section_states_participation()}</h2>
    {@render rankList(
      data.topStatesByParticipationPct.map((s) => ({
        key: s.abbr,
        href: localizeHref(`/state/${s.abbr.toLowerCase()}`),
        label: s.stateName,
        value: `${s.value}%`,
      })),
    )}
  </section>
</main>
