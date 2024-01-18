
const cache: {
	[key: string]: {
		expires: number,
		value: unknown
	}
} = {};

let waeDataset: AnalyticsEngineDataset | undefined = undefined;

export function setWAEDataset(dataset: AnalyticsEngineDataset) {
	waeDataset = dataset;
}


export async function get<Type>(state: DurableObjectState, key: string) {
	if(Object.keys(cache).includes(key)) {
		const cached = cache[key];
		if(Date.now() < cached.expires) return cached.value as (Type | undefined);
	}

	waeDataset?.writeDataPoint({blobs: ["wheniswan-fetcher", "GET", key, `GET wheniswan-fetcher/${key}`]});
	const value = await state.storage.get<Type>(key);

	cache[key] = {
		value,
		expires: Date.now() + (60 * 60e3) // re-check storage every hour
	}
	return value;
}

const CACHE_TTL = 60 * 60e3; // one hour

export async function put(state: DurableObjectState, key: string, value: unknown) {
	if(JSON.stringify(cache[key].value) === JSON.stringify(value)) {
		cache[key].expires = Date.now() + CACHE_TTL;
		return;
	}
	waeDataset?.writeDataPoint({blobs: ["wheniswan-fetcher", "PUT", key, `PUT wheniswan-fetcher/${key}`]});
	await state.storage.put(key, value);
	cache[key] = {
		value,
		expires: Date.now() + CACHE_TTL // re-check storage every hour
	}
}
