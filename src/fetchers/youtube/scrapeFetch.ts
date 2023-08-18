import { CHANNEL, v } from './index';
import { Env } from '../../worker';
import { get, put } from '../../storageCacher';

const COUNT_LASTFETCH = "scrape_livecount:last-fetch";
const COUNT_VALUE = "scrape_livecount:count";

export async function getLiveCount(state: DurableObjectState, env: Env) {
	const lastFetch: number = (await get(state, COUNT_LASTFETCH)) || 0;
	if(Date.now() - lastFetch < 4750) { // cache for 5 seconds
		return (await get(state, COUNT_VALUE) as number) || 0;
	}
	put(state, COUNT_LASTFETCH, Date.now());

	const pageData = await fetch("https://www.youtube.com/channel/"+CHANNEL+"/streams").then(r => r.text());

	const liveCount = (pageData.match(/"iconType":"LIVE"/g) || []).length

	// If the response is invalid, return the cached value
	const isInvalidResponse = pageData.includes("This page checks");
	if(isInvalidResponse) {
		return (await get(state, COUNT_VALUE) as number) || 0
	}

	if(liveCount === 0 && env.DISCORD_WEBHOOK) {
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

	v(put(state, COUNT_VALUE, liveCount));

	return liveCount;
}
