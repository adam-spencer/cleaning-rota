import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { firstUnused, PALETTE, SHAPE_NAMES } from '#lib/icons.ts';
import { mondayOf, todayISO } from '#lib/rotation.ts';

const path = process.env.DB_PATH || 'data/rota.db';
mkdirSync(dirname(path), { recursive: true });

export const db = new DatabaseSync(path);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

// Each entry runs once, in order; PRAGMA user_version tracks how many have run.
const migrations = [
	`
	CREATE TABLE people (
		id INTEGER PRIMARY KEY,
		name TEXT NOT NULL,
		sprite INTEGER NOT NULL DEFAULT 0,
		position INTEGER NOT NULL,
		active INTEGER NOT NULL DEFAULT 1
	);
	CREATE TABLE chores (
		id INTEGER PRIMARY KEY,
		name TEXT NOT NULL,
		icon TEXT NOT NULL DEFAULT 'sparkle',
		position INTEGER NOT NULL,
		active INTEGER NOT NULL DEFAULT 1
	);
	CREATE TABLE settings (
		key TEXT PRIMARY KEY,
		value TEXT NOT NULL
	);
	CREATE TABLE absences (
		id INTEGER PRIMARY KEY,
		person_id INTEGER NOT NULL REFERENCES people(id),
		start_date TEXT NOT NULL,
		end_date TEXT NOT NULL,
		note TEXT NOT NULL DEFAULT '',
		created_by INTEGER REFERENCES people(id),
		created_at TEXT NOT NULL DEFAULT (datetime('now'))
	);
	CREATE TABLE completions (
		week_start TEXT NOT NULL,
		chore_id INTEGER NOT NULL REFERENCES chores(id),
		person_id INTEGER REFERENCES people(id),
		done_by INTEGER REFERENCES people(id),
		done_at TEXT NOT NULL DEFAULT (datetime('now')),
		PRIMARY KEY (week_start, chore_id)
	);
	CREATE TABLE activity (
		id INTEGER PRIMARY KEY,
		actor_id INTEGER REFERENCES people(id),
		action TEXT NOT NULL,
		at TEXT NOT NULL DEFAULT (datetime('now'))
	);
	`,
	// Manual nudges to the rotation, applied from their week onwards so history doesn't change.
	`
	CREATE TABLE rotation_shifts (
		week_start TEXT PRIMARY KEY,
		shift INTEGER NOT NULL
	);
	`,
	// Each housemate's colour and shape (filled in below for existing people).
	`
	ALTER TABLE people ADD COLUMN colour TEXT NOT NULL DEFAULT '';
	ALTER TABLE people ADD COLUMN shape TEXT NOT NULL DEFAULT '';
	`
];

const { user_version } = db.prepare('PRAGMA user_version').get() as { user_version: number };
for (let v = user_version; v < migrations.length; v++) {
	db.exec('BEGIN');
	try {
		db.exec(migrations[v]);
		db.exec(`PRAGMA user_version = ${v + 1}`);
		db.exec('COMMIT');
	} catch (e) {
		db.exec('ROLLBACK');
		throw e;
	}
}

db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES ('anchor', ?), ('house_name', 'CLEANING ROTA')`).run(
	mondayOf(todayISO())
);

// Give anyone without a colour or shape the first ones not already taken.
{
	const people = db.prepare('SELECT id, colour, shape FROM people WHERE active = 1 ORDER BY position, id').all() as {
		id: number;
		colour: string;
		shape: string;
	}[];
	const colours = people.map((p) => p.colour).filter(Boolean);
	const shapes = people.map((p) => p.shape).filter(Boolean);
	for (const p of people) {
		if (p.colour && p.shape) continue;
		const colour = p.colour || firstUnused(PALETTE, colours);
		const shape = p.shape || firstUnused(SHAPE_NAMES, shapes);
		colours.push(colour);
		shapes.push(shape);
		db.prepare('UPDATE people SET colour = ?, shape = ? WHERE id = ?').run(colour, shape, p.id);
	}
}

export function transaction<T>(fn: () => T): T {
	db.exec('BEGIN');
	try {
		const result = fn();
		db.exec('COMMIT');
		return result;
	} catch (e) {
		db.exec('ROLLBACK');
		throw e;
	}
}
