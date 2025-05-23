import { Env } from '../../worker';
import { CHANNEL, v } from './index';
import { SearchResponse, SpecificResponse } from '../../types';
import { get, put } from '../../storageCacher';


let startRetryCount = 0;
let lastMissingStartTimeSend = 0;

let startingSoonCount = 0;

const quickLastFetch: {[id: string]: number} = {};

let lastUpcomingLower = 0;

export async function getSpecificDetails(state: DurableObjectState, env: Env, id: string) {
	const LAST_FETCH = "api_specific_3:" + id + ":lastFetch";
	const LAST_DATA = "api_specific_3:" + id + ":data";

	// The max here is to pick the most recent date: the quick one that's set before the update, or the real one that's set after
	const lastFetch: number = Math.max((await get(state, LAST_FETCH)) || 0, quickLastFetch[id] || 0);

	const cachedValue = await get<SpecificResponse>(state, LAST_DATA);

	let cacheTime = 15 * 60e3;

	if(cachedValue && typeof cachedValue.items === "object") {
		for (let item of cachedValue.items) {
			if(!item.snippet.title.includes("WAN")) continue;
			if(!item.liveStreamingDetails?.actualStartTime) {
				// wtf youtube why do you make me do this
				// if the stream is live but there is no start time, try again in 10 seconds.
				cacheTime = 10e3 + (30e3 * Math.min(startRetryCount++, 30));

				// send an alert if this happens with the data
				if(env.DISCORD_WEBHOOK && Date.now() - lastMissingStartTimeSend > 10e3 && item.snippet.liveBroadcastContent !== "upcoming") { // limit to one message every 10 seconds
					v((async () => {
						if(!env.DISCORD_WEBHOOK) return;

						const formData = new FormData();
						formData.append("payload_json", JSON.stringify(
							{
								content: `Missing actualStartTime (in specific)`
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

			// auto cache expiry if the stream is supposed to be starting soon
			if(item.snippet.liveBroadcastContent === "upcoming" && item.liveStreamingDetails.scheduledStartTime) {
				const scheduled = new Date(item.liveStreamingDetails.scheduledStartTime);
				const timeUntilScheduledStart = scheduled.getTime() - Date.now();
				if(timeUntilScheduledStart < 10e3) {
					let realStartingSoonCount = Math.min(startingSoonCount, 20)
					if(Date.now() - lastUpcomingLower > 10e3) {
						startingSoonCount++;
						realStartingSoonCount = Math.min(startingSoonCount, 20)
						console.log("Stream is supposed to be starting soon! Lowering cache time to " + (10 + realStartingSoonCount))
					}
					cacheTime = 10e3 + (realStartingSoonCount * 1e3);
				} else {
					// only cache for 2 minutes when the stream is upcoming
					cacheTime = 2 * 60e3;
				}
			} else if(item.snippet.liveBroadcastContent === "upcoming") {
				// only cache for 2 minutes when the stream is upcoming
				cacheTime = 2 * 60e3;
			}
		}
	}

	if(Date.now() - lastFetch < cacheTime && cachedValue) {
		if(!cachedValue.items || cachedValue.items.length == 0) {
			console.warn("No cached items for " + id + ": ", JSON.stringify(cachedValue, undefined, '\t'))
			return undefined;
		} else {
			return cachedValue.items[0];
		}
	}

	console.debug("Fetching specifics for " + id)

	quickLastFetch[id] = Date.now();
	const data = await realGetSpecificDetails(env, id);

	v(put(state, LAST_FETCH, Date.now()));
	v(put(state, LAST_DATA, data));

	if(!data?.items || data.items.length == 0) {
		console.warn("Got no items for " + id + ": ", JSON.stringify(data, undefined, '\t'))
		return undefined;
	} else {
		return data.items[0]
	}
}









async function realGetSpecificDetails(env: Env, id: string) {
	if(!env.YOUTUBE_KEY) console.warn("Missing youtube key!");
	return await fetch("https://www.googleapis.com/youtube/v3/videos" +
		"?part=liveStreamingDetails,snippet" +
		"&id=" + id +
		"&maxResults=1" +
		"&order=date" +
		"&type=video" +
		"&eventType=live,upcoming" +
		"&key=" + env.YOUTUBE_KEY
	).then(r => r.json()) as SpecificResponse;
}






export async function getLivestreamIdViaSearchAPI(env: Env) {
	const liveData: SearchResponse = await fetch(
		"https://www.googleapis.com/youtube/v3/search" +
		"?part=snippet,id" +
		"&channelId=" + CHANNEL +
		"&maxResults=50" +
		"&order=date" +
		"&type=video,upcoming" +
		"&eventType=live" +
		"&date=" + Date.now() +
		"&key=" + env.YOUTUBE_KEY
	).then(r => r.json())

	console.debug("Livestream list response has " + liveData?.items?.length + " items");
	if(!liveData?.items?.length) {
		console.log({liveData})
	}

	let wanId = liveData.items.find(v => v.snippet.title.toLowerCase().includes("wan"))?.id.videoId;
	if(wanId) {
		console.debug("Returning wan id", wanId)
		return wanId;
	}

	console.log("Returning first item's id if it exists")

	return liveData.items[0]?.id.videoId;

}
