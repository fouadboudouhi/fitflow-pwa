# Volumora sync server

Optional. Keeps snapshots of one person's data on their own server, so a reinstall does not lose anything.

Run it with `docker compose up -d --build` next to a reverse proxy that handles HTTPS, for example Caddy:

```
sync.example.com {
	reverse_proxy volumora-sync:8787
	request_body {
		max_size 64MB
	}
}
```

Data lives in the `data` volume: `auth.sha256` holds the hash of the access code, `snapshots/` the versions. To set a new code, delete `auth.sha256`; the next upload sets it. Back the volume up like any other data.
