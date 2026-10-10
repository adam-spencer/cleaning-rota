import { getMonth, isMonth } from '#lib/server/rota.ts';
import { mondayOf, todayISO } from '#lib/rotation.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
	const today = todayISO();
	const m = url.searchParams.get('m');
	return {
		today,
		current: mondayOf(today),
		calendar: getMonth(isMonth(m) ? m : today.slice(0, 7))
	};
};
