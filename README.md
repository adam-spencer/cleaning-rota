# Cleaning Rota

A weekly chore rota for a houseshare, with no logins. Built with SvelteKit and Node's built-in SQLite (`node:sqlite`), so it needs Node 24 or later.

## How it works

The app has three pages:

- **Rota**: this week's chores. Tick them off as they're done, and use ← → to view other weeks.
- **Calendar**: a calendar of time away. Tap a start and end day (or drag across them) to add a period.
- **Setup**: manage housemates and chores. The order of the list sets the rotation order, and you can nudge the rotation forward or back.

Each week, everyone moves one chore down the list. Anyone who is away that week is flagged, but their chore is never reassigned.

Data is stored in `data/rota.db` by default. Set `DB_PATH` to use a different location.

## Getting started

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # run the rotation logic tests
```

## Deploying with Docker

The included `Dockerfile` and `compose.yaml` run the app in a container on port 80, with the database kept in a `cleaning-rota-data` Docker volume so it survives rebuilds. You can run it locally with `docker compose up -d --build`.

The `deploy` and `logs` npm scripts target a remote machine (eg Raspberry Pi) through a Docker context named `pi`. To use them, make sure you can `ssh` to the machine, then create the context, replacing `pi` in the host URL with your SSH host or alias:

```sh
docker context create pi --docker "host=ssh://pi"
```

Then:

```sh
npm run deploy     # build on the remote machine and restart the container
npm run logs       # tail the server logs
```

The app will then be available on port 80 of that machine (for example `http://<hostname>.local` on a local network).
