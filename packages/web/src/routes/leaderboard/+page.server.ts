import { NAVIGABLE_STATES } from "$lib/states";
import type { Agency, StateMeta } from "$lib/homeData.types";

export type AgencyRankRow = {
  slug: string;
  name: string;
  state: string;
  primary_model: string;
  value: number;
};

export type StateRankRow = {
  abbr: string;
  stateName: string;
  value: number;
};

export type LeaderboardData = {
  snapshotDate: string | null;
  topAgenciesByOfficers: AgencyRankRow[];
  topStatesByPopulation: StateRankRow[];
  topStatesByAgencyCount: StateRankRow[];
  topStatesByParticipationPct: StateRankRow[];
};

const TOP_N = 20;

export const load = async ({ fetch }): Promise<LeaderboardData> => {
  const [agenciesRes, metaRes] = await Promise.all([
    fetch("/data/dist/agency_index.json"),
    fetch("/data/dist/state_meta.json"),
  ]);
  const agencies: Agency[] = agenciesRes.ok ? await agenciesRes.json() : [];
  const stateMetaArr: StateMeta[] = metaRes.ok ? await metaRes.json() : [];

  const snapshotDate =
    agencies
      .map((a) => a.snapshot_date)
      .filter((v): v is string => Boolean(v))
      .sort()
      .at(-1) ?? null;

  // Largest departments by sworn-officer count. ORI-deduped so a county
  // sheriff's office and that county's separately-listed corrections
  // department (sharing one FBI ORI) don't both claim the same officer count
  // as if they were distinct agencies.
  const oriSeen = new Set<string>();
  const topAgenciesByOfficers: AgencyRankRow[] = agencies
    .filter((a) => {
      if (!a.ori) return true;
      if (oriSeen.has(a.ori)) return false;
      oriSeen.add(a.ori);
      return true;
    })
    .filter((a) => (a.lee?.officer_ct ?? 0) > 0)
    .sort((a, b) => (b.lee?.officer_ct ?? 0) - (a.lee?.officer_ct ?? 0))
    .slice(0, TOP_N)
    .map((a) => ({
      slug: a.slug,
      name: a.name,
      state: a.state,
      primary_model: a.primary_model,
      value: a.lee?.officer_ct ?? 0,
    }));

  const abbrs = Object.keys(NAVIGABLE_STATES);
  const metaByState = new Map(stateMetaArr.map((s) => [s.state, s]));
  const agencyCountByState = new Map<string, number>();
  for (const a of agencies) {
    agencyCountByState.set(a.state, (agencyCountByState.get(a.state) ?? 0) + 1);
  }

  const topStatesByPopulation: StateRankRow[] = abbrs
    .map((abbr) => ({
      abbr,
      stateName: NAVIGABLE_STATES[abbr],
      value: metaByState.get(abbr)?.population_served ?? 0,
    }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, TOP_N);

  const topStatesByAgencyCount: StateRankRow[] = abbrs
    .map((abbr) => ({
      abbr,
      stateName: NAVIGABLE_STATES[abbr],
      value: agencyCountByState.get(abbr) ?? 0,
    }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, TOP_N);

  // % of local (County/Municipality) law enforcement agencies participating —
  // only meaningful where FBI LEE gives us a real denominator.
  const topStatesByParticipationPct: StateRankRow[] = abbrs
    .map((abbr) => {
      const meta = metaByState.get(abbr);
      const denom = meta?.local_le_agencies ?? 0;
      const pct = denom > 0 ? Math.round((meta!.participating / denom) * 1000) / 10 : 0;
      return { abbr, stateName: NAVIGABLE_STATES[abbr], value: pct };
    })
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, TOP_N);

  return {
    snapshotDate,
    topAgenciesByOfficers,
    topStatesByPopulation,
    topStatesByAgencyCount,
    topStatesByParticipationPct,
  };
};
