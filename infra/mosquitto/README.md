# Locking down the broker

By default the broker allows anonymous clients, because the original device
firmware connects without credentials. That means anyone who can reach port
1883 can publish fake readings or `switch/<id>/pending` commands. The web
dashboard no longer publishes commands itself (it goes through the
authenticated `POST /switches/:id/action` API), so you can close this hole
once your devices can log in:

1. Create users (run from the repo root):

   ```bash
   docker compose run --rm mqtt mosquitto_passwd -c -b /mosquitto/config/passwd api '<api-password>'
   docker compose run --rm mqtt mosquitto_passwd -b /mosquitto/config/passwd device '<device-password>'
   ```

2. Copy `acl.example` to `acl` and add these lines to `mosquitto.conf`. Keep
   `allow_anonymous true`: the ACL limits anonymous clients (the dashboard)
   to read-only topics.

   ```
   password_file /mosquitto/config/passwd
   acl_file /mosquitto/config/acl
   ```

3. Set `MQTT_USERNAME=api` / `MQTT_PASSWORD=<api-password>` in `.env`, update
   device firmware to log in as `device`, and run `docker compose up -d`.
