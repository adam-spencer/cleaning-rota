import { parseISO } from './rotation';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
export const MONTH_NAMES = [
	'January', 'February', 'March', 'April', 'May', 'June',
	'July', 'August', 'September', 'October', 'November', 'December'
];

/** "12 OCT" */
export function shortDate(iso: string): string {
	const d = new Date(parseISO(iso));
	return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** "12–18 OCT" or "28 SEP – 4 OCT" */
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
