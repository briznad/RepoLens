export function handleEnterKey(fn : ((event: Event, ...args: Array<unknown>) => void)) : ((this: unknown, event: Event, ...args: unknown[]) => void) {
	return function(this: unknown, ...args) {
		const event : Event = args[0];

		if ((event as KeyboardEvent).key === 'Enter') {
			fn?.apply(this, args);
		}
	};
}

// Alias for backward compatibility
export const HEK = handleEnterKey;
