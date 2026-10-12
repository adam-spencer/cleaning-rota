// Pure date + rotation logic. Dates are ISO 'YYYY-MM-DD' strings handled in UTC
// so the server's timezone never shifts a day. Weeks start on Monday.

export interface Person {
	id: number;
	name: string;
	colour: string;
	shape: string;
}

export interface Chore {
	id: number;
	name: string;
}

export interface Absence {
	id: number;
	person_id: number;
	start_date: string;
	end_date: string;
	note: string;
}

export interface Slot {
	chore: Chore | null;
	person: Person | null;
}

const DAY = 86_400_000;

export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function parseISO(iso: string): number {
	const [y, m, d] = iso.split('-').map(Number);
	return Date.UTC(y, m - 1, d);
}

export function toISO(t: number): string {
	return new Date(t).toISOString().slice(0, 10);
}

export function isISODate(s: unknown): s is string {
	return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && toISO(parseISO(s)) === s;
}

export function addDays(iso: string, n: number): string {
	return toISO(parseISO(iso) + n * DAY);
}

export function daysBetween(a: string, b: string): number {
	return Math.round((parseISO(b) - parseISO(a)) / DAY);
}

/** 0 = Monday … 6 = Sunday */
export function weekday(iso: string): number {
	return (new Date(parseISO(iso)).getUTCDay() + 6) % 7;
}

export function mondayOf(iso: string): string {
	return addDays(iso, -weekday(iso));
}

/** Local calendar date (the house's "today"), not UTC. */
export function todayISO(now = new Date()): string {
	const p = (n: number) => String(n).padStart(2, '0');
	return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

/** Whole weeks from the anchor's week to the given week (negative before the anchor). */
export function weekIndex(anchor: string, week: string): number {
	return Math.round(daysBetween(mondayOf(anchor), mondayOf(week)) / 7);
}

export interface Shift {
	week_start: string;
	shift: number;
}

/** The rotation index for a week: weeks since the anchor plus every manual nudge made on or before it. */
export function rotationIndex(anchor: string, shifts: Shift[], week: string): number {
	const monday = mondayOf(week);
	return shifts.reduce((n, s) => (s.week_start <= monday ? n + s.shift : n), weekIndex(anchor, monday));
}

function mod(a: number, n: number): number {
	return ((a % n) + n) % n;
}

/**
 * Chores and people are both padded to the same number of slots; each week every
 * person moves on to the next chore. Equal counts give a plain 1:1 rotation; if they
 * ever differ, a null person means an unassigned chore and a null chore a week off.
 * Weeks off are spread evenly between the chores, so with 4 people and 2 chores
 * everyone alternates a week on and a week off. Chores are listed first.
 */
export function rotate(people: Person[], chores: Chore[], index: number): Slot[] {
	const n = Math.max(people.length, chores.length);
	const choreAt: (Chore | null)[] = Array(n).fill(null);
	chores.forEach((chore, j) => (choreAt[Math.floor((j * n) / chores.length)] = chore));
	return choreAt
		.map((chore, i) => ({ chore, person: people[mod(i - index, n)] ?? null }))
		.sort((a, b) => Number(!a.chore) - Number(!b.chore));
}

/** Which days (Mon..Sun) of the week starting `weekStart` the person is away. */
export function awayDays(absences: Absence[], personId: number, weekStart: string): boolean[] {
	const weekEnd = addDays(weekStart, 6);
	const days = Array<boolean>(7).fill(false);
	for (const a of absences) {
		if (a.person_id !== personId || a.end_date < weekStart || a.start_date > weekEnd) continue;
		const from = Math.max(0, daysBetween(weekStart, a.start_date));
		const to = Math.min(6, daysBetween(weekStart, a.end_date));
		for (let d = from; d <= to; d++) days[d] = true;
	}
	return days;
}

/** e.g. null, "all week", "Mon–Wed", "Mon, Fri–Sun" */
export function describeAway(days: boolean[]): string | null {
	if (days.every(Boolean)) return 'all week';
	const ranges: string[] = [];
	for (let d = 0; d < 7; d++) {
		if (!days[d]) continue;
		let end = d;
		while (end + 1 < 7 && days[end + 1]) end++;
		ranges.push(end === d ? DAY_NAMES[d] : `${DAY_NAMES[d]}–${DAY_NAMES[end]}`);
		d = end;
	}
	return ranges.length ? ranges.join(', ') : null;
}
