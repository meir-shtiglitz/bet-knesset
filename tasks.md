# Security and maintenance tasks

Created 2026-10-07. **SEC-01, SEC-02, SEC-03, SEC-05, SEC-06 and SEC-12 are done in source as of 2026-10-08**; other tasks remain open (some received partial improvements). Deployment and live service validation have not been performed. Read [context.md](context.md) and [security-report.md](security-report.md) first. IDs map one-to-one to report findings. Work in priority order, preserve existing user edits, and record files changed, migration steps and verification evidence when closing a task. Use synthetic accounts, an isolated DB and stubbed mail for verification.

## Immediate containment and sequencing

If this code is deployed, first deny public access to profile mutation and token restoration, then repair SEC-01/02 before re-enabling them. This is a proposed operational step, not something performed by the scan. SEC-04 can be fixed independently immediately. Complete identity foundation before admin features, private user data or new mutations. SEC-09 can run alongside these changes after checking dependency compatibility. Group tightly coupled SEC-01/02/05 client changes into a coherent tested release.

## SEC-01 — Verified identity and explicit authorization — DONE (2026-10-08)

Completion: added `server/security/tokens.js`; replaced authentication middleware and token restoration; updated JWT issuance and client authorization headers. HS256 signature, issuer/audience, subject/ObjectId, expiry and session version are verified. Tokens expire after one hour; restoration returns the same token without renewing it. Existing/active user required; only numeric role 1 grants admin access. Old tokens lacking new claims are rejected. No deployment or data migration was run.

Verification: `npm test --prefix server` executes 65 assertions against real Express routes/JWTs with an in-memory DB adapter and stubbed mail. Includes invalid signatures, unsigned/tampered/expired/invalid-claim/deleted/disabled-user tokens, admin restrictions and valid restoration. Client production build succeeds with existing warnings. Real MongoDB/SMTP and browser interaction were not exercised.

Priority P0; dependencies: none. Files: `server/middlewears/user.js`, `server/routes/user.js`, authenticated routes, client token callers.

Replace decode-as-authentication with shared `jwt.verify` using an algorithm allowlist, validated ID/subject and required expiration. Set issuer/audience when issuing tokens and enforce the same values when verifying. Require an existing active user. Use a known explicit admin role, not any nonzero value. Token restoration must verify the original token before any replacement is issued; consider a `/me` endpoint instead. Standardize `Authorization: Bearer <token>`; current client sends raw tokens, so update all callers. Missing headers must safely return 401.

Acceptance: attacker-signed, unsigned, altered, expired, malformed, wrong-audience and deleted-user tokens fail; valid own-user requests pass; regular users cannot execute admin routes; arbitrary/negative role values do not count as admin. Exercise both restoration and mutation routes with a synthetic attacker token. Do not expose token contents in errors/logs.

## SEC-02 — Owned profiles and server-verified password recovery — DONE (2026-10-08)

Completion: split authenticated profile updates from POST `/api/user/forgot/reset`. Profile target comes exclusively from verified identity; target email/new_email/role inputs reject. Password change requires current password. Email changes remain disabled until a separate verified email-change flow exists. Recovery generates a 256-bit random code, stores SHA256 proof hash and 15-minute expiry on User, and atomically replaces password, consumes proof and increments tokenVersion. Reset returns no login token. Browser sends the emailed code instead of generating/checking it. Recovery has 10 requests per IP per 15 minutes per process and persistent per-account 60-second mail cooldown, uniform initiation response, safe plain-text mail and failure handling. Password change/reset invalidates previous sessions. Logout also revokes all sessions.

Verification: same 65-assertion suite covers unauthenticated/other-user mutation, unknown/operator fields, missing/wrong current password, owned update, legacy records missing tokenVersion, generic recovery responses, mail cooldown, hashed proof, expired/invented/replayed proof, parallel consumption (one success), account-bound reset, session invalidation, quotas, normal login and failed-save handling. Atomicity is implemented as one MongoDB findOneAndUpdate but tests use a synchronous in-memory adapter, not a real MongoDB concurrency test. No production database or email was accessed. Existing password hashes still use legacy SHA256; SEC-03 remains open. Missing User fields use defaults; no bulk rewrite required. Mail delivery must be configured with USER_MAIL/PASS_MAIL and validated in deployment.

Priority P0; dependencies: SEC-01 for profile ownership. Files: `server/routes/user.js`, email module, new reset model/service, recovery components and `actions/user.js`.

