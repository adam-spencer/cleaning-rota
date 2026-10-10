<script lang="ts">
	import { send } from '#lib/api.ts';
	import { GLYPHS, PALETTE, SHAPE_NAMES } from '#lib/icons.ts';
	import { me } from '#lib/me.svelte.ts';
	import type { Person } from '#lib/rotation.ts';
	import { pop } from '#lib/transitions.ts';
	import Dialog from '#lib/components/Dialog.svelte';
	import Pixel from '#lib/components/Pixel.svelte';
	import RosterList from '#lib/components/RosterList.svelte';
	import Shape from '#lib/components/Shape.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	/** Whose colour/shape is being edited; local copy so choices show instantly. */
	let styling = $state<Person | null>(null);

	const current = $derived(data.people.find((p) => p.id === me.id));
	const mismatch = $derived(data.people.length && data.chores.length && data.people.length !== data.chores.length);

	function restyle(changes: Partial<Pick<Person, 'colour' | 'shape'>>) {
		if (!styling) return;
		styling = { ...styling, ...changes };
		send('PATCH', `/api/roster/people/${styling.id}`, changes);
	}

	function renameHouse(input: HTMLInputElement) {
		const name = input.value.trim();
		if (!name) input.value = data.houseName;
		else if (name !== data.houseName) send('PATCH', '/api/settings', { house_name: name });
	}

	function timeAgo(at: string): string {
		const mins = Math.round((Date.now() - Date.parse(at.replace(' ', 'T') + 'Z')) / 60000);
		if (mins < 1) return 'just now';
		if (mins < 60) return `${mins}m ago`;
		if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`;
		return `${Math.round(mins / 60 / 24)}d ago`;
	}
</script>

<div class="cols">
	<section>
		<h2>Housemates</h2>
		<p class="hint">Tap a shape to change its colour and shape.</p>
		<RosterList kind="people" items={data.people} noun="housemate" placeholder="Name">
			{#snippet lead(person)}
				<button class="look" onclick={() => (styling = { ...person })} aria-label="Colour and shape for {person.name}">
					<Shape shape={person.shape} colour={person.colour} size={18} />
				</button>
			{/snippet}
		</RosterList>
	</section>

	<section>
		<h2>Chores</h2>
		<p class="hint">The order here is the order of the rotation.</p>
		<RosterList kind="chores" items={data.chores} noun="chore" placeholder="e.g. Kitchen" />
	</section>
</div>

<div class="cols">
	<section>
		<h2>Rotation</h2>
		<p class="hint">Everyone moves one chore down each week. Nudge it if this week is wrong.</p>
		{#if mismatch}
			<p class="warn">
				{data.people.length} housemates, {data.chores.length} chores —
				{data.people.length > data.chores.length ? 'someone gets a week off each week' : 'a chore goes unassigned each week'}.
			</p>
		{/if}
		{#if data.preview.length}
			<div class="rotation">
				<ul class="preview">
					{#each data.preview as a (a.chore?.id ?? `p${a.person?.id}`)}
						<li>
							{#key a.person?.id}
								<span class="pv-person" in:pop>
									{#if a.person}<Shape shape={a.person.shape} colour={a.person.colour} size={12} />{/if}
									{a.person?.name ?? 'nobody'}
								</span>
							{/key}
							<span class="pv-arrow">→</span>
							<span class="pv-chore">{a.chore?.name ?? 'week off'}</span>
						</li>
					{/each}
				</ul>
				<div class="nudge">
					<button class="btn icon" onclick={() => send('PATCH', '/api/settings', { shift: -1 })} aria-label="Nudge rotation back">
						<Pixel rows={GLYPHS.up} size={14} />
					</button>
					<button class="btn icon" onclick={() => send('PATCH', '/api/settings', { shift: 1 })} aria-label="Nudge rotation forward">
						<Pixel rows={GLYPHS.down} size={14} />
					</button>
				</div>
			</div>
		{:else}
			<p class="hint">Add housemates and chores to see this week's rota.</p>
		{/if}
	</section>

	<section>
		<h2>On this device</h2>
		<div class="me">
			{#if current}
				<Shape shape={current.shape} colour={current.colour} size={16} />
				<span>You're <b>{current.name}</b></span>
			{:else}
				<span class="hint-inline">Nobody picked yet</span>
			{/if}
			<button class="btn" onclick={() => me.ask()}>{current ? 'Change' : 'Pick'}</button>
		</div>

		<h2 class="spaced">House name</h2>
		<input
			class="field"
			value={data.houseName}
			maxlength="32"
			aria-label="House name"
			onchange={(e) => renameHouse(e.currentTarget)}
			onkeydown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
		/>
	</section>
</div>

<section>
	<h2>Recent changes</h2>
	{#if data.activity.length}
		<ul class="activity">
			{#each data.activity as item (item.id)}
				<li>
					<span><b>{item.actor ?? 'Someone'}</b> {item.action}</span>
					<span class="label">{timeAgo(item.at)}</span>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="hint">Nothing yet.</p>
	{/if}
</section>

{#if styling}
	<Dialog title={styling.name} onclose={() => (styling = null)}>
		<p class="label">Colour</p>
		<div class="swatches">
			{#each PALETTE as colour, i (colour)}
				<button
					class="swatch"
					class:chosen={styling.colour === colour}
					style:background={colour}
					aria-label="Colour {i + 1}"
					aria-pressed={styling.colour === colour}
					onclick={() => restyle({ colour })}
				></button>
			{/each}
		</div>
		<p class="label">Shape</p>
		<div class="shapes">
			{#each SHAPE_NAMES as shape (shape)}
				<button
					class="shape"
					class:chosen={styling.shape === shape}
					aria-label={shape}
					aria-pressed={styling.shape === shape}
					onclick={() => restyle({ shape })}
				>
					<Shape {shape} colour={styling.colour} size={24} />
				</button>
			{/each}
		</div>
		<div class="done-row">
			<button class="btn solid" onclick={() => (styling = null)}>Done</button>
		</div>
	</Dialog>
{/if}

<style>
	.cols {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 380px), 1fr));
		gap: 0 56px;
	}

	section {
		margin-bottom: 40px;
	}

	h2 {
		font-size: 16px;
		padding-bottom: 6px;
		margin-bottom: 8px;
		border-bottom: 2px solid var(--ink);
	}

	h2.spaced {
		margin-top: 28px;
	}

	.hint {
		margin: 0 0 16px;
		color: var(--mid);
		font-size: 15px;
	}

	.look {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		flex: none;
		border: 0;
		background: none;
		cursor: pointer;
	}

	.look:hover {
		background: var(--paper-2);
	}

	.warn {
		margin: 0 0 16px;
		padding: 8px 12px;
		box-shadow: inset 0 0 0 2px var(--ink);
		font-size: 15px;
	}

	.rotation {
		display: flex;
		align-items: center;
		gap: 20px;
	}

	.preview {
		flex: 1;
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.preview li {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		gap: 12px;
		align-items: center;
	}

	.pv-person {
		display: flex;
		align-items: center;
		gap: 8px;
		font-weight: 600;
	}

	.pv-arrow,
	.pv-chore {
		color: var(--mid);
	}

	.nudge {
		display: flex;
		flex-direction: column;
		gap: 16px;
		padding: 4px;
	}

	.me {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 4px;
	}

	.me .btn {
		margin-left: auto;
	}

	.hint-inline {
		color: var(--mid);
	}

	.activity {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
		font-size: 15px;
		max-height: 260px;
		overflow: auto;
	}

	.activity li {
		display: flex;
		justify-content: space-between;
		gap: 12px;
	}

	.activity .label {
		flex: none;
		font-size: 12px;
	}

	.swatches,
	.shapes {
		display: grid;
		grid-template-columns: repeat(8, 1fr);
		gap: 8px;
		margin: 8px 0 20px;
	}

	.swatch {
		aspect-ratio: 1;
		border: 0;
		cursor: pointer;
	}

	.swatch.chosen {
		box-shadow:
			0 0 0 3px var(--paper),
			0 0 0 6px var(--ink);
	}

	.shapes {
		grid-template-columns: repeat(4, 1fr);
	}

	.shape {
		display: grid;
		place-items: center;
		aspect-ratio: 1;
		border: 0;
		background: var(--paper-2);
		cursor: pointer;
	}

	.shape.chosen {
		box-shadow: inset 0 0 0 var(--px) var(--ink);
	}

	.done-row {
		display: flex;
		justify-content: flex-end;
		padding: 4px;
	}
</style>
