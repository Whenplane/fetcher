import { Env } from '../../worker';
import { getKey } from './index';

export async function getSpecificData(state: DurableObjectState, id: string, env: Env) {
	const LASTFETCH = "api_specific:" + id + ":lastFetch";
	const LASTDATA = "api_specific:" + id + ":data";

	const lastFetch: number = (await state.storage.get(LASTFETCH)) || 0;
	if(Date.now() - lastFetch < 15 * 60e3) {
		return await state.storage.get(LASTDATA);
	}

	state.storage.put(LASTFETCH, Date.now());

	const specificData = await fetch("https://www.googleapis.com/youtube/v3/videos" +
		"?part=liveStreamingDetails" +
		"&id=" + id +
		"&maxResults=1" +
		"&order=date" +
		"&type=video" +
		"&eventType=live" +
		"&key=" + getKey(env)
	).then(r => r.json()) as any;

	state.storage.put(LASTDATA, specificData);

	return specificData;
}
