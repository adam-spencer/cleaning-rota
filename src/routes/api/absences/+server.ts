import { json } from '@sveltejs/kit';
import { readBody } from '#lib/server/body.ts';
import { addAbsence, cleanAbsence, cleanActor } from '#lib/server/rota.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const body = await readBody(request);
	addAbsence(cleanAbsence(body), cleanActor(body.actor));
	return json({ ok: true });
};
