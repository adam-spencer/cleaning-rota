<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { onNavigate, refreshAll } from '$app/navigation';
	import { page } from '$app/state';
	import { attachDissolve, dissolveIn, dissolveOut } from '#lib/dissolve.ts';
	import { pop, slot } from '#lib/transitions.ts';
	import { GLYPHS, SHAPES, bitmapPath } from '#lib/icons.ts';
	import { me } from '#lib/me.svelte.ts';
	import { greeting } from '#lib/greeting.ts';
	import { theme } from '#lib/theme.svelte.ts';
	import Pixel from '#lib/components/Pixel.svelte';
	import Shape from '#lib/components/Shape.svelte';
	import Toast from '#lib/components/Toast.svelte';
	import WhoAmI from '#lib/components/WhoAmI.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const favicon = `data:image/svg+xml,${encodeURIComponent(
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 9 9" shape-rendering="crispEdges"><rect x="-1" y="-1" width="9" height="9" fill="#f6f4f0"/><path d="${bitmapPath(SHAPES.diamond)}" fill="#1a1918"/></svg>`
	)}`;

	// The calendar link is only for phones: on wide screens the calendar is on the home page.
	const links = [
		{ href: '/', label: 'rota', narrowOnly: false },
		{ href: '/calendar', label: 'calendar', narrowOnly: true },
		{ href: '/setup', label: 'setup', narrowOnly: false }
	];

	onNavigate((navigation) => {
		// Only dissolve between pages, not when stepping through weeks or months.
		if (!navigation.to || navigation.from?.url.pathname === navigation.to.url.pathname) return;
		return new Promise((resolve) => {
			dissolveOut().then(() => {
				resolve();
				navigation.complete.then(dissolveIn, dissolveIn);
			});
		});
	});

	const themeIcons = { auto: GLYPHS.auto, light: GLYPHS.sun, dark: GLYPHS.moon };
	const themeLabels = { auto: 'Theme: matches system', light: 'Theme: light', dark: 'Theme: dark' };

	onMount(() => {
		me.load();
		theme.load();
		loaded = true;
		now = new Date();
		const clock = setInterval(() => (now = new Date()), 60_000);
		// Phones keep tabs open for days: pick up other people's changes when coming back.
		const refresh = () => document.visibilityState === 'visible' && refreshAll();
		document.addEventListener('visibilitychange', refresh);
		return () => {
			clearInterval(clock);
			document.removeEventListener('visibilitychange', refresh);
		};
	});

	/** The device's clock; only known in the browser, ticked each minute so the greeting keeps up. */
	let now = $state<Date | null>(null);
	const current = $derived(data.people.find((p) => p.id === me.id));
	const heading = $derived(current && now ? greeting(current.name, now) : data.houseName);

	/** Whether this device's saved identity has been read yet (it lives in localStorage). */
	let loaded = $state(false);
	let prompted = false;

	$effect(() => {
		if (!loaded) return;
		// Forget a saved identity if that person has been removed from the house.
		if (me.id != null && !data.people.some((p) => p.id === me.id)) me.set(null);
		// A device that hasn't picked anyone yet is asked straight away (once per visit;
		// if they dismiss it, they'll be asked again when they first change something).
		if (me.id == null && data.people.length && !prompted) {
			prompted = true;
			me.ask();
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<!-- iOS home screen icon: same diamond as the favicon, but iOS needs a PNG. -->
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
	<title>{data.houseName}</title>
</svelte:head>

<header>
	<a class="title" href="/">
		{#key heading}
			<h1 in:slot={{ y: 8, duration: 220 }}>
				{#if current && now}<Shape shape={current.shape} colour={current.colour} size={18} />{/if}
				<span>{heading}</span>
			</h1>
		{/key}
	</a>
	<nav aria-label="Main">
		{#each links as link (link.href)}
			{#if page.url.pathname !== link.href}
				<a href={link.href} class:narrow-only={link.narrowOnly}>{link.label}</a>
			{/if}
		{/each}
		<button class="theme" onclick={() => theme.cycle()} aria-label={themeLabels[theme.current]} title={themeLabels[theme.current]}>
			{#key theme.current}
				<span in:pop><Pixel rows={themeIcons[theme.current]} size={14} /></span>
			{/key}
		</button>
	</nav>
</header>

<main>
	{@render children()}
</main>

<canvas class="dissolve" {@attach attachDissolve} aria-hidden="true"></canvas>
<Toast />
<WhoAmI people={data.people} />

<style>
	header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 16px;
		max-width: 1100px;
		margin: 0 auto;
		padding: 24px 20px 8px;
	}

	.title {
		display: grid;
		min-width: 0;
		text-decoration: none;
		overflow: hidden;
	}

	.title h1 {
		grid-area: 1 / 1;
		display: flex;
		align-items: center;
		gap: 12px;
		text-transform: none;
	}

	h1 {
		font-size: clamp(18px, 5vw, 24px);
		overflow-wrap: anywhere;
	}

	nav {
		display: flex;
		align-items: center;
		gap: 20px;
		flex: none;
	}

	.theme {
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
		margin: -6px -6px -6px 0;
		padding: 0;
		border: 0;
		background: none;
		color: var(--mid);
		cursor: pointer;
	}

	.theme:hover {
		color: var(--ink);
	}

	.theme span {
		display: block;
		line-height: 0;
	}

	nav a {
		font-family: var(--font-head);
		font-size: 15px;
		color: var(--mid);
		text-decoration: none;
	}

	nav a:hover {
		color: var(--ink);
		text-decoration: underline;
		text-decoration-thickness: 2px;
		text-underline-offset: 4px;
	}

	@media (min-width: 900px) {
		.narrow-only {
			display: none;
		}
	}

	main {
		max-width: 1100px;
		margin: 0 auto;
		padding: 24px 20px 80px;
	}

	.dissolve {
		position: fixed;
		top: 0;
		left: 0;
		z-index: 100;
		width: 0;
		height: 0;
		pointer-events: none;
		image-rendering: pixelated;
	}

	/* On phones the greeting gets the full width, with the links on their own row beneath. */
	@media (max-width: 600px) {
		header {
			flex-direction: column;
			align-items: stretch;
			gap: 10px;
		}
	}

	@media (max-width: 480px) {
		header {
			padding: 16px 16px 4px;
		}
		main {
			padding: 20px 16px 64px;
		}
	}
</style>
