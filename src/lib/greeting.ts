// A short hello for the header, chosen by time of day.

const GREETINGS: { from: number; options: ((name: string) => string)[] }[] = [
	{ from: 5, options: [(n) => `Good morning, ${n}`, (n) => `Morning, ${n}`, (n) => `Rise and shine, ${n}`] },
	{ from: 12, options: [(n) => `Good afternoon, ${n}`, (n) => `Afternoon, ${n}`, (n) => `Hey, ${n}`] },
	{ from: 17, options: [(n) => `Good evening, ${n}`, (n) => `Evening, ${n}`, (n) => `Hey there, ${n}`] },
	{ from: 22, options: [(n) => `Still up, ${n}?`, (n) => `Hi, ${n}`, (n) => `Night, ${n}`] }
];

/** Small stable hash so the same greeting sticks for that part of the day. */
function hash(s: string): number {
	let h = 0;
	for (const c of s) h = (Math.imul(h, 31) + c.charCodeAt(0)) | 0;
	return Math.abs(h);
}

export function greeting(name: string, now = new Date()): string {
	const hour = now.getHours();
	// Before 5am still counts as last night.
	const slot = [...GREETINGS].reverse().find((g) => hour >= g.from) ?? GREETINGS[GREETINGS.length - 1];
	// Shift back 5 hours so a late night keeps one greeting across midnight.
	const d = new Date(now.getTime() - 5 * 3_600_000);
	const day = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
	return slot.options[hash(`${day}:${slot.from}`) % slot.options.length](name);
}
