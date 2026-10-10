import { json } from '@sveltejs/kit';
import { readBody } from '#lib/server/body.ts';
import { cleanActor, cleanDate, cleanId, setDone } from '#lib/server/rota.ts';
import { mondayOf } from '#lib/rotation.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const body = await readBody(request);
	const actor = cleanActor(body.actor);
	const person = body.person_id == null ? null : cleanId(body.person_id);
	setDone(mondayOf(cleanDate(body.week)), cleanId(body.chore_id), person, body.done === true, actor);
	return json({ ok: true });
};
