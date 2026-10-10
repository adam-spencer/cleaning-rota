import { error, json } from '@sveltejs/kit';
import { readBody } from '#lib/server/body.ts';
import { addToRoster, cleanActor, cleanOptionalActor, cleanId, cleanName, isRosterKind, reorderRoster } from '#lib/server/rota.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request }) => {
	if (!isRosterKind(params.kind)) error(404);
	const body = await readBody(request);
	addToRoster(params.kind, cleanName(body.name), cleanOptionalActor(body.actor));
	return json({ ok: true });
};

export const PUT: RequestHandler = async ({ params, request }) => {
	if (!isRosterKind(params.kind)) error(404);
	const body = await readBody(request);
	if (!Array.isArray(body.ids)) error(400, 'Expected ids');
	reorderRoster(params.kind, body.ids.map(cleanId), cleanActor(body.actor));
	return json({ ok: true });
};
