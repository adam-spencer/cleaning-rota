import { getMonth, getWeek, isMonth, listChores, listPeople } from '#lib/server/rota.ts';
import { addDays, isISODate, mondayOf, todayISO } from '#lib/rotation.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
	const today = todayISO();
	const current = mondayOf(today);
	const param = url.searchParams.get('week');
	const week = isISODate(param) ? mondayOf(param) : current;
	const m = url.searchParams.get('m');
	// Show the month the selected week mostly falls in (its Thursday).
	const month = isMonth(m) ? m : week === current ? today.slice(0, 7) : addDays(week, 3).slice(0, 7);
	return {
		today,
		week,
		current,
		assignments: getWeek(week),
		calendar: getMonth(month),
		empty: listPeople().length === 0 || listChores().length === 0
	};
};
