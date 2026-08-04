import { NAVIGABLE_STATES } from "$lib/states";
import { MODEL_ORDER } from "$lib/colors";
import type { Agency, StateMeta } from "$lib/homeData.types";

export type CompareStateRow = {
  abbr: string;
  stateName: string;
  agencyCount: number;
  modelCounts: Record<string, number>;
  populationServed: number | null;
  localLeAgencies: number | null;
  localParticipating: number | null;
};

export type CompareData = {
  selected: string[];
  rows: CompareStateRow[];
  snapshotDate: string | null;
};

const MAX_STATES = 3;

export const load = async ({ fetch, url }): Promise<CompareData> => {
  const requested = (url.searchParams.get("states") ?? "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((abbr) => abbr in NAVIGABLE_STATES);
  // De-dupe, cap at MAX_STATES, preserve the order the reader picked them in.
  const selected = [...new Set(requested)].slice(0, MAX_STATES);

  if (selected.length === 0) {
    return { selected: [], rows: [], snapshotDate: null };
  }

  const [agenciesRes, metaRes] = await Promise.all([
    fetch("/data/dist/agency_index.json"),
    fetch("/data/dist/state_meta.json"),
  ]);
  const agencies: Agency[] = agenciesRes.ok ? await agenciesRes.json() : [];
  const stateMetaArr: StateMeta[] = metaRes.ok ? await metaRes.json() : [];
  const metaByState = new Map(stateMetaArr.map((s) => [s.state, s]));

  const snapshotDate =
    agencies
      .map((a) => a.snapshot_date)
      .filter((v): v is string => Boolean(v))
      .sort()
      .at(-1) ?? null;

  const rows: CompareStateRow[] = selected.map((abbr) => {
    const inState = agencies.filter((a) => a.state === abbr);
    const modelCounts: Record<string, number> = {};
    for (const a of inState) for (const m of a.models) modelCounts[m] = (modelCounts[m] ?? 0) + 1;
    const meta = metaByState.get(abbr);
    return {
      abbr,
      stateName: NAVIGABLE_STATES[abbr],
      agencyCount: inState.length,
      modelCounts,
      populationServed: meta?.population_served ?? null,
      localLeAgencies: meta?.local_le_agencies ?? null,
      localParticipating: meta?.participating ?? null,
    };
  });

  return { selected, rows, snapshotDate };
};
