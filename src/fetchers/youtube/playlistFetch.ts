import { PlayListResponse } from '../../types';
import { CHANNEL } from './index';
import { Env } from '../../worker';
import { isNearWan } from '../../utils';


let lastFetch = 0;
let lastId: string | null | undefined;

export async function getLivestreamIdViaListAPI(env: Env) {
	const cache_time = isNearWan() && !lastId ? 8e3 : 9.99e3;

	if(Date.now() - lastFetch < cache_time) {
		return lastId;
	}

	lastFetch = Date.now(); // to make sure another one doesnt start fetching while this fetch is in progress
	lastId = await realGetLivestreamIdViaListAPI(env);
	lastFetch = Date.now();
}

export async function realGetLivestreamIdViaListAPI(env: Env) {
	const listData: PlayListResponse = await fetch(
		"https://www.googleapis.com/youtube/v3/playlistItems" +
		"?part=snippet,contentDetails" +
		"&playlistId=" + CHANNEL.replace("UC", "UU") +
		"&maxResults=50" +
		"&order=date" +
		"&date=" + Date.now() +
		"&key=" + env.YOUTUBE_KEY
	).then(r => r.json())

	let videoId = null;
	for (let item of listData.items) {
		if(!item.snippet?.thumbnails.default?.url.includes("_live")) continue;
		videoId = item.contentDetails?.videoId;
	}

	return videoId;
}
