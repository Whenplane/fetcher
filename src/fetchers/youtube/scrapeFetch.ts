const COUNT_LASTFETCH = "scrape_livecount:last-fetch";
const COUNT_VALUE = "scrape_livecount:count";

export async function getLiveCount(state: DurableObjectState) {
	const lastFetch: number = (await state.storage.get(COUNT_LASTFETCH)) || 0;
	if(Date.now() - lastFetch < 5e3) { // cache for 5 seconds
		return (await state.storage.get(COUNT_VALUE) as number) || 0;
	}
	state.storage.put(COUNT_LASTFETCH, Date.now());

	const pageData = await fetch("https://www.youtube.com/linustechtips/streams").then(r => r.text());

	const liveCount = (pageData.match(/"iconType":"LIVE"/g) || []).length

	state.storage.put(COUNT_VALUE, liveCount);

	return liveCount;
}
