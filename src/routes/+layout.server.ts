import { getSettings, listPeople } from '#lib/server/rota.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = () => ({
	people: listPeople(),
	houseName: getSettings().house_name
});
