
const cache: {
	[key: string]: {
		expires: number,
		value: unknown
	}
} = {};

export async function get<Type>(state: DurableObjectState, key: string) {
	if(Object.keys(cache).includes(key)) {
		const cached = cache[key];
		if(Date.now() < cached.expires) return cached.value as (Type | undefined);
	}

	const value = await state.storage.get<Type>(key);

	cache[key] = {
		value,
		expires: Date.now() + (60 * 60e3) // re-check storage every hour
	}
	return value;
}

export async function put(state: DurableObjectState, key: string, value: unknown) {
	await state.storage.put(key, value);
	cache[key] = {
		value,
		expires: Date.now() + (60 * 60e3) // re-check storage every hour
	}
}
