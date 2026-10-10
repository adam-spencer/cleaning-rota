import { error } from '@sveltejs/kit';
import { firstUnused, PALETTE, SHAPE_NAMES } from '#lib/icons.ts';
import { db, transaction } from './db';
import {
	addDays,
	awayDays,
	describeAway,
	isISODate,
	rotate,
	rotationIndex,
	mondayOf,
	todayISO,
	type Shift,
	type Absence,
	type Chore,
	type Person
} from '#lib/rotation.ts';

type Param = null | number | string;

// node:sqlite rows have a null prototype; copy them into plain objects for serialisation.
function all<T>(sql: string, ...params: Param[]): T[] {
	return db.prepare(sql).all(...params).map((r) => ({ ...r }) as T);
}

function get<T>(sql: string, ...params: Param[]): T | undefined {
	const row = db.prepare(sql).get(...params);
	return row ? ({ ...row } as T) : undefined;
}

function run(sql: string, ...params: Param[]) {
	return db.prepare(sql).run(...params);
}

// ---- validation -------------------------------------------------------------

export function cleanName(value: unknown): string {
	const name = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
	if (!name || name.length > 32) error(400, 'Names must be 1–32 characters');
	return name;
}

export function cleanDate(value: unknown): string {
	if (!isISODate(value)) error(400, 'Invalid date');
	return value;
}

export function cleanId(value: unknown): number {
	const id = Number(value);
	if (!Number.isInteger(id) || id <= 0) error(400, 'Invalid id');
	return id;
}

export function cleanActor(value: unknown): number {
	if (value == null) error(400, 'Pick who you are first');
	const id = cleanId(value);
	if (!get('SELECT 1 FROM people WHERE id = ? AND active = 1', id)) error(400, 'Pick who you are first');
	return id;
}

/** Like cleanActor, but nobody needs to say who they are while the house is still empty. */
export function cleanOptionalActor(value: unknown): number | null {
	if (value == null && !get('SELECT 1 FROM people WHERE active = 1')) return null;
	return cleanActor(value);
}

// ---- settings ---------------------------------------------------------------

export interface Settings {
	anchor: string;
	house_name: string;
}

export function getSettings(): Settings {
	const rows = all<{ key: string; value: string }>('SELECT key, value FROM settings');
	return Object.fromEntries(rows.map((r) => [r.key, r.value])) as unknown as Settings;
}

export function setSetting(key: keyof Settings, value: string) {
	run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, value);
}

/** Nudge everyone along by `by` chores, from the current week onwards. */
export function shiftRotation(by: number, actor: number) {
	run(
		`INSERT INTO rotation_shifts (week_start, shift) VALUES (?, ?)
		 ON CONFLICT(week_start) DO UPDATE SET shift = shift + excluded.shift`,
		mondayOf(todayISO()),
		by
	);
	log(actor, 'shifted the rotation');
}

// ---- activity ---------------------------------------------------------------

export function log(actorId: number | null, action: string) {
	run('INSERT INTO activity (actor_id, action) VALUES (?, ?)', actorId, action);
}

export interface ActivityRow {
	id: number;
	actor: string | null;
	action: string;
	at: string;
}

export function recentActivity(limit = 15): ActivityRow[] {
	return all<ActivityRow>(
		`SELECT a.id, p.name AS actor, a.action, a.at
		 FROM activity a LEFT JOIN people p ON p.id = a.actor_id
		 ORDER BY a.id DESC LIMIT ?`,
		limit
	);
}

// ---- roster -----------------------------------------------------------------

export function listPeople(): Person[] {
	return all<Person>('SELECT id, name, colour, shape FROM people WHERE active = 1 ORDER BY position, id');
}

export function listChores(): Chore[] {
	return all<Chore>('SELECT id, name FROM chores WHERE active = 1 ORDER BY position, id');
}

export type RosterKind = 'people' | 'chores';

export function isRosterKind(kind: string): kind is RosterKind {
	return kind === 'people' || kind === 'chores';
}

function nameOf(kind: RosterKind, id: number): string {
	const row = get<{ name: string }>(`SELECT name FROM ${kind} WHERE id = ?`, id);
	if (!row) error(404, 'Not found');
	return row.name;
}

export function addToRoster(kind: RosterKind, name: string, actor: number | null) {
	const { next } = get<{ next: number }>(`SELECT COALESCE(MAX(position), -1) + 1 AS next FROM ${kind}`)!;
	if (kind === 'people') {
		const people = listPeople();
		const colour = firstUnused(PALETTE, people.map((p) => p.colour));
		const shape = firstUnused(SHAPE_NAMES, people.map((p) => p.shape));
		run('INSERT INTO people (name, colour, shape, position) VALUES (?, ?, ?, ?)', name, colour, shape, next);
		log(actor, `added housemate ${name}`);
	} else {
		run('INSERT INTO chores (name, position) VALUES (?, ?)', name, next);
		log(actor, `added chore ${name}`);
	}
}

export function updateRosterItem(
	kind: RosterKind,
	id: number,
	changes: { name?: string; colour?: string; shape?: string },
	actor: number
) {
	const old = nameOf(kind, id);
	if (changes.name !== undefined && changes.name !== old) {
		run(`UPDATE ${kind} SET name = ? WHERE id = ?`, changes.name, id);
		log(actor, `renamed ${old} to ${changes.name}`);
	}
	if (kind === 'people' && changes.colour !== undefined) {
		run('UPDATE people SET colour = ? WHERE id = ?', changes.colour, id);
	}
	if (kind === 'people' && changes.shape !== undefined) {
		run('UPDATE people SET shape = ? WHERE id = ?', changes.shape, id);
	}
}

