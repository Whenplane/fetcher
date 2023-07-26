import { getLiveCount } from './scrapeFetch';
import { Env } from '../../worker';
import { getSpecificData } from './specificData';

const LIST_LASTFETCH = "api_list:lastfetch";
const LIST_VALUE = "api_list:list";
const LASTCOUNT = "lastcount";

export async function getLiveInfo(state: DurableObjectState, env: Env) {

	const liveCount = getLiveCount(state, env);
	const items = await getLiveList(state, env);

	let isWAN;
	let videoId;

	for (const item of items) {
		isWAN = item.snippet.title.includes("WAN");
		videoId = item.id?.videoId
		if(isWAN) break;
	}

	let started;

	if(isWAN) {
		const specificData = await getSpecificData(state, videoId, env);
		started = specificData.items[0].liveStreamingDetails.actualStartTime
	}

	return {
		isWAN,
		videoId,
		isLive: (await liveCount) > 0,
		started
	}
}

export async function getLiveList(state: DurableObjectState, env: Env) {
	const lastFetch: number = (await state.storage.get(LIST_LASTFETCH)) || 0;
	const liveCount = await getLiveCount(state, env);
	const lastCount = await state.storage.get(LASTCOUNT);

	// When there are 2+ livestreams (good chance the latter is WAN), update every 5 minutes. Otherwise, every 10 mins.
	const cacheTime = liveCount > 1 ? (5 * 60e3) : (10 * 60e3);

	if(
		Date.now() - lastFetch < cacheTime &&
		// skip cache if number of livestreams changes (usually happens when WAN starts or ends)
		liveCount == lastCount
	) {
		return await state.storage.get(LIST_VALUE);
	} else if(liveCount != lastCount) {
		// wait 5 seconds before expiring cache to allow Google's cache to calm down
		await state.storage.put(LIST_LASTFETCH, Date.now() - cacheTime - 5e3);
		await state.storage.put(LASTCOUNT, liveCount);
		return await state.storage.get(LIST_VALUE);
	}

	state.storage.put(LIST_LASTFETCH, Date.now());
	state.storage.put(LASTCOUNT, liveCount);

	const liveData = await fetch(
		"https://www.googleapis.com/youtube/v3/search" +
		"?part=snippet" +
		"&channelId=UCXuqSBlHAE6Xw-yeJA0Tunw" +
		"&maxResults=50" +
		"&order=date" +
		"&type=video" +
		"&eventType=live" +
		"&date=" + Date.now() +
		"&key=" + getKey(env)
	).then(r => r.json()) as any;

	const items = liveData?.items;
	if(!items || items.length < 1) {
		console.error("No items in ", JSON.stringify(liveData, null, '\t'));
	}

	state.storage.put(LIST_VALUE, items);
	return items;
}


let keyIndex: number | undefined;

export function getKey(env: Env) {

	const keys = [
		env.YOUTUBE_KEY_DO,
		env.YOUTUBE_KEY,
		env.YOUTUBE_KEY_2,
		env.YOUTUBE_KEY_3
	]
	if(typeof keyIndex == 'undefined') keyIndex = Math.floor(Math.random() * keys.length);

	let key = undefined;
	let i = 0;
	while(key == undefined) {
		keyIndex++;
		if(keyIndex >= keys.length) {
			keyIndex = 0;
		}
		key = keys[keyIndex];
		if(i++ > 50) return undefined;
	}
	return key;
}

// this just exists to stop my IDE from complaining about the promises not being awaited
export function v(p: Promise<any>) {}
