// Per-device appearance: 'auto' follows the system setting (the default).
export type Theme = 'auto' | 'light' | 'dark';

const KEY = 'rota.theme';
const ORDER: Theme[] = ['auto', 'light', 'dark'];

class ThemeChoice {
	current = $state<Theme>('auto');

	load() {
		const saved = document.documentElement.dataset.theme;
		this.current = saved === 'light' || saved === 'dark' ? saved : 'auto';
	}

	cycle() {
		this.current = ORDER[(ORDER.indexOf(this.current) + 1) % ORDER.length];
		if (this.current === 'auto') delete document.documentElement.dataset.theme;
		else document.documentElement.dataset.theme = this.current;
		try {
			if (this.current === 'auto') localStorage.removeItem(KEY);
			else localStorage.setItem(KEY, this.current);
		} catch {
			// storage unavailable; the choice just won't persist
		}
	}
}

export const theme = new ThemeChoice();
