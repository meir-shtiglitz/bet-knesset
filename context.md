## Persistent login update (2026-10-10)

User requested login to survive reload and last one day. This supersedes earlier
memory-only/one-hour session notes below. New access tokens expire after 24 hours;
restoration verifies the saved token with the server without renewing it. The
browser stores only token and expiry under bet-knesset-session, not user details.
Logout, expiry and current-token 401 clear it. Auth revision checks prevent late
restoration from overriding logout or a newer login. Temporary verification
outages retain the saved token for a future retry but do not authenticate locally.

# Project context

## Startup configuration fix (2026-10-09)

Local startup was blocked by an 8-byte JWT_SECRET. Replaced the ignored local server/.env value with a generated 96-byte secret without recording it in source or documentation; existing tokens require re-login. Entrypoint now resolves server/.env relative to its file and emits specific fixed diagnostics for configuration, connection, index initialization, application initialization and listener failure. Driver error messages remain hidden. Legacy-driver deprecation output is suppressed because Node 24 can include database credentials in URI warnings.

Verified actual `npm start` reached `Server ready` against the configured database (normal connection/index initialization ran), and backend suites passed including 44 app/startup assertions. A driver warning emitted a credential-bearing URI before suppression; rotate the database password separately. No credential values are retained in these docs.

## Groups feature continuation (2026-10-08)

Groups implementation is on `feature/groups`; see [groups-tasks.md](groups-tasks.md) for agreed behavior, verification and remaining follow-up. New Group/GroupMembership models and authenticated `/api/groups` routes support persistent multiple memberships, creator-only management, automatic random-code invitation joining, blocking/unblocking, rotation and group deletion without deleting predictions. Startup now waits for both new model indexes alongside the prediction index.

The client has `/groups` and `/join/:code` routes and a My groups navigation link. One saved selector controls group averages and winners; editor/global prediction data stay independent. Late joins count in averages but not winners; repeated invitations preserve active membership eligibility, and rejoining resets it. Groups use current members for past as well as present charts. Closed elections at join time are explicitly excluded. Public invitation previews return only group names. Invitation codes are private model fields and returned only to creators through a dedicated endpoint.

Winners reuse existing finite scores and wait for actual results; the disabled scoring workflow remains a separate follow-up. Party chart participant counts are corrected and empty averages handled; winner ranking no longer sorts Redux arrays in place. Groups have an inactive tombstone before membership cleanup on deletion, and bounded reads fail rather than truncate charts.

Verification: all backend suites pass (84 identity/recovery, 40 predictions, 42 app/startup, 66 groups assertions plus mail checks); all 13 frontend tests pass. Client build passes into `/tmp/bet-knesset-groups-build` with existing warnings. No deployment, live database/index mutation or manual browser run performed. Real MongoDB concurrency/index verification remains pending. Promotional popup and other extra features remain deferred.

Reviewed 2026-10-07; critical authentication/recovery implementation updated 2026-10-08. Read this file together with [security-report.md](security-report.md) and [tasks.md](tasks.md) before fixes or new features. This is a snapshot of the working tree, including existing uncommitted edits, not a production assessment. Refresh these documents when behavior changes.

## Current authentication / recovery (2026-10-08)

SEC-01/02/03 are done in source; see tasks for checks and limits. `server/security/tokens.js` issues HS256 bearer tokens with one-hour expiry, issuer `bet-knesset`, audience `bet-knesset-client`, subject/user ID and tokenVersion. Shared middleware verifies claims, loads existing non-disabled user and checks version; role 1 alone is admin. Client sends Bearer headers. `/user/signbytoken` verifies proof and returns the same token without renewal. Existing old tokens no longer work. No new auth cookies are set; localStorage remains pending SEC-05. `/user/signout` requires bearer authentication and revokes every session for the user.

Profile endpoint accepts only name/password/currentPassword, targets authenticated identity, requires current password for password changes and performs conditional atomic update. Email/new_email changes reject until a verified workflow is implemented. User has default tokenVersion=0/disabled=false and private reset hash/expiry/request timestamp fields. Defaults support existing records; profile writes also handle absent version. Password storage uses awaited salted scrypt (N=131072, r=8, p=1) via server/security/passwords.js. No legacy verification: existing SHA256 development accounts require reset or recreation. Password policy is 6–256 characters across all auth flows.

