// Pixel bitmaps: '#' = filled, anything else = transparent.

/** Each housemate's marker. 7×7 so they line up with text. */
export const SHAPES = {
	square: ['#######', '#######', '#######', '#######', '#######', '#######', '#######'],
	circle: ['..###..', '.#####.', '#######', '#######', '#######', '.#####.', '..###..'],
	triangle: ['...#...', '..###..', '..###..', '.#####.', '.#####.', '#######', '#######'],
	diamond: ['...#...', '..###..', '.#####.', '#######', '.#####.', '..###..', '...#...'],
	heart: ['.##.##.', '#######', '#######', '#######', '.#####.', '..###..', '...#...'],
	star: ['...#...', '...#...', '#######', '.#####.', '..###..', '.##.##.', '.#...#.'],
	plus: ['..###..', '..###..', '#######', '#######', '#######', '..###..', '..###..'],
	ring: ['..###..', '.#####.', '##...##', '##...##', '##...##', '.#####.', '..###..']
} satisfies Record<string, string[]>;

export type ShapeName = keyof typeof SHAPES;
export const SHAPE_NAMES = Object.keys(SHAPES) as ShapeName[];

/** Housemate colours: saturated enough to read as a thin line on light and dark backgrounds. */
export const PALETTE = ['#e5484d', '#3e63dd', '#30a46c', '#f76b15', '#8e4ec6', '#12a594', '#e93d82', '#d4a600'];

export function isShape(value: unknown): value is ShapeName {
	return typeof value === 'string' && value in SHAPES;
}

export function isColour(value: unknown): value is string {
	return typeof value === 'string' && PALETTE.includes(value);
}

/** The first option nobody is using yet (or cycle round once they're all taken). */
export function firstUnused<T>(options: readonly T[], used: T[]): T {
	return options.find((o) => !used.includes(o)) ?? options[used.length % options.length];
}

// Small UI glyphs.
export const GLYPHS = {
	left: ['....#', '...##', '..###', '.####', '..###', '...##', '....#'],
	right: ['#....', '##...', '###..', '####.', '###..', '##...', '#....'],
	up: ['.......', '...#...', '..###..', '.#####.', '#######', '.......', '.......'],
	down: ['.......', '.......', '#######', '.#####.', '..###..', '...#...', '.......'],
	plus: ['.......', '...#...', '...#...', '#######', '...#...', '...#...', '.......'],
	cross: ['#.....#', '.#...#.', '..#.#..', '...#...', '..#.#..', '.#...#.', '#.....#'],
	auto: ['..###..', '.#..##.', '#...###', '#...###', '#...###', '.#..##.', '..###..'],
	sun: ['...#...', '.#...#.', '..###..', '#.###.#', '..###..', '.#...#.', '...#...'],
	moon: ['..####.', '.###...', '###....', '###....', '###....', '.###...', '..####.']
} satisfies Record<string, string[]>;

/** Bitmap rows → a single SVG path of 1×1 squares (merging horizontal runs). */
export function bitmapPath(rows: string[]): string {
	let d = '';
	rows.forEach((row, y) => {
		for (let x = 0; x < row.length; x++) {
			if (row[x] !== '#') continue;
			let end = x;
			while (row[end + 1] === '#') end++;
			d += `M${x} ${y}h${end - x + 1}v1h${-(end - x + 1)}z`;
			x = end;
		}
	});
	return d;
}
