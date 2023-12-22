import { Env } from '../../worker';
import { getKey, v } from './index';
import { get, put } from '../../storageCacher';

export async function getSpecificData(state: DurableObjectState, id: string, env: Env) {
	const LASTFETCH = "api_specific:" + id + ":lastFetch";
	const LASTDATA = "api_specific:" + id + ":data";

	const lastFetch: number = (await get(state, LASTFETCH)) || 0;
	if(Date.now() - lastFetch < 15 * 60e3) {
		return await get(state, LASTDATA);
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

	put(state, LASTDATA, specificData);

	return specificData;
}
