# Water authority name correction — 2026-11

The company's own site names it **«شركة المياه الوطنية»** (https://www.nwc.com.sa/ar and https://ebranch.nwc.com.sa/submit-complaint, checked 2026-11-11: the official spelling appears 6 times on each, «الشركة الوطنية للمياه» 0 times). English: "National Water Company" (unchanged).

**Code first.** `lib/government/entity-names.ts` maps the historical spelling to the official one wherever an authority name is read (database rows, the browser's `activeEntityName`, letter builders, profiles, sector maps), and name lookups accept both spellings. With that code deployed the app behaves identically before and after this script, and conversations started under the old name keep working.

**Then, with the owner's approval** (after a fresh, restore-tested backup):

1. `01_rename.sql` — renames the `nwc` row (same id), its existing official-source label, and the knowledge-passage entity labels. Guarded, atomic.
2. `02_verify.sql` — expect `new_name_entities 1`, `old_name_entities 0`, `old_name_passages 0`, the same `nwc_id`, and the historical letters count unchanged.

Rollback: `99_rollback.sql` (restores exactly the rows `01` marked).

Never changed: complaints, stored letter versions (historical documents keep the name they were written with), conversations, messages, collected information, profiles, auth. A user who regenerates an old complaint gets a new version addressed to the official name; earlier versions stay as written.
