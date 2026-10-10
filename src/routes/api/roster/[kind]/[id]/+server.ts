import { error, json } from '@sveltejs/kit';
import { readBody } from '#lib/server/body.ts';
import { cleanActor, cleanId, cleanName, isRosterKind, removeFromRoster, updateRosterItem } from '#lib/server/rota.ts';
import { isColour, isShape } from '#lib/icons.ts';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ params, request }) => {
	if (!isRosterKind(params.kind)) error(404);
	const body = await readBody(request);
	updateRosterItem(
		params.kind,
		cleanId(params.id),
		{
			name: body.name === undefined ? undefined : cleanName(body.name),
			colour: isColour(body.colour) ? body.colour : undefined,
			shape: isShape(body.shape) ? body.shape : undefined
		},
		cleanActor(body.actor)
	);
	return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ params, request }) => {
	if (!isRosterKind(params.kind)) error(404);
	const body = await readBody(request);
	removeFromRoster(params.kind, cleanId(params.id), cleanActor(body.actor));
	return json({ ok: true });
};
