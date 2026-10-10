// "Who are you?" — remembered per device, asked for lazily the first time someone edits.
const KEY = 'rota.me';

class Me {
	id = $state<number | null>(null);
	asking = $state(false);
	#pending: ((id: number | null) => void) | null = null;

	load() {
		try {
			const saved = localStorage.getItem(KEY);
			this.id = saved ? Number(saved) : null;
		} catch {
			// storage unavailable (private mode); just ask each session
		}
	}

	set(id: number | null) {
		this.id = id;
		try {
			if (id == null) localStorage.removeItem(KEY);
			else localStorage.setItem(KEY, String(id));
		} catch {
			// ignore
		}
		this.#settle(id);
	}

	ask(): Promise<number | null> {
		this.#settle(null);
		this.asking = true;
		return new Promise((resolve) => (this.#pending = resolve));
	}

	cancel() {
		this.#settle(null);
	}

	/** The current person, asking first if nobody has been picked on this device. */
	async require(): Promise<number | null> {
		return this.id ?? this.ask();
	}

	#settle(id: number | null) {
		this.asking = false;
		this.#pending?.(id);
		this.#pending = null;
	}
}

export const me = new Me();
