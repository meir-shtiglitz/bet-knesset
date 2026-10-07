# Security and maintenance tasks

Created 2026-10-07. **SEC-01 and SEC-02 are done in source as of 2026-10-08**; other tasks remain open (some received partial improvements). Deployment and live service validation have not been performed. Read [context.md](context.md) and [security-report.md](security-report.md) first. IDs map one-to-one to report findings. Work in priority order, preserve existing user edits, and record files changed, migration steps and verification evidence when closing a task. Use synthetic accounts, an isolated DB and stubbed mail for verification.

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

## Partial follow-through on other findings

SEC-04: sensitive auth/validation/mail logs removed; remaining client state/bet logs, historic-log review and rotations are open. SEC-05: one-hour bearer tokens, no new token cookies, version-based password-change/reset/logout revocation; localStorage, refresh design and UI logout remain open. SEC-07: recovery quota/cooldown and plain-text templates added; login/signup/read limits and shared multi-instance quotas remain open. SEC-08: recovery/profile boundaries hardened; broader route validation remains open. SEC-10: certificate bypass removed and sendMail promise returned; real/invalid-certificate delivery verification remains open. SEC-12: auth routes now await writes and handle errors; entrypoint/bets/global errors remain open.

## SEC-03 — Password hash migration

Priority P1; dependencies: coordinate SEC-02. Files: `server/model/user.js`, auth/reset handlers, dependency files.

Replace SHA256 with Argon2id or another reviewed adaptive password hash. Document chosen cost and benchmark on deployment hardware. Existing `hashPasword` records must remain verifiable through an explicit legacy path only; rehash on successful login or force reset by documented policy. New passwords never use legacy hashing. Preserve field compatibility or provide migration. Apply one server password policy consistently and handle reasonable maximum lengths.

Acceptance: equal passwords receive different salted hashes; old account can log in/migrate per policy; wrong password fails before and after migration; reset stores modern hash; no plaintext persistence; failures do not corrupt records. Legacy stored data is backed up before migration.

## SEC-04 — Remove sensitive logs and assess exposure

Priority P1; dependencies: none. Files: validation, auth middleware/routes, email module and bet route logging.

Replace full payload/header/user/transport logging with minimal structured events; redact password, JWT, hash, salt, reset proof and SMTP/database credentials. Check application/log-provider retention and access without copying secrets into reports. Rotate SMTP/JWT/DB credentials only where exposure warrants it; communicate session invalidation effects. The current environment snapshot does not establish that SMTP credentials were configured.

Acceptance: capture logs during success and failure paths using sentinel secrets; none appear. Useful request IDs and safe failure categories remain. Record any exposure review limitations and completed rotation actions.

## SEC-05 — Token lifetime, transport and revocation

Priority P1; dependencies: SEC-01/02. Files: JWT issuers, signout, user schema/session storage, Redux auth and API callers.

Choose one explicit transport: HttpOnly Secure SameSite cookie with CSRF protection for mutations, or short-lived bearer access tokens with a secure refresh design. Stop setting duplicate insecure cookies if bearer-only. Use valid `expires`/`maxAge` options where cookies are used. Enforce access expiry, refresh expiry/rotation if implemented, and revocation following password reset/change or account disablement. Make logout semantics explicit and remove client credentials. Existing indefinite tokens need an invalidation strategy.

Acceptance: expiry enforced, old sessions rejected after reset, logout behaves as documented, cookie attributes verified where applicable, refresh replay rejected if supported. If cookie auth is selected, cross-site mutation attempts fail and allowed frontend origins still work.

## SEC-06 — Enforce prediction rules and uniqueness

Priority P1; dependencies: SEC-01 and SEC-12 error foundation. Files: `server/routes/bets-route.js`, bets/party/session models, `voted.jsx` and response adapters.

Validate body shape, ObjectIds, bounded party count, numeric finite integer seats 0–120 and total exactly 120. Check each party belongs to requested session. Enforce valid start/end times and isClosed on server; decide zero/omitted party semantics and exact deadline inclusivity. Add compound unique `{userId, sessionId}` index after reviewing/deduplicating existing records with backup. Use atomic upsert with update validators; preserve initial creation time. Address deadline-crossing writes if scoring requires strict cutoff. Return consistent populated user shape or normalize client expectations.

Acceptance: negative/fraction/string/oversized/incorrect-total values and cross-session parties fail; closed/future/expired sessions reject; valid 120-seat bet creates/updates own record; parallel first submissions leave one record; missing references fail. Verify client renders the mutation without assuming populated fields that are absent.

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

## SEC-12 — Consistent errors and reliable persistence

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