Split authenticated profile/password change from public reset. Derive profile target from verified user ID, validate allowed fields, require current credentials for sensitive changes and a verified process for email changes. Never accept a target email as authority. For reset, generate cryptographically random server token, store only its hash with user ID/expiry, mail controlled link/code, and atomically consume proof once when setting password. Provide uniform initiation responses, attempt limits and expiry. Remove client generation/comparison of `numsValid`; frontend submits server proof. Integrate SEC-05 revocation.

Acceptance: unauthenticated profile changes fail; user A cannot change B; known email alone cannot reset; invented/expired/replayed tokens fail; concurrent use succeeds once; valid proof changes only its bound account; response shapes do not reveal account existence. Password writes await DB success and reset does not silently grant unrestricted sessions without policy.

## Additional high-severity hardening (2026-10-08)

SEC-04: removed payload/token/state/error-object debug logs from bets/category routes and client auth actions/reducer; DB connection failure logs a fixed category only. Historical logs/secret rotations and other component debug logs are still unreviewed; finding remains open.

SEC-07: bounded per-IP signup (5), signin (20), profile (10), recovery initiation/reset combined (10) requests per 15 minutes; limits run before expensive password work, emit 429 and Retry-After, cap key maps at 10000, and ignore forwarded headers under default disabled trust proxy. Explicit JSON body cap is 32 KiB. Tests cover predictable limiting. Shared multi-instance limits, per-account login budgets and bounded public reads remain open. Do not enable arbitrary trust proxy to deploy these limits.

## Partial follow-through on other findings

SEC-04: sensitive auth/validation/mail logs removed; remaining client state/bet logs, historic-log review and rotations are open. SEC-05: one-hour bearer tokens, no new token cookies, version-based password-change/reset/logout revocation; localStorage, refresh design and UI logout remain open. SEC-07: recovery quota/cooldown and plain-text templates added; login/signup/read limits and shared multi-instance quotas remain open. SEC-08: recovery/profile boundaries hardened; broader route validation remains open. SEC-10: certificate bypass removed and sendMail promise returned; real/invalid-certificate delivery verification remains open. SEC-12: auth routes now await writes and handle errors; entrypoint/bets/global errors remain open.

## SEC-03 — Modern password storage — DONE (2026-10-08)

Replaced SHA256 with asynchronous Node crypto scrypt (N=131072, r=8, p=1; 16-byte random salt, 64-byte output, timing-safe comparison). The embedded format fixes allowed parameters so corrupt hashes cannot request arbitrary cost. Password work runs one operation at a time with at most 16 queued jobs; overload returns a safe 503. Signup/change/reset await hashing before persistence; reset retains atomic proof consumption/session revocation. Removed crypto-js and uuid direct dependencies. Shared server policy accepts 6–256 characters without truncation; strict signup/signin validation rejects objects and oversized fields.

Development-only breaking policy explicitly authorized by user: no SHA256 compatibility, rehash-on-login or bulk database migration. Existing SHA256 accounts must use recovery (configured stub/real mail as appropriate) or be recreated in an isolated development DB. No records were deleted or modified by this work. Source callers use awaited setPassword/checkPassword; password virtual was removed.

Verification: server HTTP regression suite passes 83 assertions and checks salted hash differences, correct/wrong passwords, rejection of old/corrupt hashes, new/reset password storage, signup policy/operator rejection, no plaintext in records, persistence failures and existing auth/recovery checks. Local benchmark recorded in context; deployment hardware cost/load still needs measurement. OWASP scrypt guidance: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html .

## SEC-04 — Remove sensitive logs and assess exposure

Priority P1; dependencies: none. Files: validation, auth middleware/routes, email module and bet route logging.

Replace full payload/header/user/transport logging with minimal structured events; redact password, JWT, hash, salt, reset proof and SMTP/database credentials. Check application/log-provider retention and access without copying secrets into reports. Rotate SMTP/JWT/DB credentials only where exposure warrants it; communicate session invalidation effects. The current environment snapshot does not establish that SMTP credentials were configured.

Acceptance: capture logs during success and failure paths using sentinel secrets; none appear. Useful request IDs and safe failure categories remain. Record any exposure review limitations and completed rotation actions.

## SEC-05 — Token lifetime, transport and revocation — DONE IN SOURCE (2026-10-08)

Priority P1; dependencies: SEC-01/02. Files: JWT issuers, signout, user schema/session storage, Redux auth and API callers.

