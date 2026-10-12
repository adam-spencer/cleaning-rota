<script lang="ts">
	import { send } from '#lib/api.ts';
	import { dateRange, relativeWeek } from '#lib/format.ts';
	import { GLYPHS } from '#lib/icons.ts';
	import { addDays, daysBetween, type Chore, type Person } from '#lib/rotation.ts';
	import { slot } from '#lib/transitions.ts';
	import Pixel from './Pixel.svelte';
	import Scribble from './Scribble.svelte';
	import Shape from './Shape.svelte';

	interface Assignment {
		chore: Chore | null;
		person: Person | null;
		away: string | null;
		awayDays: number;
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

	/**
	 * Ticks shown immediately while the request is in flight, keyed by week *and* chore:
	 * the same chore in another week must never pick up a pending tick.
	 */
	let optimistic = $state<Record<string, boolean>>({});

	const tickKey = (w: string, choreId: number) => `${w}:${choreId}`;

	// Once the week has changed, scribbles redraw as each week slides in (but not on first load).
	// svelte-ignore state_referenced_locally
	let shownWeek = week;
	let changedWeek = $state(false);
	$effect.pre(() => {
		if (week !== shownWeek) {
			shownWeek = week;
			changedWeek = true;
		}
	});

	/** How a row's scribble appears: drawn in full when ticked, replayed after the names slide in. */
	function drawFor(a: Assignment, i: number) {
		if (a.chore && tickKey(week, a.chore.id) in optimistic) return { delay: 0, duration: 420 };
		if (changedWeek) return { delay: 160 + i * 45, duration: 320 };
		return { delay: 0, duration: 0 };
	}

	const offset = $derived(daysBetween(currentWeek, week) / 7);

	function isDone(a: Assignment): boolean {
		return a.chore ? (optimistic[tickKey(week, a.chore.id)] ?? a.done !== null) : false;
	}

	async function toggle(a: Assignment) {
		if (!a.chore) return;
		const key = tickKey(week, a.chore.id);
		const done = !isDone(a);
		optimistic[key] = done;
		try {
			await send('POST', '/api/completions', { week, chore_id: a.chore.id, person_id: a.person?.id ?? null, done });
		} finally {
			delete optimistic[key];
		}
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
					{#key week}
						{#if a.awayDays >= 4}
							{@const label = a.awayDays === 7 ? 'Away all week' : 'Away most of the week'}
							<span class="bang" title={label} role="img" aria-label={label.toLowerCase()}>
								<Pixel rows={GLYPHS.bang} size={14} />
							</span>
						{/if}
					{/key}
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
					{#key week}
						{#if done}<Scribble key="{week}:{a.chore?.id}" draw={drawFor(a, i)} />{/if}
					{/key}
				</button>
				{#if a.away}<p class="away">away {a.away}</p>{/if}
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

	/* "!" in the margin left of someone who's away most of the week (so their name doesn't
	   move); nudges once to catch the eye. */
	.bang {
		position: absolute;
		left: -12px;
		top: 50%;
		margin-top: -7px;
		line-height: 0;
		animation: nudge 600ms steps(4) 400ms both;
	}

	@keyframes nudge {
		0%,
		100% {
			translate: 0 0;
		}
		25% {
			translate: 0 -3px;
		}
		50% {
			translate: 0 0;
		}
		75% {
			translate: 0 -2px;
		}
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
