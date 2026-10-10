import { json } from '@sveltejs/kit';
import { readBody } from '#lib/server/body.ts';
import { cleanActor, cleanName, log, setSetting, shiftRotation } from '#lib/server/rota.ts';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ request }) => {
	const body = await readBody(request);
	const actor = cleanActor(body.actor);
	if (body.house_name !== undefined) {
		const name = cleanName(body.house_name);
		setSetting('house_name', name);
		log(actor, `renamed the house to ${name}`);
	}
	if (body.shift === 1 || body.shift === -1) shiftRotation(body.shift, actor);
	return json({ ok: true });
};
