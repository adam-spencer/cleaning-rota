import { json } from '@sveltejs/kit';
import { readBody } from '#lib/server/body.ts';
import { cleanAbsence, cleanActor, cleanId, deleteAbsence, updateAbsence } from '#lib/server/rota.ts';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ params, request }) => {
	const body = await readBody(request);
	updateAbsence(cleanId(params.id), cleanAbsence(body), cleanActor(body.actor));
	return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ params, request }) => {
	const body = await readBody(request);
	deleteAbsence(cleanId(params.id), cleanActor(body.actor));
	return json({ ok: true });
};