/** Soft delete, so history and activity keep their names. */
export function removeFromRoster(kind: RosterKind, id: number, actor: number) {
	const name = nameOf(kind, id);
	run(`UPDATE ${kind} SET active = 0 WHERE id = ?`, id);
	log(actor, `removed ${kind === 'people' ? 'housemate' : 'chore'} ${name}`);
}

export function reorderRoster(kind: RosterKind, ids: number[], actor: number) {
	transaction(() => {
		const stmt = db.prepare(`UPDATE ${kind} SET position = ? WHERE id = ?`);
		ids.forEach((id, i) => stmt.run(i, id));
	});
	log(actor, `reordered ${kind === 'people' ? 'housemates' : 'chores'}`);
}

// ---- weeks ------------------------------------------------------------------

export interface Assignment {
	chore: Chore | null;
	person: Person | null;
	away: string | null;
	done: { by: string | null; at: string } | null;
}

export function getWeek(weekStart: string): Assignment[] {
	const { anchor } = getSettings();
	const people = listPeople();
	const shifts = all<Shift>('SELECT week_start, shift FROM rotation_shifts');
	const slots = rotate(people, listChores(), rotationIndex(anchor, shifts, weekStart));
	const isPast = weekStart < mondayOf(todayISO());
	const absences = absencesBetween(weekStart, addDays(weekStart, 6));
	const completions = new Map(
		all<{ chore_id: number; person_id: number | null; by: string | null; done_at: string }>(
			`SELECT c.chore_id, c.person_id, p.name AS by, c.done_at
			 FROM completions c LEFT JOIN people p ON p.id = c.done_by
			 WHERE c.week_start = ?`,
			weekStart
		).map((c) => [c.chore_id, c])
	);

	return slots.map(({ chore, person }) => {
		const c = chore ? completions.get(chore.id) : undefined;
		// In past weeks a finished chore stays credited to whoever did it, even if the roster changed since.
		if (isPast && c && c.person_id !== person?.id) person = people.find((p) => p.id === c.person_id) ?? person;
		return {
			chore,
			person,
			away: person ? describeAway(awayDays(absences, person.id, weekStart)) : null,
			done: c ? { by: c.by, at: c.done_at } : null
		};
	});
}

export function setDone(weekStart: string, choreId: number, personId: number | null, done: boolean, actor: number) {
	const chore = nameOf('chores', choreId);
	if (done) {
		run(
			`INSERT INTO completions (week_start, chore_id, person_id, done_by) VALUES (?, ?, ?, ?)
			 ON CONFLICT DO UPDATE SET done_by = excluded.done_by, done_at = datetime('now')`,
			weekStart,
			choreId,
			personId,
			actor
		);
		log(actor, `ticked off ${chore}`);
	} else {
		run('DELETE FROM completions WHERE week_start = ? AND chore_id = ?', weekStart, choreId);
		log(actor, `un-ticked ${chore}`);
	}
}

// ---- absences ---------------------------------------------------------------

export function absencesBetween(from: string, to: string): Absence[] {
	return all<Absence>(
		`SELECT a.id, a.person_id, a.start_date, a.end_date, a.note
		 FROM absences a JOIN people p ON p.id = a.person_id AND p.active = 1
		 WHERE a.end_date >= ? AND a.start_date <= ?
		 ORDER BY a.start_date, a.id`,
		from,
		to
	);
}

export interface AbsenceInput {
	person_id: number;
	start_date: string;
	end_date: string;
	note: string;
}

export function cleanAbsence(body: Record<string, unknown>): AbsenceInput {
	let start_date = cleanDate(body.start_date);
	let end_date = cleanDate(body.end_date);
	if (end_date < start_date) [start_date, end_date] = [end_date, start_date];
	const note = typeof body.note === 'string' ? body.note.trim().slice(0, 80) : '';
	return { person_id: cleanActor(body.person_id), start_date, end_date, note };
}

function describeAbsence(a: AbsenceInput) {
	const who = nameOf('people', a.person_id);
	return a.start_date === a.end_date ? `${who} on ${a.start_date}` : `${who} ${a.start_date} → ${a.end_date}`;
}

export function addAbsence(a: AbsenceInput, actor: number) {
	run(
		'INSERT INTO absences (person_id, start_date, end_date, note, created_by) VALUES (?, ?, ?, ?, ?)',
		a.person_id,
		a.start_date,
		a.end_date,
		a.note,
		actor
	);
	log(actor, `marked away: ${describeAbsence(a)}`);
}

export function updateAbsence(id: number, a: AbsenceInput, actor: number) {
	const res = run(
		'UPDATE absences SET person_id = ?, start_date = ?, end_date = ?, note = ? WHERE id = ?',
		a.person_id,
		a.start_date,
		a.end_date,
		a.note,
		id
	);
	if (!res.changes) error(404, 'Not found');
	log(actor, `changed time away: ${describeAbsence(a)}`);
}

export function deleteAbsence(id: number, actor: number) {
	const a = get<AbsenceInput>('SELECT person_id, start_date, end_date, note FROM absences WHERE id = ?', id);
	if (!a) error(404, 'Not found');
	run('DELETE FROM absences WHERE id = ?', id);
	log(actor, `deleted time away: ${describeAbsence(a)}`);
}

// ---- calendar ---------------------------------------------------------------

export function isMonth(value: unknown): value is string {
	return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

/** Every month needs at most 6 week rows; always showing 6 keeps the calendar the same size. */
const GRID_WEEKS = 6;

/** A Monday-first month grid (always 6 weeks, padded with neighbouring days), plus absences overlapping it. */
export function getMonth(month: string) {
	const gridStart = mondayOf(`${month}-01`);
	const weeks = GRID_WEEKS;
	return {
		month,
		gridStart,
		weeks,
		absences: absencesBetween(gridStart, addDays(gridStart, weeks * 7 - 1))
	};
}