Choose one explicit transport: HttpOnly Secure SameSite cookie with CSRF protection for mutations, or short-lived bearer access tokens with a secure refresh design. Stop setting duplicate insecure cookies if bearer-only. Use valid `expires`/`maxAge` options where cookies are used. Enforce access expiry, refresh expiry/rotation if implemented, and revocation following password reset/change or account disablement. Make logout semantics explicit and remove client credentials. Existing indefinite tokens need an invalidation strategy.

Acceptance: expiry enforced, old sessions rejected after reset, logout behaves as documented, cookie attributes verified where applicable, refresh replay rejected if supported. If cookie auth is selected, cross-site mutation attempts fail and allowed frontend origins still work.

## SEC-06 — Enforce prediction rules and uniqueness — DONE IN SOURCE (2026-10-08)

`server/security/predictions.js` strictly validates body/IDs, rejects unknown fields/operators, limits allocations to 120 parties, requires integer seats 0–120 and total 120. Every submitted party must belong to the selected election; omitted parties mean zero. Seats 1–3 are allowed; the client now uses the same rule rather than enforcing a separate last-edited-field threshold. Session must explicitly have isClosed=false, finite ordered start/end dates, and start <= admission time < end. Open state is reread immediately before database mutation and duplicate retry. Admission time, not database completion time, determines cutoff; concurrent admin closure after the final read is not serialized with a bet write.

`Bets` corrects required/ref flags, validates seat allocation/duplicate party IDs, declares unique `{userId, sessionId}` index with autoIndex=true. Submission waits for successful model/index initialization and uses atomic validated upsert; duplicate insert race retries one non-upserting owned update. Original creation timestamp is preserved by timestamps/upsert semantics. Mutation response provides populated-shaped userId with only ID/name. Submission budget: 30 per IP per 15 minutes.

`voted.jsx` validates all values together, handles session switches/empty own bets, honors date/closed state and avoids sorting Redux parties in place. `partyEdit.jsx` accepts only integer values 0–120 with matching HTML limits. Related SEC-08 input boundaries and SEC-12 safe errors are improved; those findings remain open overall.

Verification: `npm test --prefix server` passes 83 identity/recovery assertions and 40 prediction assertions using real HTTP/JWT/Mongoose validators plus stub database adapters. Includes unauthenticated requests, bad IDs/operators/types/totals, wrong-election parties, valid create/update, safe database/index failure, retry after simulated duplicate insert, populated response, model required/allocation/index constraints and exact start/end inclusivity. No real MongoDB index build or parallel insert test was performed; this must be verified on an isolated database before deployment. Client production build succeeds in `/tmp/bet-knesset-prediction-security-build` with existing tooling/lint warnings; no artifacts copied into server/build.

Development migration policy: no compatibility path/dedup migration. Recreate an isolated development database or manually repair invalid/duplicate predictions before building the compound unique index. No existing DATABASE connection, data deletion, index operation or backup was performed. Existing sessions without explicit isClosed=false or valid dates reject writes. Index failure causes safe 503 instead of silently continuing without uniqueness.

## SEC-07 — Abuse controls, bounded reads and safe email

Priority P1; dependencies: coordinate SEC-02/11/13. Files: entrypoint, auth/recovery/bet routes, email module.

Apply endpoint-specific rate limits and reset attempt budgets per account and IP; configure proxy trust for actual infrastructure. Use shared storage when multiple instances exist. Set explicit JSON size/time limits, bounded pagination and aggregation. Reject caller-controlled email text/HTML; use an escaped template. Bound concurrent mail work and handle failures. Uniform recovery response must not bypass delivery quotas.

Acceptance: repeated login/reset/read abuse hits predictable 429 or documented quota response; oversized bodies fail; pagination capped; arbitrary HTML is not inserted into mail; legitimate reset succeeds with stub transport; forwarded headers cannot bypass limits under documented proxy setup.

## SEC-08 — Reject query operators and validate every boundary

Priority P1; dependencies: SEC-02. Files: request validation and user/bets routes.

Add Joi schemas for recovery, profile, session/party IDs, slug and admin inputs; require scalar strings where expected, reject unknown/operator fields and bound lengths. Never construct account identity queries from untrusted objects. Audit every database filter/update after redesign. Keep canonicalized email strategy consistent with uniqueness and login.

Acceptance: JSON objects/arrays/null for email/name/token/ID fail before DB access; `$ne`, `$gt` and nested operator payloads cannot select another user; unexpected role/hash fields reject; errors are safe and valid requests still work.

## SEC-09 — Dependency/runtime/build modernization

