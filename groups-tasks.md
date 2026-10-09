# Groups implementation

Branch: `feature/groups`. Agreed design recorded 2026-10-08.

## Agreed behavior

- Persistent groups, multiple memberships per user, one prediction per election shared across groups.
- One selector controls average and winners; Everyone default, remember device selection, invitation selects joined group.
- Name and optional description; duplicate names allowed. Creator is sole admin and must delete to leave.
- Automatic authenticated invitation joining; preserve invitation across registration/login. Public preview shows name only.
- Late joins contribute to averages but not that election's winners. Rejoining resets eligibility, including creator joining by creation.
- Removing/leaving removes participation from all group charts, including past elections, without deleting predictions. Removed members blocked until unblocked.
- Members see names. Creator edits, removes, unblocks, resets invitation, deletes group and memberships.
- Existing score/rank behavior; wait for results and finite scores. No new scoring formula.
- Defer promotional popup, season leaderboard and rank highlights.

## Tasks

- [x] Group and membership models, unique membership indexes, startup readiness.
- [x] Authorized CRUD, membership, blocked rejoin and rotating invitation APIs.
- [x] Server-derived group averages and eligible winners; empty states and score readiness.
- [x] Invitation/auth continuation, My groups management and shared chart selector.
- [x] Meaningful backend and frontend regression checks; production build.
- [x] Document verification and remaining limitations; no live DB or deployment performed.

## Implementation decisions

Invitation codes are random 256-bit values. A hash supports lookup; the code is also stored in a field excluded from default queries so the creator can retrieve the existing link. Only the creator's dedicated authenticated endpoint returns the code. Rotation invalidates the old invitation; public previews return only the name.

Membership timestamps determine deadline eligibility (strictly before endDate). Joining or rejoining also records elections already explicitly closed so early closure excludes new members without relying on mutable session timestamps. Repeated invitations for active members preserve their original joinedAt. Unblocking changes blocked to left; users must join again and get a new timestamp.

Group deletion marks the group inactive before removing memberships; APIs reject inactive groups even if a concurrent join leaves a membership record. A deleted group tombstone remains in storage. Group reads fail rather than silently truncate above 100 memberships per account, 1000 members/predictions per group, or 120 parties per election. Existing public election-read limits remain unchanged.

Selection is stored per user/device without storing credentials. Pending invitation is stored in sessionStorage across auth screens/reloads. Stale membership responses from a previous token or older refresh cannot replace current groups. Failed group chart requests display an error rather than fall back to Everyone under a group heading.

Existing global scores are reused; the retired scoring endpoint is not re-enabled. No new scoring formula or publication pipeline is introduced. Winners wait for a nonempty actual result and finite scores for all eligible predictions. The parties participant count now reflects actual submitted predictions, and empty averages do not divide by zero. Ranking copies prediction arrays instead of mutating Redux state.

## Verification — 2026-10-08

- `npm test --prefix server`: 84 identity/recovery, 40 prediction, 42 app/read/startup and 66 groups assertions pass, plus existing mail transport checks.
- Group tests exercise real HTTP routes and JWT authentication with synthetic model adapters: creator authority (including rejecting unrelated app admins), automatic/idempotent join, public name-only preview, late join/rejoin/creator eligibility, averages, score readiness, removal/block/unblock, invite rotation, and deletion preserving predictions.
- `CI=true npm test --prefix client -- --watchAll=false --runInBand`: 13 tests across 3 suites pass. Seven new checks cover shared chart switching, invitation continuation after authentication, empty/pending states, immutable ranking, stale account responses and out-of-order refreshes.
- Production client build passes in `/tmp/bet-knesset-groups-build` with existing lint/tooling warnings. No artifacts copied into `server/build`.
- `git diff --check` passes. Pre-existing package/lock/API URL/admin seed changes and build.zip remain untouched.

## Remaining follow-up

- [ ] Exercise real MongoDB index creation and concurrent joins/removals/deletion using an isolated database; current tests use adapters.
- [ ] Perform a manual browser smoke test with registered/new accounts and copied links. Automated frontend tests use mocked HTTP.
- [ ] Rebuild the existing election scoring/publication workflow separately; group winners consume its scores.
- [ ] Promotional create-group popup, season leaderboard and personal rank highlights remain deferred as agreed.
