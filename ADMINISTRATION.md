# SuperAdmin

Set the existing account's numeric `role` to `5` directly in the `users` collection. Sign in again (or reload to restore the session), then use **ניהול האתר**. Role `0` is a participant, `1` is an ordinary admin, and only `5` can use `/api/admin`. Every request checks the current database account, not a role supplied by the browser. Existing registration and profile routes cannot grant this role.

The administration screens support:

- Sessions: create/edit dates, slug, name, description and closed status.
- Parties: select a session; create/edit party names, letters, descriptions and `minPredictedSeats` / `maxPredictedSeats`.
- Users: search by name/email, edit name/email/role, block accounts, and open their predictions.
- Predictions: filter by user/session, edit the complete 120-seat allocation even after the election ends, archive/restore, and export CSV (up to 10,000 filtered records).
- Groups: edit/create a group and select its creator; view members, add membership, edit active/left/blocked status, archive/restore memberships and groups.
- Actual results: enter all parties and exactly 120 seats after the election ends, set publication time, archive/restore results, preview the ranking without saving scores, and explicitly calculate/save scores.

Each list is paginated (25 records per page). Search and data access are server-side. Account responses do not expose password hashes, reset tokens or invitation codes. Group ownership changes establish an active membership for the new creator.

The election selector applies across admin screens and is retained in navigation links. Sessions, parties, predictions and results use the selected election; user lists show accounts with active predictions in it, and group lists show groups with active members who submitted predictions. Choosing all elections restores global lists. Prediction rows show the full party/seat breakdown, and the prediction screen also offers a searchable user selector.

On the public charts page, superAdmins can select any nonarchived, nondeleted group, including groups they have not joined. This read permission does not confer creator mutation permissions or add membership, and does not change winner eligibility. Ordinary participants and role-1 admins still see only their memberships. The all-group chart selector supports up to 1,000 groups and fails explicitly rather than silently truncating larger lists.

**Deletion means recoverable archival.** Archived records are hidden from public database reads and remain visible in the admin archive filter. Archived sessions hide their public election pages while retaining related records. Archiving groups preserves memberships. Archiving users prevents authentication and revokes existing tokens. Archiving a party referenced by active predictions/results is rejected; archive the session instead or remove those dependencies first. A group creator cannot be removed from membership until ownership changes. A superAdmin cannot archive, disable or demote their own account.

Changing predictions, session configuration, parties or actual results clears existing scores for the affected session. After changes, save complete results and explicitly recalculate. Original submission times are retained when editing predictions; they continue to determine chronological tie priority. Late newly added group members are not retroactively eligible for closed elections. There is no management audit log.

Validation:

```sh
npm test --prefix server
node server/test/admin-management.js
cd client
CI=true npm test -- --watchAll=false --runInBand
NODE_OPTIONS=--openssl-legacy-provider REACT_APP_API_URL=/api npm run build
```

The integration test requires MongoDB at `127.0.0.1:27017`, creates a uniquely named `bet_knesset_admin_test_*` database with synthetic data, and deletes only that database afterward. It never uses the application's configured `DATABASE` value. It covers real authentication, role checks, archival/public visibility, edits, memberships, results, score calculation/preview, exports and pagination.