Recovery initiation accepts only email, returns a generic response, stores hashed server-generated 64-hex-character proof valid 15 minutes and schedules plain-text mail. POST `/api/user/forgot/reset` accepts token/password, atomically consumes proof and changes password with session revocation, then requires normal login. UI requests code and submits it to server; no client verification. Recovery quota: 10 requests per IP per 15 minutes per process, account mail cooldown 60 seconds in DB. Multi-instance quotas remain SEC-07. Mail module now returns promises and validates TLS certificates. Delivery configuration required: USER_MAIL/PASS_MAIL.

`npm test --prefix server` runs 65 regression assertions with real HTTP routes/JWT/model and an in-memory database adapter + stubbed mail. No dotenv/live DB/email is loaded in tests. Client build was checked into `/tmp/bet-knesset-critical-security-build`, not deployed/copied into server build. No live DB/SMTP/browser test performed. Sections below describe the original scan; this section supersedes old auth/recovery/API notes.

## Purpose and architecture

Bet Knesset is a Hebrew election prediction application. Users register, sign in, choose an election session, allocate 120 seats across parties, and view collective predictions, actual results, and winners. There is no payment integration in the inspected code.

* `client/`: React 17, React Router 6, Redux + thunk, Axios, Bootstrap, SCSS; built using Create React App (`react-scripts` 4).
* `server/`: CommonJS Express 4 API, Mongoose 5/MongoDB, JWT authentication, Joi validation, Nodemailer Gmail transport.
* `server/index.js`: loads dotenv, starts MongoDB connection, JSON body parsing and unrestricted CORS, mounts API routers, serves `server/build`, then SPA fallback. Port defaults to 4000. Listener currently starts without waiting for DB readiness.
* Root `npm start` runs server. Root `npm install` has an install lifecycle script that installs client dependencies, builds client, then installs server dependencies. Avoid running it merely to inspect the project.
* `client` build script runs `react-scripts build && cp -R build ../server/build`. Confirm artifact copying behavior before deployment. Client start enables the OpenSSL legacy provider. Root package requests Node v16.15.0; upgrading runtime and build tooling needs compatibility testing.

## Important files and flows

| Area | Files | Behavior |
| --- | --- | --- |
| Application navigation | `client/src/App.js`, `components/home.jsx`, `components/electionsMenu.jsx` | Session/home, auth, forgot-password, category and lorum routes; home fetches selected session data. App restores login from localStorage. |
| Client authentication | `actions/user.js`, `reducers/user.js`, `components/login.js`, `components/register.js` | Auth actions call API, reducer stores token in localStorage and user state. |
| API configuration | `client/src/apiUrl.js` | Current working version prefixes env API path with `http://localhost:4000`; production clients would target their own localhost. |
| Predictions | `components/voted.jsx`, `components/partyEdit.jsx`, `server/routes/bets-route.js` | Client sends party-ID-to-seat map and session ID; server converts it to embedded bet records. Client enforces total 120; server does not. |
| Read data | `actions/user.js`, `utils/data-utils.js`, `server/routes/bets-route.js` | Public session response includes sessions, parties, bets with populated user names/IDs, and result. Client adds `betsMap` from embedded records. |
| Visualization | `components/parties-chart.jsx`, `party-graph.jsx`, `winner.jsx`, `winner-graph.jsx` | Aggregate seat predictions and rankings; review scoring and displayed participation counts before changing features. |
| Recovery | `components/forgotPassword.js`, `Forgot_setMail.js`, `forgot_confirm.js`, `forgot_newPassword.js`, `server/routes/user.js` | Browser generates/checks code; password update has no server proof. Insecure, must redesign. |
| Admin / seed | `server/admin/index.js`, `server/admin/parties.json` | Helper functions use hardcoded dates/session IDs. Importing `addParties` in entrypoint does not invoke it. No complete session/party/result management API found. |
| Legacy category | `server/routes/category.js`, category components, `client/src/api/category.js` | Category router is not mounted. Two category mutation routes remain mounted under bets; all use undefined `Category`. |

