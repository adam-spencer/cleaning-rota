# Cleaning Rota

A no-login weekly chore rota for a houseshare. SvelteKit + Node's built-in SQLite (`node:sqlite`, Node ≥ 24).

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # rotation logic
npm run build && DB_PATH=/var/lib/cleaning-rota/rota.db PORT=3000 node build
```

- **Week** — this week's chores; tick them off, ← → to look at other weeks.
- **Away** — calendar of time away; tap a start and end day (or drag) to add.
- **Setup** — housemates, chores, list order (= rotation order), nudge the rotation.

Each week everyone moves one chore down the list. People who are away are flagged, never reassigned.
Data lives in `data/rota.db` by default (`DB_PATH` overrides).

## Deploying to the Pi

Runs in Docker on a Raspberry Pi (`ssh pi` must work — see `~/.ssh/config`). One-off setup on the Mac:

```sh
docker context create pi --docker "host=ssh://pi"
```

Then:

```sh
npm run deploy     # builds on the Pi and restarts the container
npm run logs       # tail the server logs
```

The app is served on port 80 at `http://cleaning-rota.local`. The database lives in the `cleaning-rota-data` Docker volume, so it survives rebuilds.
