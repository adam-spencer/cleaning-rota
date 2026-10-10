import { error } from '@sveltejs/kit';

export async function readBody(request: Request): Promise<Record<string, unknown>> {
	const body = await request.json().catch(() => null);
	if (!body || typeof body !== 'object' || Array.isArray(body)) error(400, 'Expected a JSON object');
	return body as Record<string, unknown>;
}
