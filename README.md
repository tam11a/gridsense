# GridSense

Monitor and control IoT devices in real time. Sensors stream temperature and
humidity over MQTT, the dashboard shows live readings and history, and
operators start/stop switches (aerators, pumps) remotely, unless a device
has been put under manual control on site.

GridSense merges the former `iot-101-backend` and `iot-101-frontend`
repositories. Their full git history is kept under `apps/api` and `apps/web`.

```
gridsense/
├── apps/
│   ├── api/        NestJS + Prisma (PostgreSQL) REST API and MQTT ingest
│   └── web/        Next.js 14 dashboard (shadcn/ui, React Query, live MQTT over WebSockets)
├── infra/
│   ├── caddy/      Reverse proxy: automatic HTTPS, /api → API, /mqtt → broker WebSockets, / → web
│   └── mosquitto/  MQTT broker config (+ optional auth/ACL guide)
├── docker-compose.yml       Production stack (db, mqtt, api, web, Caddy proxy)
└── docker-compose.dev.yml   Exposes db/broker ports for local development
```

## How it fits together

```
 devices ──MQTT:1883──► Mosquitto ◄──wss /mqtt── browser (live readings, read-only)
                           ▲  │
          switch/<id>/pending │ sensor/<id>/live, switch/<id>/response, room/<id>/toggle
                           │  ▼
 browser ──HTTPS /api──► NestJS API ──► PostgreSQL
```

| Topic                  | Publisher | Payload                         | Effect                                   |
| ---------------------- | --------- | ------------------------------- | ---------------------------------------- |
| `sensor/<id>/live`     | device    | `{"temp":24.1,"hum":61,"ref":<id>}` | stored as a reading; shown live         |
| `switch/<id>/pending`  | API       | `{"action":true}`               | device should switch on/off              |
| `switch/<id>/response` | device    | `{"status":true}`               | stored as the switch's current state     |
| `room/<id>/toggle`     | device    | `{"toggle":false}`              | `false` = manual control, remote disabled |
| `ping/<id>`            | device    | anything                        | dashboard shows Online for 10 s          |

Switch commands come from `POST /api/switches/:id/action`, which requires a
login and refuses (409) while the device is under manual control.

## Deploy (any Linux host with Docker)

Production runs at **https://gridsense.shakiulkarim.tech**.

```bash
git clone <this repo> gridsense && cd gridsense
cp .env.example .env
```

Fill in `.env`: `POSTGRES_PASSWORD`, `JWT_SECRET` (`openssl rand -hex 32`),
`ADMIN_EMAIL` / `ADMIN_PASSWORD`, and set `GRIDSENSE_DOMAIN` to a domain whose
DNS points at the server.

```bash
docker compose up -d --build
```

Caddy is the only public web entry point and gets and renews the HTTPS
certificate by itself. The API, dashboard and database are not exposed.

- Dashboard: `https://<domain>`
- API docs (Swagger): `https://<domain>/api/docs`
- Health: `https://<domain>/api/health`
- Devices connect to `mqtt://<domain>:1883`

Open ports 80, 443 and 1883. Migrations run and the admin account is created
on every API start (an existing admin is never overwritten). To update after
pulling new code: `docker compose up -d --build`.

## Local development

Requires Node 20+ and Docker (for Postgres and the broker).

```bash
npm install
cp .env.example .env                       # set POSTGRES_PASSWORD=gridsense, JWT_SECRET, ADMIN_*
npm run infra:up                           # postgres :5432, mosquitto :1883 / ws :9001
cp apps/api/.env.example apps/api/.env     # same JWT_SECRET / ADMIN_*; DATABASE_URL password = POSTGRES_PASSWORD
cp apps/web/.env.example apps/web/.env.local
npm run db:migrate && npm run db:seed
npm run dev                                # API :4000 (docs /docs), web :3000
```

| Script              | What it does                         |
| ------------------- | ------------------------------------ |
| `npm run dev`       | API (watch) + web (dev) together     |
| `npm run build`     | Production build of both apps        |
| `npm test`          | API unit tests                       |
| `npm run lint`      | Lint both apps                       |
| `npm run up`/`down` | Full Docker stack                    |

## What changed from iot-101

Security
- Every API route needs a valid JWT; before, only `/auth/validate` did, so
  anyone could list or create users, delete rooms or read data.
- Passwords are stored as bcrypt hashes. Old plain-text passwords still work
  once and are upgraded to a hash on that login.
- Login gives the same error for an unknown email and a wrong password.
- The seed file no longer contains a real email and password. The first admin
  comes from `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
- No committed JWT secret. The API refuses to start without a 32+ character `JWT_SECRET`.
- The browser no longer publishes switch commands to the broker. They go
  through the authenticated API, which respects manual control.
- The Docker image no longer bakes `.env` in and runs as a non-root user.
  Only the Caddy proxy and the device MQTT port are public. Next.js was upgraded to 14.2.35 for security patches.

Bugs
- Deleting a room failed with a foreign-key error once it had sensors or
  switches. Room deletes now cascade to sensors, switches and their history
  (migration `20261110000000_cascade_deletes_and_reading_indexes`, which also
  adds indexes for the latest-reading lookups).
- New rooms got random `Sensor 0-999` labels, which collide with the unique
  constraint. Labels are now derived from the room name.
- Updating a sensor or switch without `room_id` crashed.
- The web Docker image was built without `NEXT_PUBLIC_API_URL`, so the
  deployed dashboard could not reach the API. It now uses same-origin `/api`
  and `/mqtt` behind the proxy.
- Every device card and switch opened its own MQTT WebSocket and never closed
  it. The dashboard now shares one connection.
- Readings of 0 °C / 0 % showed as `--`.
- There was no way to sign out.
- The 16 generated test stubs didn't compile or run. They are replaced with tests
  of auth, room creation and switch commands.

## Still open

- The broker allows anonymous clients, so device firmware keeps working.
  Anyone who can reach port 1883 can publish fake readings or switch
  commands. Once devices can log in, follow `infra/mosquitto/README.md` to
  require credentials and apply the included ACL.
- Roles and permissions are stored but not enforced: any signed-in user can
  manage users.
