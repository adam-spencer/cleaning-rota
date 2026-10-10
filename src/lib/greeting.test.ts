import { describe, expect, it } from 'vitest';
import { greeting } from './greeting';

const at = (hour: number, day = 10) => new Date(2026, 9, day, hour, 30);

describe('greeting', () => {
	it('matches the time of day', () => {
		expect(greeting('Ana', at(8))).toMatch(/morning|shine/i);
		expect(greeting('Ana', at(14))).toMatch(/afternoon|hey/i);
		expect(greeting('Ana', at(19))).toMatch(/evening|hey there/i);
		expect(greeting('Ana', at(23))).toMatch(/still up|hi|night/i);
		expect(greeting('Ana', at(2))).toMatch(/still up|hi|night/i);
	});

	it('includes the name', () => {
		expect(greeting('Ana', at(8))).toContain('Ana');
	});

	it('stays the same within a part of the day', () => {
		expect(greeting('Ana', at(6))).toBe(greeting('Ana', at(11)));
		expect(greeting('Ana', at(23, 9))).toBe(greeting('Ana', at(2, 10)));
	});
});
