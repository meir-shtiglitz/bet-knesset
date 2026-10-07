# Security report

Date: 2026-10-07. Scope: current repository working tree, backend routes/middleware/models, frontend auth/recovery/prediction flows, environment key names and lockfiles. This original scan is retained below. Critical fixes were implemented on 2026-10-08; see the remediation status. Severity reflects plausible impact from inspected code, not a formal CVSS assessment.

## Remediation status — 2026-10-08

**SEC-01 and SEC-02 are fixed in source**, with 65 passing isolated HTTP regression assertions and a successful production client build (warnings). Shared authentication verifies signed, expiring, issuer/audience-bound JWTs and current user/session state; profile changes require ownership and current password for credential changes. Recovery uses server-generated, hashed, expiring, single-use proof with atomic password update/session revocation and server-side quotas. Browser recovery was updated. Email changes are disabled pending verification support. Existing tokens are invalidated by the required new claims; users must log in again. No deployed instance was changed.

Evidence: `server/test/critical-security.js`, `server/security/tokens.js`, `server/middlewears/user.js`, `server/routes/user.js`, User model and client auth/recovery changes; full completion notes in [tasks.md](tasks.md). Tests stub DB/mail, so live MongoDB, real SMTP and browser interaction remain unverified. Existing legacy password hashing and dependency vulnerabilities remain open. Several other findings have partial improvements documented in tasks; no additional finding is declared fully closed.

## High-severity continuation (2026-10-08)

SEC-03 is fixed in source: salted asynchronous scrypt replaces SHA256 in every password write/check. Development-only breaking policy rejects old hashes; reset/recreation is required, with no live data migration performed. See tasks.md for costs, policy and verification. SEC-04/07 received additional payload-log removal and authentication limits/32 KiB parser cap; they remain open for historical exposure assessment, distributed controls and bounded reads. Other high findings are still open.

## Original scan assessment (historical)

**At scan time, critical account takeover paths existed.** Anyone knowing an account email can call the profile endpoint to change its password and obtain its JWT. Anyone knowing a user ID can present an attacker-signed token to impersonate that user; public bet responses reveal participant IDs. Administrative access also becomes reachable if an admin ID is known. Fix these before adding features that rely on identity or roles.

## Original findings (evidence refers to pre-fix code)

