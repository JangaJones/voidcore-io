# Source of Truth (Raw)

These files are copied/generated as raw source data for `Voidcore-IO`.
No normalization is applied here.

## Files

- `wlt-mid-s1.payload.json`
  - Raw curated S1 payload from `wow-loot-table.vercel.app` (`latest-mid-s1.payload.json`).

- `blizzard-s1-scope-instances.json`
  - Raw Blizzard S1 scope instance payload map.

- `blizzard-s1-scope-encounters.json`
  - Raw Blizzard S1 scope encounter payload map.

- `blizzard-s1-scope-summary.json`
  - Snapshot metadata for the S1 scope extraction run.

- `blizzard-playable-specializations.official.json`
  - Official Blizzard specialization source-of-truth:
  - `index`: raw `/playable-specialization/index` response
  - `specializationsById`: raw `/playable-specialization/{id}` responses

## Intent

The app layer should consume this structure directly in the next implementation step.
Normalization is intentionally deferred/omitted.

## Final App DB

`npm run build:data` reads these files and writes a trimmed runtime database:

- `src/data/voidcore-db.mid-s1.json`
