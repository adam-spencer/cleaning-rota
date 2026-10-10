<script lang="ts">
	import { send } from '#lib/api.ts';
	import { dateRange, relativeWeek } from '#lib/format.ts';
	import { GLYPHS } from '#lib/icons.ts';
	import { addDays, daysBetween, type Chore, type Person } from '#lib/rotation.ts';
	import { draw, slot } from '#lib/transitions.ts';
	import Pixel from './Pixel.svelte';
	import Shape from './Shape.svelte';

	interface Assignment {
		chore: Chore | null;
		person: Person | null;
		away: string | null;
		done: { by: string | null; at: string } | null;
	}

	let {
		week,
		currentWeek,
		assignments,
		dir,
		onweek,
		ontoday
	}: {
		week: string;
		currentWeek: string;
		assignments: Assignment[];
		/** +1 when moving forward in time, -1 backwards: decides which way names slide. */
		dir: number;
		onweek: (by: number) => void;
		/** Jump back to the current week. */
		ontoday: () => void;
	} = $props();

	/** Ticks shown immediately while the request is in flight. */
	let optimistic = $state<Record<number, boolean>>({});

	const offset = $derived(daysBetween(currentWeek, week) / 7);

	function isDone(a: Assignment): boolean {
		return a.chore ? (optimistic[a.chore.id] ?? a.done !== null) : false;
	}

	async function toggle(a: Assignment) {
		if (!a.chore) return;
		const id = a.chore.id;
		const done = !isDone(a);
		optimistic[id] = done;
		await send('POST', '/api/completions', { week, chore_id: id, person_id: a.person?.id ?? null, done });
		delete optimistic[id];
	}
</script>

<div class="chores">
	<div class="weekbar">
		<button class="nav" onclick={() => onweek(-1)} aria-label="Previous week"><Pixel rows={GLYPHS.left} size={10} /></button>
		<button class="when" onclick={ontoday} disabled={offset === 0} aria-label="Back to this week">
			{#key week}
				<p in:slot={{ y: 8 * dir, duration: 200 }}>
					<span class="rel">{relativeWeek(offset)}</span>
					<span class="dates">{dateRange(week, addDays(week, 6))}</span>
				</p>
			{/key}
		</button>
		<button class="nav" onclick={() => onweek(1)} aria-label="Next week"><Pixel rows={GLYPHS.right} size={10} /></button>
	</div>

	<ul>
		{#each assignments as a, i (a.chore ? `c${a.chore.id}` : `p${a.person?.id}`)}
			{@const done = isDone(a)}
			<li class:done>
				<button
					class="row"
					disabled={!a.chore}
					aria-pressed={a.chore ? done : undefined}
					aria-label="{a.person?.name ?? 'Nobody'}: {a.chore?.name ?? 'week off'}{done ? ', done' : ''}"
					onclick={() => toggle(a)}
				>
					<span class="who">
						{#key `${week}:${a.person?.id}`}
							<span class="person" in:slot={{ y: 16 * dir, delay: i * 45 }} out:slot={{ y: -16 * dir, duration: 140 }}>
								{#if a.person}
									<Shape shape={a.person.shape} colour={a.person.colour} size={14} />
									<span class="name">{a.person.name}</span>
								{:else}
									<span class="name nobody">nobody</span>
								{/if}
							</span>
						{/key}
					</span>
					<span class="arrow" aria-hidden="true"><span class="shaft"></span><Pixel rows={GLYPHS.right} size={10} /></span>
					<span class="task">{a.chore?.name ?? 'week off'}</span>
					{#if done}<span class="strike" in:draw out:draw={{ duration: 160 }}></span>{/if}
				</button>
				{#if a.away}<p class="away">away {a.away.toLowerCase()}</p>{/if}
			</li>
		{/each}
	</ul>
</div>

<style>
	.weekbar {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 20px;
	}

	.when {
		flex: 1;
		display: grid;
		min-height: 36px;
		align-items: center;
		padding: 0;
		border: 0;
		background: none;
		text-align: center;
		overflow: hidden;
		cursor: pointer;
	}

	.when:disabled {
		cursor: default;
	}

	.when:not(:disabled):hover .dates {
		text-decoration: underline;
		text-decoration-thickness: 2px;
		text-underline-offset: 4px;
	}

	.when p {
		grid-area: 1 / 1;
		margin: 0;
		display: flex;
		justify-content: center;
		gap: 12px;
		font-family: var(--font-head);
		font-size: 14px;
		text-transform: uppercase;
	}

	.rel {
		color: var(--mid);
	}

	.nav {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		border: 0;
		background: none;
		cursor: pointer;
		color: var(--mid);
	}

	.nav:hover {
		color: var(--ink);
	}

	/* One grid for all rows so every arrow starts and ends in the same place. */
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: minmax(0, max-content) minmax(32px, 1fr) minmax(0, max-content);
		column-gap: 14px;
		row-gap: 10px;
	}

	li {
		position: relative;
		grid-column: 1 / -1;
		display: grid;
		grid-template-columns: subgrid;
	}

	.row {
		position: relative;
		grid-column: 1 / -1;
		display: grid;
		grid-template-columns: subgrid;
		align-items: center;
		width: 100%;
		min-height: 60px;
		padding: 8px 4px;
		border: 0;
		background: none;
		text-align: left;
		font-size: 22px;
		cursor: pointer;
	}

	.row:hover:not(:disabled) .arrow {
		color: var(--ink);
	}

	.row:disabled {
		cursor: default;
		color: var(--mid);
	}

	.who {
		display: grid;
		overflow: hidden;
	}

	.person {
		grid-area: 1 / 1;
		display: flex;
		align-items: center;
		gap: 10px;
		white-space: nowrap;
	}

	.name {
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.nobody {
		color: var(--mid);
		font-weight: 400;
	}

	.arrow {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		color: var(--mid);
	}

	.shaft {
		flex: 1;
		height: 2px;
		margin-right: -2px;
		background: currentColor;
	}

	.task {
		text-align: left;
		overflow-wrap: anywhere;
	}

	.done .row {
		color: var(--mid);
	}

	.strike {
		position: absolute;
		left: 0;
		right: 0;
		top: 50%;
		height: 3px;
		margin-top: -1px;
		background: var(--ink);
		pointer-events: none;
	}

	/* Overlaid in the row's bottom padding so it never changes the list's height
	   (which would nudge everything when stepping between weeks). */
	.away {
		position: absolute;
		left: 28px;
		bottom: -4px;
		margin: 0;
		font-size: 13px;
		line-height: 1;
		color: var(--mid);
		pointer-events: none;
	}

	@media (max-width: 420px) {
		ul {
			column-gap: 10px;
		}

		.row {
			font-size: 19px;
		}
	}
</style>
