#!/usr/bin/env node
/**
 * Stage tracked data files into static/data/dist before `vite build`.
 *
 * Why this exists: packages/web/static/data is gitignored, so the only files
 * SvelteKit sees at build time are whatever the pipeline just generated. Data
 * the pipeline *can't* regenerate in CI has to be copied in from a tracked path
 * or it silently drops out of the build.
 *
 * That drop is not a graceful degradation. A file missing from static/ is
 * missing from `manifest.assets`, so a server `load` that fetches it takes
 * SvelteKit's non-asset path and recurses back into the app instead of reading
 * a file — which returns a 200 whose body is already consumed, and `.json()`
 * throws "Body is unusable". That was the intermittent 500 on every agency page
 * (#267). Keep this list in sync with any tracked-but-not-generated data file.
 */
import { copyFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = resolve(__dirname, '../static/data/dist')

const FILES = [
  ['../../pipeline/data/muckrock_snapshot.json', 'muckrock_requests.json'],
]

mkdirSync(DIST, { recursive: true })
for (const [from, to] of FILES) {
  const src = resolve(__dirname, from)
  if (!existsSync(src)) {
    console.error(`copy-static-data: missing tracked source ${src}`)
    process.exit(1)
  }
  copyFileSync(src, resolve(DIST, to))
  console.log(`copy-static-data: ${to}`)
}
