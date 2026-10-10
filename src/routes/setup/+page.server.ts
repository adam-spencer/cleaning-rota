import { getSettings, getWeek, listChores, recentActivity } from '#lib/server/rota.ts';
import { mondayOf, todayISO } from '#lib/rotation.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({
	chores: listChores(),
	preview: getWeek(mondayOf(todayISO())),
	settings: getSettings(),
	activity: recentActivity()
});
