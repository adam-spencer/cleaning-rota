import { parseISO } from './rotation';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTH_NAMES = [
	'January', 'February', 'March', 'April', 'May', 'June',
	'July', 'August', 'September', 'October', 'November', 'December'
];

/** "12 Oct" */
export function shortDate(iso: string): string {
	const d = new Date(parseISO(iso));
	return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** "12–18 Oct" or "28 Sep – 4 Oct" */
export function dateRange(from: string, to: string): string {
	if (from === to) return shortDate(from);
	const a = new Date(parseISO(from));
	const b = new Date(parseISO(to));
	return a.getUTCMonth() === b.getUTCMonth()
		? `${a.getUTCDate()}–${shortDate(to)}`
		: `${shortDate(from)} – ${shortDate(to)}`;
}

export function relativeWeek(n: number): string {
	if (n === 0) return 'This week';
	if (n === 1) return 'Next week';
	if (n === -1) return 'Last week';
	return n > 0 ? `In ${n} weeks` : `${-n} weeks ago`;
}
