import { Env } from '../../worker';
import { getKey, v } from './index';
import { get, put } from '../../storageCacher';


let lastMissingStartTimeSend = 0;

export async function getSpecificData(state: DurableObjectState, id: string, env: Env) {
	const LASTFETCH = "api_specific_2:" + id + ":lastFetch";
	const LASTDATA = "api_specific_2:" + id + ":data";

	const lastFetch: number = (await get(state, LASTFETCH)) || 0;

	const cachedValue = await get(state, LASTDATA);

	let cacheTime = 15 * 60e3;

	if(cachedValue) {
		for (let item of cachedValue) {
			if(!item.snippet.title.includes("WAN")) continue;
			// if(item.snippet.liveBroadcastContent !== "live") break;
			if(!item.liveStreamingDetails?.actualStartTime) {
				// wtf youtube why do you make me do this
				cacheTime = 10e3; // if the stream is live but there is no start time, try again in 10 seconds.

				// send an alert if this happens with the data
				if(env.DISCORD_WEBHOOK && Date.now() - lastMissingStartTimeSend > 10e3) { // limit to one message every 10 seconds
					v((async () => {
						if(!env.DISCORD_WEBHOOK) return;

						const formData = new FormData();

						formData.append("payload_json", JSON.stringify(
							{
								content: `Missing actualStartTime`
							}
						));

						formData.append(
							"files[0]",
							new Blob(
								[JSON.stringify(cachedValue, undefined, '\t')],
								{type: 'application/json'}
							),
							"items.json"
						)

						await fetch(env.DISCORD_WEBHOOK, {
							method: "POST",
							body: formData,
						})
						lastMissingStartTimeSend = Date.now();
					})())
				}
			}
		}
	}


	if(Date.now() - lastFetch < cacheTime) {
		return cachedValue;
	}

	v(put(state, LASTFETCH, Date.now()));

	const specificData = await fetch("https://www.googleapis.com/youtube/v3/videos" +
		"?part=liveStreamingDetails,snippet" +
		"&id=" + id +
		"&maxResults=1" +
		"&order=date" +
		"&type=video" +
		"&eventType=live,upcoming" +
		"&key=" + getKey(env)
	).then(r => r.json()) as any;

	console.log("Putting", specificData)
	put(state, LASTDATA, specificData);

	return specificData;
}
