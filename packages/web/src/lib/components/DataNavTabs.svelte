<script lang="ts">
  // Shared tab bar across the four "explore the data beyond the national
  // map" pages (states index, rankings, compare, timeline). They stay
  // separate routes — Compare's ?states= links need to be shareable, and
  // each has its own SEO title/description — but this makes them read as
  // one destination with modes, not four disconnected nav concepts.
  import { page } from "$app/stores";
  import { localizeHref, deLocalizeHref } from "$lib/paraglide/runtime";
  import { m } from "$lib/paraglide/messages.js";

  const TABS = [
    { href: "/states", label: () => m.nav_states() },
    { href: "/leaderboard", label: () => m.nav_leaderboard() },
    { href: "/compare", label: () => m.nav_compare() },
    { href: "/timeline", label: () => m.nav_timeline() },
  ];

  $: basePath = deLocalizeHref($page.url.pathname);
  $: isActive = (href: string) => basePath === href || basePath.startsWith(href + "/");
</script>

<nav class="-mx-4 mb-8 flex gap-1 overflow-x-auto border-b px-4 sm:-mx-6 sm:px-6" style="border-color: var(--color-paper-200);" aria-label="Data views">
  {#each TABS as tab}
    <a
      href={localizeHref(tab.href)}
      class="shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold no-underline"
      style={isActive(tab.href)
        ? "border-color: #BE6079; color: var(--color-ink-900);"
        : "border-color: transparent; color: var(--color-ink-500);"}
      aria-current={isActive(tab.href) ? "page" : undefined}
    >{tab.label()}</a>
  {/each}
</nav>