| ID | Severity | Evidence | Impact / remediation |
| --- | --- | --- | --- |
| SEC-01 (fixed in source) | Critical at scan | `server/middlewears/user.js:8`; `server/routes/user.js:63` | `jwt.decode` trusts attacker-controlled claims without verifying signature. Token restoration even exchanges them for a genuine token. Verify signature, algorithm, expiration and subject in shared middleware; load existing user and enforce explicit admin role. |
| SEC-02 (fixed in source) | Critical at scan | `server/routes/user.js:96`; recovery client components | Public profile mutation selects by caller-supplied email, changes password/name/email and returns JWT. Recovery code is chosen and checked in browser only. Require authenticated ownership for profile updates and server-owned, expiring, single-use proof for reset. No mail code is needed to exploit the current endpoint. |
| SEC-03 | High | `server/model/user.js:43` | SHA256 is fast and its second argument does not salt this call. Local synthetic check produced identical hashes for two salts. Migrate to adaptive password hashing with legacy verification and reset strategy. |
| SEC-04 | High | `server/validation/user.js:4,14`; `server/middlewears/user.js:5,7`; `server/model/emails.js:17-19`; `server/routes/user.js:97,117` | Logs include plaintext passwords, bearer tokens, credential hashes, reset messages, and SMTP password if configured. Remove/redact sensitive logging and assess past logs for exposure; rotate affected secrets where exposure is confirmed. No environment values were included in scan artifacts. |
| SEC-05 | High | `server/routes/user.js:36,53,70,118`; cookie setters and signout | JWTs lack expiry; signout clears only cookie. Cookie uses incorrect `expire` option, lacks HttpOnly/Secure/SameSite; client stores tokens in localStorage. Establish transport, expiration and revocation semantics. XSS token theft is a conditional risk; no exploitable XSS was established. |
| SEC-06 | High | `server/routes/bets-route.js:13-39`; `server/model/bets.js` | No server seat-total/type/range or party-membership validation; ignores startDate/isClosed; no unique user/session index. Forged predictions contaminate rankings, concurrent inserts create duplicates. Enforce domain rules and atomic writes with database uniqueness. |
| SEC-07 | High | `server/routes/user.js:84-92`; `server/index.js:23-27`; public bets reader | No application rate limits for login, reset mail, signup or reads; mail has caller-supplied HTML content and no controlled template. Unlimited bet reads consume DB/memory/bandwidth. Parser does have its library default size limit; absence of an explicit limit is not absence of all body-size protection. Add endpoint budgets, bounded reads and safe email templates. Proxy controls are unknown. |
| SEC-08 | High | `server/routes/user.js:87,106`; absent schema validation on these endpoints | Recovery/profile queries use unvalidated values in Mongo filters. JSON objects can carry operators such as `$ne`; unintended account selection is possible depending on casting. Require scalar validated fields, reject operators and select profile target solely from verified identity. Operator exploit was not executed against a database. |
| SEC-09 | High (dependency advisory severity varies) | Lockfiles and saved npm audit JSON | 20 backend and 209 client/build affected packages reported. Upgrade and triage actual reachability, including runtime/build distinction. Counts are affected packages, not unique CVEs or confirmed application exploits. |
| SEC-10 | Medium | `server/model/emails.js:12` | SMTP TLS certificate validation explicitly disabled. A network attacker could intercept mail/credentials when this path runs. Restore certificate validation and test delivery with mocked transport. |
| SEC-11 | Medium, policy dependent | `server/routes/bets-route.js:43-78` | Unauthenticated response includes every bet, participant name/ID and all sessions without pagination. Public charts need some aggregate data; whether individual predictions/names should be public is unresolved. Minimize exposed fields and separate own-bet and aggregate access. No password/email exposure was found in this projection. |
| SEC-12 | Medium | `server/middlewears/user.js:6-10`; `server/routes/bets-route.js:18,55,81`; `server/routes/user.js:35,115`; `server/index.js:35-41` | Missing/malformed auth causes synchronous errors; async DB errors outside catches lack Express 4 promise handling. Empty sessions dereference undefined; saves are unawaited; unknown API GETs may return SPA HTML because req.baseUrl is not the full path. Add consistent error handling, awaited writes and API 404s. DB failure may leave listener running. |
| SEC-13 | Medium | `server/index.js:25`; `client/src/apiUrl.js:3` | Wildcard CORS, no application security headers, hardcoded localhost HTTP API. Restrict allowed origins, configure headers and production HTTPS URL. CORS is not an authentication barrier. Reverse-proxy TLS/headers are unverified. |
| SEC-14 | Medium integrity / maintenance | `server/routes/bets-route.js:81-136,140-157`; `server/routes/category.js`; model schemas | Mutating GET scoring operates across sessions, uses legacy numeric keys on new array-shaped bets, hardcoded results and unawaited saves. Category routes reference nonexistent model; several schema required flags are misspelled. Rebuild session-scoped scoring and retire or complete legacy routes; strengthen schemas. |

## Dependency evidence

Commands run separately in server and client: `npm audit --package-lock-only --ignore-scripts --json`. Full results are in [server audit](security/server-npm-audit.json) and [client audit](security/client-npm-audit.json).

| Scope | Low | Moderate | High | Critical | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Server | 3 | 5 | 9 | 3 | 20 |
| Client/build | 10 | 117 | 66 | 16 | 209 |

Direct backend packages flagged include body-parser, crypto-js, express, joi, jsonwebtoken, moment, mongoose, nodemailer and uuid. Direct client packages flagged include axios, lodash, react-router-dom, react-scripts and sweetalert2. Review individual advisory URLs, affected ranges and prerequisites in JSON. For example, a body-parser URL-encoded advisory does not establish exploitability in an app using JSON parsing only. Most frontend tooling is declared as dependencies, so npm's prod/dev labels do not cleanly identify browser runtime exposure. Do not apply `npm audit fix --force` without review.

## Verification and limitations

Source inspection established the missing authentication/verification checks. Local synthetic crypto checks used installed backend libraries, fake ID, dummy keys and synthetic password: attacker-key-signed token decoded successfully, verification under another key rejected it, and SHA256 results matched across distinct supplied salts. No live HTTP exploit, account modification, database access or real email was performed. Lockfile audits query dependency advisories but do not prove installed/deployed versions or exploitability. No full git-history secret scan, artifact/zip contents scan, hosting/IAM/network/TLS review, or penetration test was completed. No claim is made that secrets have never been committed or that unlisted vulnerabilities do not exist.

The user model accepts a role field, but current signup Joi rejects unknown fields by default; a direct signup role-injection finding is therefore not established. The admin middleware consults database role, but that does not repair a forged identity.

## Remediation references

Use [OWASP API Security Top 10](https://api-security.owasp.org/editions/2023/en/0x11-t10/) for authentication and resource-consumption threat categories. For password migration, [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) recommends adaptive password hashes such as Argon2id. For generic recovery responses and credential checks, see [OWASP Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html). These are remediation references, not evidence of repository behavior.
