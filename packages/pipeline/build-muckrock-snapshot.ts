#!/usr/bin/env tsx
/**
 * Build MuckRock FOIA snapshot.
 *
 * Reads packages/pipeline/data/muckrock_seed.json (curated list of FOIA IDs and
 * their manual agency_slug matches), refreshes per-request status + datetime
 * fields via MuckRock's public API (/api_v1/foia/{id}/), and writes a slim
 * snapshot to packages/web/static/data/dist/muckrock_requests.json.
 *
 * Why a seed file: MuckRock has no /api_v1/multirequest/ endpoint exposing the
 * child FOIA list, and the per-FOIA endpoint doesn't surface jurisdiction or
 * the parent multirequest. The seed captures the 8 IDs in this multirequest
 * plus manual agency_slug mappings — only 2 of 8 target agencies appear in our
 * 287(g) index, so fuzzy/LLM matching wouldn't help here.
 *
 * Run:
 *   pnpm tsx build-muckrock-snapshot.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SEED_PATH = resolve(__dirname, 'data/muckrock_seed.json')
const TRACKED_PATH = resolve(__dirname, 'data/muckrock_snapshot.json')
const OUT_DIR = resolve(__dirname, '../web/static/data/dist')
const OUT_PATH = resolve(OUT_DIR, 'muckrock_requests.json')
const UA = '287g-explorer-pipeline (https://287g.recoveredfactory.net)'
const FETCH_DELAY_MS = 300

type SeedRequest = {
  foia_id: number
  absolute_url: string
  agency_label: string
  jurisdiction: string
  agency_slug: string | null
  match_note?: string
}

type Seed = {
  multirequest: { id: number; title: string; absolute_url: string; filer: string }
  reporter_guide: { title: string; absolute_url: string; publisher: string }
  requests: SeedRequest[]
}

type FoiaApiResponse = {
  id: number
  title: string
  status: string
  datetime_submitted: string | null
  datetime_done: string | null
  datetime_updated: string | null
  absolute_url: string
}

type SnapshotRequest = SeedRequest & {
  title: string
  status: string
  datetime_submitted: string | null
  datetime_done: string | null
  datetime_updated: string | null
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// MuckRock closed the public API sometime between 2026-05-26 and 2026-07-29 —
// anonymous reads now 401. Get a key with
//   curl -X POST https://www.muckrock.com/api_v1/token-auth/ \
//     -d 'username=<user>&password=<pass>'
// and export it as MUCKROCK_TOKEN before running.
const TOKEN = process.env.MUCKROCK_TOKEN

async function fetchFoia(id: number): Promise<FoiaApiResponse | null> {
  const url = `https://www.muckrock.com/api_v1/foia/${id}/`
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'application/json',
      ...(TOKEN ? { Authorization: `Token ${TOKEN}` } : {}),
    },
  })
  if (!res.ok) {
    console.warn(`  ⚠ ${id}: HTTP ${res.status}`)
    return null
  }
  return (await res.json()) as FoiaApiResponse
}

const seed: Seed = JSON.parse(readFileSync(SEED_PATH, 'utf8'))

// Last good snapshot, so a partial API failure carries the previous values
// forward instead of blanking them to `unknown`.
let previous: Map<number, SnapshotRequest> = new Map()
try {
  const prior = JSON.parse(readFileSync(TRACKED_PATH, 'utf8')) as { requests: SnapshotRequest[] }
  previous = new Map(prior.requests.map((r) => [r.foia_id, r]))
} catch {
  console.warn(`No prior snapshot at ${TRACKED_PATH} — every field comes from this run.`)
}

if (!TOKEN) console.warn('MUCKROCK_TOKEN is unset; the API will almost certainly 401.\n')
console.log(`Refreshing ${seed.requests.length} FOIA requests from MuckRock API...`)

const enriched: SnapshotRequest[] = []
let refreshed = 0
for (const req of seed.requests) {
  const api = await fetchFoia(req.foia_id)
  if (!api) {
    const prior = previous.get(req.foia_id)
    enriched.push(
      prior ?? {
        ...req,
        title: req.agency_label,
        status: 'unknown',
        datetime_submitted: null,
        datetime_done: null,
        datetime_updated: null,
      },
    )
    continue
  }
  refreshed++
  console.log(`  ${req.foia_id} ${api.status.padEnd(20)} ${req.agency_label}`)
  enriched.push({
    ...req,
    title: api.title,
    status: api.status,
    datetime_submitted: api.datetime_submitted,
    datetime_done: api.datetime_done,
    datetime_updated: api.datetime_updated,
  })
  await sleep(FETCH_DELAY_MS)
}

// Refuse to write when nothing came back. The output used to be written
// unconditionally, which meant a total API failure (e.g. the 401 wall) silently
// replaced a good snapshot with `status: "unknown"` rows and a fresh date — and
// because the dist copy lives under the gitignored packages/web/static/data,
// there was no `git checkout` to undo it.
if (refreshed === 0) {
  console.error(
    `\nEvery request failed — refusing to overwrite ${TRACKED_PATH}.` +
      (TOKEN ? '' : '\nSet MUCKROCK_TOKEN (see the comment above fetchFoia) and retry.'),
  )
  process.exit(1)
}
if (refreshed < seed.requests.length) {
  console.warn(`\n⚠ ${seed.requests.length - refreshed} request(s) failed; carried prior values forward.`)
}

const matched = enriched.filter((r) => r.agency_slug !== null).length
const snapshot = {
  multirequest: seed.multirequest,
  reporter_guide: seed.reporter_guide,
  snapshot_date: new Date().toISOString().slice(0, 10),
  requests: enriched,
}

// Two destinations: the tracked copy is the source of truth the site build
// copies from (CI can't regenerate it — no token there), and the dist copy so a
// local dev server picks the change up without a rebuild.
const body = JSON.stringify(snapshot, null, 2)
writeFileSync(TRACKED_PATH, body)
mkdirSync(OUT_DIR, { recursive: true })
writeFileSync(OUT_PATH, body)
console.log(`\nWrote ${enriched.length} requests (${matched} matched to agencies)`)
console.log(`  → ${TRACKED_PATH}`)
console.log(`  → ${OUT_PATH}`)