Priority P1; dependencies: none, but preserve behavior during upgrades. Files: all manifests/lockfiles, build configuration. Evidence: `security/*-npm-audit.json`.

Triage direct and transitive advisories by deployed reachability. Upgrade vulnerable backend libraries and select supported runtime/toolchain versions using current official release guidance. Replace/update legacy CRA tooling deliberately rather than blindly forcing audit fixes. Separate browser/runtime/build/development threats; inspect whether serving built artifacts makes a tooling advisory reachable. Review root install lifecycle, clean CI install and build-copy script. Do not treat npm's prod classification as proof of browser exposure.

Acceptance: clean locked install and build succeed on chosen runtime; auth/recovery/bets/scoring checks pass; refreshed audits saved; each retained advisory has named dependency path, prerequisites, reason and next action. No unreviewed major-version force fixes or surprise lockfile rewrites.

## SEC-10 — Restore SMTP TLS verification

Priority P2; dependencies: coordinate SEC-02/07. File: `server/model/emails.js`.

Remove `rejectUnauthorized: false`, configure supported TLS transport and validated mail configuration; return/await sendMail promises and handle failures safely. Do not weaken certificate verification to make a failing connection work.

Acceptance: transport verifies certificates, invalid certificate is rejected in controlled tests, stubbed mail failures are handled without unhandled promises or secret logging. Document how a real delivery smoke test can be performed without emailing users.

## SEC-11 — Public data and prediction privacy policy

Priority P2; dependencies: SEC-01/07. Files: public bets route, chart/ranking components, new aggregate/own-bet endpoints if needed.

Confirm whether names and individual predictions are meant to be public before/during/after election. Proposed default: public aggregates, limited leaderboard display, authenticated own-bet access. Use explicit projections and pagination; avoid exposing stable internal user IDs when unnecessary. Check hidden/unpublished sessions/results policy. Preserve chart behavior with aggregate responses.

Acceptance: unauthenticated response matches documented policy and excludes private user fields; A cannot request B's private bet; aggregates equal validated source bets; bounded leaderboards work without downloading all participant records.

## SEC-12 — Consistent errors and reliable persistence — DONE FOR MOUNTED API (2026-10-08)

Priority P2 (auth failure handling is part of P0); dependencies: none. Files: entrypoint and all routes/middleware.

Use Express-4-compatible async wrapper or explicit try/catch next(error), centralized safe JSON errors and dedicated API 404 before SPA fallback. Validate IDs before querying, handle empty sessions/not-found, await saves and handle duplicate-key errors. Await DB connection before listening or expose readiness correctly; fail startup for missing required configuration. Refactor app creation from listener to allow isolated route tests.

Acceptance: absent/malformed auth, invalid ObjectIds, empty DB, DB outage and save failures produce safe bounded responses without process exit/unhandled rejection; failed signup/update never returns success token; unknown API GET returns JSON 404; real SPA paths still serve application.

## SEC-13 — Production API URL, origins and headers

Priority P2; dependencies: coordinate SEC-05. Files: entrypoint, `client/src/apiUrl.js`, env example/docs, deployment config if introduced.

Use same-origin `/api` or validated environment-based HTTPS API URL in production; keep localhost for development only. Restrict CORS to intended origins, add suitable security headers and test CSP compatibility with assets/styles. Define HTTPS termination and proxy configuration; do not assert existing deployment lacks TLS without inspecting it. Add `.env.example` files containing placeholders only.

Acceptance: production bundle has no localhost endpoint, allowed origin works, disallowed origin lacks allow headers, authenticated mutations still require credentials, headers verified, no secrets in bundle. Cookie-based auth has compatible credentials and CSRF settings.

## SEC-14 — Repair scoring, legacy routes and schema invariants

Priority P2; dependencies: SEC-01/06/12. Files: bets router, category router/client, models, admin helpers, winners UI.

Move scoring to verified admin POST/job, scope it to one session, consume actual Results + party IDs and embedded bets. Define deterministic score/tie-break rules; current calculation mixes hardcoded 2022 values with current representation and time-dependent scoring. Await all writes and make repeat execution stable; record audit event. Decide whether to remove categories or supply a real model/router. Fix `require` to `required`; add session-slug/result uniqueness and date validation after reviewing legacy data. Replace hardcoded seed IDs with explicit validated inputs and guarded documented seed commands.

Acceptance: nonadmin blocked; GET does not mutate; known synthetic predictions produce expected scores for only chosen session; repeat job same results; failures reported; no undefined Category routes; invalid model records rejected; migration handles existing invalid/duplicate data safely.

