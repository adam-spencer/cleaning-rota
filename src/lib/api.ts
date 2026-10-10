import { refreshAll } from '$app/navigation';
import { me } from './me.svelte';
import { toast } from './toast.svelte';

/** Send a change as the current person (asking who they are if needed), then refresh page data. */
export async function send(
	method: string,
	url: string,
	body: Record<string, unknown> = {},
	{ anonymous = false } = {}
): Promise<boolean> {
	const actor = anonymous ? null : await me.require();
	if (actor == null && !anonymous) return false;
	try {
		const res = await fetch(url, {
			method,
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ ...body, actor })
		});
		if (!res.ok) {
			const message = await res
				.json()
				.then((j) => j.message as string)
				.catch(() => 'Something went wrong');
			if (message.startsWith('Pick who')) me.set(null);
			toast.show(message);
			return false;
		}
	} catch {
		toast.show("Couldn't reach the rota — are you on the house wifi?");
		return false;
	}
	await refreshAll();
	return true;
}
