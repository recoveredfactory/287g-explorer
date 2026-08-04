<script lang="ts">
  import { localizeHref } from "$lib/paraglide/runtime";
  import { m } from "$lib/paraglide/messages.js";
  import { ogImage } from "$lib/ogImage";

  $: title = m.explore_meta_title();
  $: description = m.explore_meta_description();

  $: cards = [
    { href: "/states", title: m.explore_card_states_title(), body: m.explore_card_states_body() },
    { href: "/leaderboard", title: m.explore_card_leaderboard_title(), body: m.explore_card_leaderboard_body() },
    { href: "/compare", title: m.explore_card_compare_title(), body: m.explore_card_compare_body() },
    { href: "/timeline", title: m.explore_card_timeline_title(), body: m.explore_card_timeline_body() },
  ];
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:image" content={ogImage('explore.png')} />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="twitter:card" content="summary_large_image" />
  <meta property="twitter:image" content={ogImage('explore.png')} />
</svelte:head>

<main id="main-content" class="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
  <p class="text-xs font-semibold uppercase tracking-widest" style="color: var(--color-ink-500);">{m.explore_eyebrow()}</p>
  <h1 class="mt-1 text-[length:var(--text-h1)] font-black" style="color: var(--color-ink-900);">{m.explore_title()}</h1>
  <p class="prose-editorial mt-3 max-w-xl">{m.explore_subtitle()}</p>

  <div class="mt-8 grid gap-4 sm:grid-cols-2">
    {#each cards as card}
      <a
        href={localizeHref(card.href)}
        class="group flex flex-col rounded-lg border p-5 no-underline shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        style="border-color: var(--color-paper-200); background: var(--color-paper-50);"
      >
        <h2 class="font-serif text-lg font-bold" style="color: var(--color-ink-900);">
          {card.title}
          <span aria-hidden="true" class="ml-1 inline-block transition-transform group-hover:translate-x-0.5">→</span>
        </h2>
        <p class="mt-1.5 text-sm leading-relaxed" style="color: var(--color-ink-700);">{card.body}</p>
      </a>
    {/each}
  </div>
</main>
