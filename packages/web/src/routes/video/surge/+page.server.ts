// ── /video/surge — "old vs new" 287(g) surge graphic (feat/surge-map-graphic) ─
// A fixed-size dark canvas for an email/social still + GIF: a national map (dots
// colored by whether the agency signed on or after SURGE_THRESHOLD) above a
// strip of six zoomed single-state mini-maps. Reuses buildHomeData for the
// national map + headline numbers; builds the strip geometry server-side (the
// same WebGL-free path the /states index uses) so the client just draws it.
import { buildHomeData } from "$lib/server/homeData";
import { getStateGeometry, projectDot } from "$lib/server/stateMaps";
import { STATE_NAMES } from "$lib/states";
import type { HomeAgency } from "$lib/homeData.types";

// NEW = signed on or after this date. ISO strings compare lexically.
export const SURGE_THRESHOLD = "2026-04-01";
export const OLD_COLOR = "#64748b"; // slate
export const NEW_COLOR = "#E8792B"; // orange

// Top six states by April–June 2026 signings (given), fixed for the strip.
const STRIP_STATES = ["TX", "AR", "OK", "PA", "MO", "LA"] as const;

export type SurgeDot = { x: number; y: number; c: string; o: number; n: boolean; s: number };
export type SurgeStrip = {
  abbr: string;
  name: string;
  newCount: number;
  w: number;
  h: number;
  outline: string;
  highways: string[];
  dots: SurgeDot[];
};

const isNew = (d?: string | null): boolean => !!d && d.length >= 10 && d >= SURGE_THRESHOLD;
const dayNum = (d: string): number => Date.parse(d + "T00:00:00Z") / 86_400_000;

export const load = async ({ fetch }) => {
  const home = await buildHomeData(fetch);
  const geometry = await getStateGeometry(fetch);

  // National new-signing count (headline) + newest new-signing date, so the
  // strip's reveal sweep (`s`) shares the national map's [threshold → newest]
  // window and the two animate in sync.
  let newCount = 0;
  let newMax = SURGE_THRESHOLD;
  for (const a of home.agencies) {
    if (isNew(a.signed_date)) {
      newCount++;
      if (a.signed_date! > newMax) newMax = a.signed_date!;
    }
  }
  const spanDays = Math.max(1, dayNum(newMax) - dayNum(SURGE_THRESHOLD));
  const seqOf = (d?: string | null): number =>
    isNew(d) ? Math.min(1, Math.max(0, (dayNum(d!) - dayNum(SURGE_THRESHOLD)) / spanDays)) : 0;

  const byState = new Map<string, HomeAgency[]>();
  for (const a of home.agencies) {
    if (a.lat == null || a.lng == null) continue;
    const arr = byState.get(a.state) ?? [];
    arr.push(a);
    byState.set(a.state, arr);
  }

  const strip: SurgeStrip[] = STRIP_STATES.flatMap((abbr) => {
    const g = geometry[abbr];
    if (!g) return [];
    let stateNew = 0;
    const dots: SurgeDot[] = (byState.get(abbr) ?? []).map((a) => {
      const [x, y] = projectDot(g, abbr, a.lng!, a.lat!);
      const n = isNew(a.signed_date);
      if (n) stateNew++;
      return { x, y, c: n ? NEW_COLOR : OLD_COLOR, o: a.lee?.officer_ct ?? 0, n, s: seqOf(a.signed_date) };
    });
    // Draw new (orange) dots last so the surge reads on top of the baseline.
    dots.sort((p, q) => Number(p.n) - Number(q.n));
    return [{ abbr, name: STATE_NAMES[abbr] ?? abbr, newCount: stateNew, w: g.w, h: g.h, outline: g.outline, highways: g.highways, dots }];
  });

  return {
    agencies: home.agencies,
    snapshotDate: home.snapshotDate,
    threshold: SURGE_THRESHOLD,
    oldColor: OLD_COLOR,
    newColor: NEW_COLOR,
    newCount,
    strip,
  };
};
