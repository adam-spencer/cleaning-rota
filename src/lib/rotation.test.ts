import { describe, expect, it } from 'vitest';
import {
	addDays,
	awayDays,
	describeAway,
	isISODate,
	mondayOf,
	rotate,
	rotationIndex,
	weekIndex,
	type Absence,
	type Chore,
	type Person
} from './rotation';

const people: Person[] = ['Ana', 'Ben', 'Cat', 'Dev'].map((name, i) => ({ id: i + 1, name, colour: '', shape: '' }));
const chores: Chore[] = ['Kitchen', 'Bathroom', 'Hoover', 'Bins'].map((name, i) => ({ id: i + 10, name }));

const names = (slots: ReturnType<typeof rotate>) => slots.map((s) => s.person?.name ?? null);

describe('dates', () => {
	it('finds the Monday of any day, across month and year boundaries', () => {
		expect(mondayOf('2026-10-10')).toBe('2026-10-05'); // Saturday
		expect(mondayOf('2026-10-11')).toBe('2026-10-05'); // Sunday
		expect(mondayOf('2026-10-12')).toBe('2026-10-12'); // Monday
		expect(mondayOf('2027-01-01')).toBe('2026-12-28');
	});

	it('counts weeks from the anchor, including before it', () => {
		expect(weekIndex('2026-10-05', '2026-10-11')).toBe(0);
		expect(weekIndex('2026-10-05', '2026-10-12')).toBe(1);
		expect(weekIndex('2026-10-05', '2026-09-30')).toBe(-1);
		// DST change in late October must not break whole-week counting
		expect(weekIndex('2026-10-19', '2026-11-02')).toBe(2);
	});

	it('validates ISO dates', () => {
		expect(isISODate('2026-02-28')).toBe(true);
		expect(isISODate('2026-02-30')).toBe(false);
		expect(isISODate('26-2-1')).toBe(false);
		expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
	});
});

describe('rotate', () => {
	it('assigns 1:1 in roster order at the anchor week', () => {
		expect(names(rotate(people, chores, 0))).toEqual(['Ana', 'Ben', 'Cat', 'Dev']);
	});

	it('moves everyone on to the next chore each week and wraps', () => {
		expect(names(rotate(people, chores, 1))).toEqual(['Dev', 'Ana', 'Ben', 'Cat']);
		expect(names(rotate(people, chores, 4))).toEqual(names(rotate(people, chores, 0)));
		expect(names(rotate(people, chores, -1))).toEqual(['Ben', 'Cat', 'Dev', 'Ana']);
	});

	it('gives each person every chore once per cycle', () => {
		for (const p of people) {
			const done = [0, 1, 2, 3].map((w) => rotate(people, chores, w).find((s) => s.person === p)!.chore);
			expect(new Set(done).size).toBe(4);
		}
	});

	it('leaves chores unassigned when there are fewer people', () => {
		const slots = rotate(people.slice(0, 3), chores, 0);
		expect(slots).toHaveLength(4);
		expect(slots.filter((s) => s.person === null)).toHaveLength(1);
	});

	it('gives someone a week off when there are fewer chores', () => {
		const slots = rotate(people, chores.slice(0, 3), 2);
		expect(slots).toHaveLength(4);
		expect(slots.filter((s) => s.chore === null)).toHaveLength(1);
	});

	it('alternates weeks on and off, swapping chores, with half as many chores as people', () => {
		const two = chores.slice(0, 2);
		const weeks = [0, 1, 2, 3].map((w) => rotate(people, two, w));
		for (const slots of weeks) expect(slots.map((s) => s.chore?.name ?? null)).toEqual(['Kitchen', 'Bathroom', null, null]);
		for (const p of people) {
			const done = weeks.map((slots) => slots.find((s) => s.person === p)!.chore?.name ?? null);
			expect(done.filter(Boolean)).toHaveLength(2);
			expect(new Set(done.filter(Boolean)).size).toBe(2);
			expect(done.findIndex((c, w) => c !== null && done[w + 1] != null)).toBe(-1);
			expect(done[0] === null).not.toBe(done[3] === null); // also alternates across the wrap
		}
	});

	it('handles an empty roster', () => {
		expect(rotate([], [], 3)).toEqual([]);
	});
});

describe('rotationIndex', () => {
	const anchor = '2026-09-28';

	it('applies a nudge from its week onwards, leaving earlier weeks alone', () => {
		const shifts = [{ week_start: '2026-10-05', shift: 1 }];
		expect(rotationIndex(anchor, shifts, '2026-10-01')).toBe(0);
		expect(rotationIndex(anchor, shifts, '2026-10-05')).toBe(2);
		expect(rotationIndex(anchor, shifts, '2026-10-14')).toBe(3);
	});

	it('adds up several nudges', () => {
		const shifts = [
			{ week_start: '2026-10-05', shift: 1 },
			{ week_start: '2026-10-12', shift: -3 }
		];
		expect(rotationIndex(anchor, shifts, '2026-10-12')).toBe(0);
	});
});

describe('away', () => {
	const abs = (person_id: number, start_date: string, end_date: string): Absence => ({
		id: 0,
		person_id,
		start_date,
		end_date,
		note: ''
	});
	const week = '2026-10-12';

	it('clips absences to the week, including ones that straddle its edges', () => {
		const days = awayDays([abs(1, '2026-10-08', '2026-10-14'), abs(1, '2026-10-18', '2026-10-25')], 1, week);
		expect(days).toEqual([true, true, true, false, false, false, true]);
		expect(describeAway(days)).toBe('MON–WED, SUN');
	});

	it('ignores other people and non-overlapping absences', () => {
		const days = awayDays([abs(2, week, week), abs(1, '2026-10-19', '2026-10-20')], 1, week);
		expect(describeAway(days)).toBeNull();
	});

	it('describes whole weeks and single days', () => {
		expect(describeAway(awayDays([abs(1, '2026-10-01', '2026-10-31')], 1, week))).toBe('ALL WEEK');
		expect(describeAway(awayDays([abs(1, '2026-10-16', '2026-10-16')], 1, week))).toBe('FRI');
	});
});
