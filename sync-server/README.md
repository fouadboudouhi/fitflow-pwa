# Volumora sync server

Optional. Keeps snapshots of each account's data on a server you run, so a reinstall does not lose anything.
Accounts are folders under `data/users/`; registration needs an invitation code.

Run it with `docker compose up -d --build`. It listens on 127.0.0.1:8787; put HTTPS in front of it, for example
Tailscale Funnel (`tailscale funnel --bg 8787`) or Caddy with `reverse_proxy 127.0.0.1:8787` and `request_body { max_size 64MB }`.

Administration, run on the server:

```
docker compose exec volumora-sync node admin.js invite        # one new invitation code
docker compose exec volumora-sync node admin.js invites       # all codes and who used them
docker compose exec volumora-sync node admin.js users         # accounts with size
docker compose exec volumora-sync node admin.js reset-password NAME
docker compose exec volumora-sync node admin.js delete-user NAME
```

Back up the `data/` folder like any other data. The server can read every account's data, so run it only for people who trust you.
