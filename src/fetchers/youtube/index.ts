import { getLiveCount } from './scrapeFetch';
import { Env } from '../../worker';
import { getSpecificData } from './specificData';

const LIST_LASTFETCH = "api_list:lastfetch";
const LIST_VALUE = "api_list:list";
const LASTCOUNT = "lastcount";

export async function getLiveInfo(state: DurableObjectState, env: Env) {

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
		isLive: items.length > 0,
		started
	}
}

export async function getLiveList(state: DurableObjectState, env: Env) {
	const lastFetch: number = (await state.storage.get(LIST_LASTFETCH)) || 0;
	const liveCount = await getLiveCount(state);
	const lastCount = await state.storage.get(LASTCOUNT);

	if(Date.now() - lastFetch < (20 * 60e3) && liveCount == lastCount) {
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
		"&key=" + env.YOUTUBE_KEY
	).then(r => r.json()) as any;

	const items = liveData?.items;
	if(!items || items.length < 1) {
		console.error("No items in ", JSON.stringify(liveData, null, '\t'));
	}

	state.storage.put(LIST_VALUE, items);
	return items;
}