## API inventory (currently mounted)

| Method / path | Intended access | Current notes |
| --- | --- | --- |
| POST `/api/user/signup` | Public | Joi validates name/email/password; save is not awaited; issues JWT. |
| POST `/api/user/signin` | Public | Name or email + password; issues JWT. |
| POST `/api/user/signbytoken` | Existing authenticated user | Decodes unverified token and issues a signed replacement. Critical bypass. |
| POST `/api/user/signout` | Session user | Clears cookie only; bearer tokens stay usable. |
| POST `/api/user/forgot/validmail` | Public recovery initiation | Accepts client-chosen code, sends mail, reveals email existence. |
| POST `/api/user/profile/update` | User changing own profile / password | Currently public and selects user by supplied email. Critical takeover. |
| POST `/api/bets/add` | Authenticated participant | Unverified token middleware; create/update per user/session; only end-date restriction. |
| GET `/api/bets/get/:slug` | Public | Unknown slug falls back to latest end date; full unbounded response. |
| GET `/api/bets/calculate` | Admin | Mutates all bets; legacy hardcoded scoring; unsafe auth foundation. |
| PUT `/api/bets/category/update/:slug` | Admin | Undefined Category model. |
| DELETE `/api/bets/category/delete/:slug` | Admin | Undefined Category model. |

`/api/category/*` client calls have no mounted matching router. No dedicated reset verification, refresh-token, or current-user endpoint found.

## Data model and desired invariants

* `User`: name, unique email, `hashPasword` (existing spelling), salt, numeric role (default 0), timestamps. Password virtual currently applies unsalted SHA256. Preserve field compatibility during migration. No explicit admin role constant exists.
* `Sessions`: slug, name, description, start/end dates, isClosed, timestamps. Slug uniqueness and date validity are not enforced.
* `Parties`: sessionId, name, chars, subtext, timestamps.
* `Bets`: userId, sessionId, embedded `{partyId, predictedSeats}`, place/score, timestamps. No unique user/session index.
* `Results`: sessionId, embedded `{partyId, actualSeats}`, publishedAt, timestamps. No unique session-result index.
* Several references incorrectly use `require: true` rather than `required: true`.
* Desired prediction rules: verified existing user, valid open session, permitted submission time, session-owned parties, finite integer seats 0–120, total exactly 120, at most one bet per user/session. Establish whether omitted parties mean zero.
* Client assumes populated `bet.userId._id` on reads, but mutation returns an unpopulated user ID. Keep response shapes consistent.

## Configuration and boundaries

Server environment names found: `DATABASE`, `JWT_SECRET`, `REACT_APP_API_URL`; entrypoint also uses `PORT`, email transport expects `USER_MAIL` and `PASS_MAIL`. Client uses `REACT_APP_API_URL`. Values deliberately omitted. `.env` files are ignored and not tracked in current index; past history and deployment secrets were not assessed. Client env variables are public build inputs, never a place for credentials.

No project AGENTS.md was found by the repository/parent scan. No real backend test suite, deployment configuration, or CI security pipeline was found. `client/src/setupTests.js` supplies testing-library setup, not security coverage. Root/server test scripts are placeholders. No production API, real database, mail delivery, or deployment was exercised.

## Continuity for future work

Additional feature caveats: winners UI sorts by `score`, while the legacy calculation writes `place`; `winner.jsx` sorts the Redux bets array in place. The averages chart divides by bet count (zero bets needs a guard) and displays `bets.length + 156`, not the actual participant count. `PartyEdit` attempts a zero-or-at-least-four seat rule; clarify whether this is a intended domain rule before enforcing it in the API. Its shared validity flag reflects the last edited party rather than validating the whole prediction. These are future correctness tasks, separate from the security severity counts.

The original scan did not change application code; the subsequent critical-fix pass changed auth/recovery code only. Pre-existing edits were present in client package/lockfile, API URL, party chart/graph and styles, plus server entrypoint, admin helper and party seed data; `client/build.zip` was untracked. Do not overwrite or revert them as audit cleanup.

