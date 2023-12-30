import { getLiveCount } from './scrapeFetch';
import { Env } from '../../worker';
import { getSpecificData } from './specificData';
import { get, put } from '../../storageCacher';

export const CHANNEL = "UCXuqSBlHAE6Xw-yeJA0Tunw";

const LIST_LASTFETCH = "api_list:lastfetch";
const LIST_VALUE = "api_list:list";
const LASTCOUNT = "lastcount";

let lastUpcomingSend = 0;

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
	let snippet;

	let upcoming = false;

	if(isWAN) {
		const specificData = await getSpecificData(state, videoId, env);
		if(specificData.items && specificData.items[0]) {
			started = specificData.items[0].liveStreamingDetails?.actualStartTime;
			snippet = specificData.items[0].snippet;
			upcoming = specificData.items[0].snippet?.liveBroadcastContent === "upcoming";
		} else {
			console.log(specificData)
		}
	}

	if(upcoming && env.DISCORD_WEBHOOK && Date.now() - lastUpcomingSend > 10 * 60e3) { // limit to one message every 10 minutes
		v((async () => {
			if(!env.DISCORD_WEBHOOK) return;

			const formData = new FormData();

			formData.append("payload_json", JSON.stringify(
				{
					content: `Stream is upcoming! <t:${(Math.floor(Date.now() / 1e3))}:D> <t:${(Math.floor(Date.now() / 1e3))}:T>`
				}
			));

			formData.append(
				"files[0]",
				new Blob(
					[JSON.stringify(items, undefined, '\t')],
					{type: 'application/json'}
				),
				"items.json"
			)

			await fetch(env.DISCORD_WEBHOOK, {
				method: "POST",
				body: formData,
			})
			lastUpcomingSend = Date.now();
		})())
	}

	return {
		isWAN,
		videoId,
		isLive: ((await liveCount) > 0) && !upcoming,
		started,
		snippet,
		upcoming
	}
}

export async function getLiveList(state: DurableObjectState, env: Env) {
	const lastFetch: number = (await get(state, LIST_LASTFETCH)) || 0;
	const liveCount = await getLiveCount(state, env);
	const lastCount = (await get(state, LASTCOUNT) as number) || 0;

	// When there are 2+ livestreams (good chance the latter is WAN), update every 5 minutes. Otherwise, every 10 mins.
	const cacheTime = (liveCount > 1 || lastCount > 1) ? (5 * 60e3) : (10 * 60e3);

	if(
		Date.now() - lastFetch < cacheTime &&
		// skip cache if number of livestreams changes (usually happens when WAN starts or ends)
		liveCount == lastCount
	) {
		return await get(state, LIST_VALUE);
	} else if(liveCount != lastCount) {
		// wait 5 seconds before expiring cache to allow Google's cache to calm down
		await put(state, LIST_LASTFETCH, Date.now() - cacheTime - 5e3);
		await put(state, LASTCOUNT, liveCount);
		return await get(state, LIST_VALUE);
	}

	v(put(state, LIST_LASTFETCH, Date.now()));
	v(put(state, LASTCOUNT, liveCount));

	const liveData = await fetch(
		"https://www.googleapis.com/youtube/v3/search" +
		"?part=snippet" +
		"&channelId=" + CHANNEL +
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

	if(liveCount != items.length) {
		// if api response doesn't match livecount, retry again in 5 seconds
		await put(state, LIST_LASTFETCH, Date.now() - cacheTime - 5e3);
	}

	put(state, LIST_VALUE, items);
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
