# Community Groups Dashboard (Summit Church)

Pastor/coordinator view across all Community Groups. Next.js on Vercel.

- **CCB (live, every page load):** roster, campus, meeting day/time, open/closed, capacity, enrolled. `src/lib/ccb.ts`
- **Supabase `pastoral_updates`:** written by the leader update form (cg-update) every 6 weeks.
- **Supabase `notes`:** written by this dashboard (contact log).
- **Phase 2, not built:** `join_requests` from the Group Finder.

## Setup
1. Create a Supabase project, run `supabase/schema.sql` in its SQL editor. `pastoral_updates` is the contract cg-update must write to.
2. `cp .env.example .env.local` and fill in CCB + Supabase values (service role key stays server-side).
3. `npm install && npm run inspect-ccb` to confirm CCB capacity/enrolled tag names, adjust `src/lib/ccb.ts` if needed.
4. `npm run dev`. Tests: `npm test`.

## Not done yet
- Attendance (weekly card + monthly trend): needs CCB attendance endpoints; shows "not connected" meanwhile.
- No login: unlisted URL, `noindex` header. Notes are pastoral, so add a passcode before sharing widely.

## Deploy
Import the repo in Vercel, set the env vars, add `cg-dashboard.summitlife.com`, then a CNAME at the DNS host to Vercel.