SEC-01 and SEC-02 are now implemented; continue with SEC-03 through SEC-09. Use isolated synthetic users, an ephemeral DB and stubbed mail, never the existing DATABASE value. Preserve Hebrew presentation, multi-session behavior, the 120-seat allocation flow and existing user records. Resolve privacy, ranking, deadline and auth transport decisions in tasks before extending those features. Update task status with evidence; never mark a source finding resolved based solely on an npm audit result.

## High-severity continuation (2026-10-08)

User explicitly waived backward compatibility because this application is in development. This supersedes earlier requirements to preserve legacy password verification. Modern hashing changes are documented in SEC-03 in tasks.md; no live database changes were run. Authentication route limits and bounded password work protect the new expensive hashing. Limits are process-local and use direct req.ip with default trust proxy disabled; distributed deployment needs shared limits. Server parser limit is now 32 KiB. Payload logs removed from auth actions/reducer and bets/category routes; exposure history remains unassessed. Prediction integrity, persistent client tokens, broader input boundaries and dependency modernization remain open high findings.

Validation for this continuation: `npm test --prefix server` passed 83 assertions with isolated DB/mail adapters. Three sequential synthetic scrypt hashes averaged 245.7 ms on local hardware (not deployment sizing). Full `git diff --check` reports an existing trailing space in the user's parties-chart.jsx change; this continuation preserves that edit. No deployment/live DB/SMTP action was performed.

## Prediction integrity continuation (2026-10-08)

Prior password/limit/logging fixes committed as d8f9543 (pre-existing user edits excluded). SEC-06 is implemented in source: strict 120-seat allocations, session-owned parties, explicit open/date admission policy, unique user/session index, index-ready atomic upsert/retry and populated-shaped mutation response. See tasks.md for precise admission cutoff, development database prerequisites and test limitations. Client permits integer 0–120 values (including 1–3), validates the full allocation, resets own-bet state on session switches and avoids mutating parties order. `npm test --prefix server` now runs both suites: 83 identity/recovery + 40 prediction assertions. No live DB/SMTP/deployment performed. Real MongoDB index/concurrency verification remains required. Unknown APIs and parser failures return safe JSON; remaining SEC-12 issues are open.

Prediction UI production build passed in `/tmp/bet-knesset-prediction-security-build` with tooling/lint warnings. Subsequent own-bet lookup additionally checks sessionId to avoid restoring predictions from a previous election during a session switch.

## Session/read/startup continuation (2026-10-08)

SEC-05 is done in source: memory-only one-hour bearer sessions, explicit re-login on reload, verified expiry metadata, expiry/current-token 401 cleanup, race-safe replacement handling and logout UI/server revocation. Old localStorage/sessionStorage token is removed; no refresh or cookie auth. Production Redux DevTools disabled. All client debug logs and admin session dump removed; historical exposure review still open.

SEC-12 is complete for the mounted API: separate app factory, required DATABASE/JWT_SECRET (>=32 bytes)/PORT validation, connection/index readiness before listening, safe startup failure and bounded timeouts. No live connection during tests. Legacy GET scoring is disabled; category mutations removed from mounted routes. SEC-14 still needs real scoring/legacy cleanup/model invariants.

Election reads use explicit `latest` default, validated slugs, projections, IP quotas and bounded full datasets (100 sessions/120 parties/1000 predictions); over-limit replies 503 to avoid truncated averages. This is an interim bound; pagination/aggregation, shared quotas and privacy policy remain SEC-07/11. Mail transport is lazy so dotenv loads before credentials are read, validates config/TLS and bounds concurrent/queued work and connection timeouts. SEC-10's real invalid-certificate test is not complete.

Verification: 166 backend assertions across identity/prediction/app/startup suites, additional bounded-mail stub checks and 6 frontend session/logout tests pass. Client build passed in `/tmp/bet-knesset-session-security-build` with existing warnings. No deployment, live DB/mail, credential/log-provider operation or real database concurrency testing. User's pre-existing package/API URL/admin seed edits remain separate from this work.