## Future feature preparation and open decisions

Track UI correctness alongside security fixes: reconcile `place` versus `score`; avoid sorting Redux state in place; guard averages for zero bets; replace or explain the hardcoded +156 participation count; validate all party inputs together rather than the last edited one; decide whether seats 1–3 are disallowed. Cover empty-session, empty-bet and session-switch behavior when modifying these components.

After P0/P1 fixes, establish a repeatable API integration suite covering identity, ownership, recovery, role checks, prediction invariants and safe error handling; use ephemeral DB and fake mail. Add CI install/build/test/dependency checks appropriate to the selected toolchain. Document deployment, backups and restoration with the actual environment owner.

Resolve during implementation: public prediction visibility; exact voting deadline/timezone; zero-valued omitted parties; canonical email handling; explicit admin role values; cookie versus bearer transport; session revocation behavior; ranking/tie-break algorithm; how sessions/parties/results are managed; whether categories/lorum are intended features. These decisions should not block independent P0 repairs.

Completion record per task: status, date, changed files, checks and results, data migration/backups, remaining limitations, and updates to context/report. Future feature requests should name affected flows and preserve security invariants in context.md.

## Error-boundary follow-through (2026-10-08)

Server entrypoint now returns JSON 404 for unknown `/api` routes before the SPA fallback and safe JSON for malformed/oversized bodies and forwarded errors. Startup readiness, legacy scoring/category handlers and all asynchronous reads remain pending SEC-12/14; these tasks are not closed by this change.

## Session, logging, reads and startup continuation (2026-10-08)

SEC-05: one-hour bearer access token stored only in Redux memory. Reload/new tab requires login; no refresh tokens or cookies are issued. Older browser-storage tokens are deleted without reading/restoring them. API returns verified expiresAt; hook clears matching auth on timeout/focus/visibility/401, cancels old timers and prevents late failures for an older token clearing a newer session. Logout clears local auth immediately and calls authenticated server signout (all sessions revoked); server failure is reported and does not imply successful global revocation. Production Redux DevTools disabled. Six client tests cover storage removal, expiry, replacement race, current-token 401 and logout success/failure. Active-page XSS could still access memory; memory-only transport reduces persisted exposure, not all XSS risk.

SEC-04: removed remaining client debug payload logs and admin session dump. Central errors log only generated request ID and a fixed event; parser/database sentinel values do not appear in captured logs. Historical/provider logs and credentials were not accessed or rotated, so exposure review remains open.

SEC-07/08: election reads limited to 60/IP/15min with strict bounded slug and no query fields. Verified token restoration/signout limits are 60/30 respectively. Explicit projections and database limits cap full-response reads at 100 sessions, 120 parties, 1000 predictions; exceeding a cap returns safe 503 rather than biased/truncated chart data. Default endpoint slug is now `latest`; unknown slugs return 404. UI displays read failures. Shared multi-instance/per-account budgets and aggregate/pagination replacement remain open. Lazy Gmail TLS transport reads configured credentials after dotenv, verifies certificates, limits concurrency to 2 plus 20 queued jobs, and applies connection/greeting/socket timeouts. Stub transport tests cover configuration and overload, not a real invalid-certificate handshake; SEC-10 remains open for that check.

SEC-12: `server/app.js` creates the Express application without loading dotenv, connecting DB or listening. `server/index.js` validates DATABASE, JWT_SECRET >=32 bytes and PORT; awaits MongoDB and prediction index initialization before opening listener, bounds DB selection/request/header timeouts, disconnects on failed startup and emits safe fixed failure text. Mounted async reads forward errors; API/parser errors remain safe JSON. GET scoring disabled with 405 and undefined-model category mutations removed; their replacements remain SEC-14. Existing unmounted category code/admin scripts are outside this mounted-API completion and remain SEC-14 work.

Verification: 84 identity/recovery + 40 prediction + 42 application/read/startup assertions pass, plus bounded-mail stub checks and 6 client tests. Production client build succeeds in `/tmp/bet-knesset-session-security-build` with existing lint/tooling warnings. No live MongoDB, index build/concurrency exercise, SMTP/TLS delivery, log-provider access, credential rotation or deployment. Required development config: MongoDB URI, at least 32-byte JWT_SECRET; USER_MAIL/PASS_MAIL required when recovery delivery is used. Weak previous development secrets must be replaced locally; no compatibility exception.
