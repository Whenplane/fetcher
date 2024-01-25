import { CHANNEL, v } from './index';
import { Env } from '../../worker';
import { get, put } from '../../storageCacher';
import { isNearWan } from "whenplane/src/lib/timeUtils";

const COUNT_LASTFETCH = "scrape_livecount:last-fetch";
const COUNT_VALUE = "scrape_livecount:counts";

export async function getLiveCount(state: DurableObjectState, env: Env): Promise<LiveCountObj> {

	const cache_time = isNearWan() ? 4000 : 60e3;

	const lastFetch: number = (await get(state, COUNT_LASTFETCH)) || 0;

	if(Date.now() - lastFetch < cache_time) { // cache for 4 seconds
		return (await get(state, COUNT_VALUE) as LiveCountObj) || {live: 0, upcoming: 0};
	}
	put(state, COUNT_LASTFETCH, Date.now());

	const pageData = await fetch("https://www.youtube.com/channel/"+CHANNEL+"/streams").then(r => r.text());

	const upcomingCount = (pageData.match(/"upcomingEventData":/g) || []).length
	const liveCount = (pageData.match(/"iconType":"LIVE"/g) || []).length + upcomingCount

	// If the response is invalid, return the cached value
	const isInvalidResponse = pageData.includes("This page checks");
	if(isInvalidResponse) {
		return (await get(state, COUNT_VALUE) as LiveCountObj) || {live: 0, upcoming: 0}
	}

	if(
		liveCount === 0 && env.DISCORD_WEBHOOK &&
		!pageData.includes("LTT TV") && // don't count LTT TV (rip, please bring it back lmg)
		!pageData.includes("WAN") &&
		!pageData.includes("This channel has no videos.") // sometimes the page shows that ltt has no videos for some reason
	) {
		v((async () => {
			if(!env.DISCORD_WEBHOOK) return;
			const response = await fetch("https://bytebin.ajg0702.us/post", {
				method: "POST",
				headers: {
					"Content-Type": "text/plain"
				},
				body: pageData
			});

			if(response.status != 201) {
				console.error("bytebin returned invalid response code!" + await response.text());
				return;
			}

			const json: any = await response.json();

			await fetch(env.DISCORD_WEBHOOK, {
				method: "POST",
				body: JSON.stringify(
					{
						content: "liveCount is zero! https://paste.ajg0702.us/" + json.key
					}
				),
				headers: {"content-type": "application/json"}
			})
		})());
	}

	const obj = {live: liveCount, upcoming: upcomingCount};

	v(put(state, COUNT_VALUE, obj));

	return obj;
}

export type LiveCountObj = {
	live: number,
	upcoming: number
}
