# Changelog

## 2.0.0 (2026-11-11): New look and complete feature set

### Design
- New GridSense identity: logo mark (a sensor pulse across a grid), teal
  palette, Inter typeface, favicon.
- New app shell: sidebar on desktop, bottom tab bar on mobile, account menu
  with theme switch (light / dark / system) and sign-out.
- Split-screen sign-in page with show-password and inline errors.
- Branded empty states, loading skeletons, 404 and error pages.

### New features
- **Overview page** with live tiles (devices online, switches running,
  average temperature and humidity) and a *Needs attention* list (offline
  devices, manual mode, quiet or silent sensors).
- **Device management:** add, edit and delete devices; add, rename and remove
  switches and sensors. New ones are auto-named "Switch N" / "Sensor N".
- **Switch control with confirmation:** "Starting…" until the device reports
  the new state, with a warning if it doesn't within 15 s.
- **Charts:** temperature and humidity over 1 h / 24 h / 7 d / 30 d, with live
  points appended and CSV download.
- **Connect dialog:** broker address, every ID and topic for a device with
  copy buttons, and a link to the device integration guide (PDF).
- **Settings:** edit profile, change password, and (for admins) manage the
  team: add members, change roles, deactivate, remove.
- **Roles and permissions:** Administrator (`*`), Operator
  (`devices.control`) and Viewer. The API enforces them, and the UI hides
  actions a role can't take. Nobody can deactivate, demote or delete
  themselves.

### API
- `PATCH /auth/profile`, `PATCH /auth/password`.
- Permission guard on every write endpoint; default roles seeded on start.
- Chart readings sorted oldest-first; date ranges averaged into time buckets
  (about 360 points), so long ranges stay fast.
- Case-insensitive login; readable 409 errors for duplicate names and emails.
- Sensor and switch names are unique per device, not globally (migration
  `20261111000000_names_unique_per_device`).

### Removed
- Lottie pump animation (135 KB), `moment`, `nuqs`, `next-client-cookies`,
  `react-icons` and other unused packages. The device page is about 90 KB
  lighter.

## 1.0.0 (2026-11-10): GridSense monorepo

Merged `iot-101-backend` and `iot-101-frontend` into one repository (full
history kept under `apps/api` and `apps/web`) and deployed it.

### Security
- Every API route needs a valid JWT. Before, only `/auth/validate` did, so
  anyone could list or create users, delete rooms or read data.
- Passwords are stored as bcrypt hashes. Old plain-text passwords still work
  once and are upgraded to a hash on that login.
- Login gives the same error for an unknown email and a wrong password.
- The seed file no longer contains a real email and password. The first admin
  comes from `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
- No committed JWT secret. The API refuses to start without a 32+ character
  `JWT_SECRET`.
- The browser no longer publishes switch commands to the broker. They go
  through the authenticated API, which respects manual control.
- Docker images no longer bake in `.env` and run as a non-root user. Only the
  proxy and the device MQTT port are public. Next.js upgraded to 14.2.35.

### Fixes
- Deleting a room failed with a foreign-key error once it had sensors or
  switches. Deletes now cascade (migration
  `20261110000000_cascade_deletes_and_reading_indexes`, which also adds
  indexes for latest-reading lookups).
- New rooms got random `Sensor 0-999` labels that collided with the unique
  constraint.
- Updating a sensor or switch without `room_id` crashed.
- The web Docker image was built without its API URL, so the deployed
  dashboard couldn't reach the API. It now uses same-origin `/api` and `/mqtt`.
- Every device card opened its own MQTT WebSocket and never closed it. The
  dashboard now shares one connection.
- Readings of 0 °C / 0 % showed as `--`.
- There was no way to sign out.
- The generated test stubs didn't compile. They are replaced with real tests.
