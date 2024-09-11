import { Env } from '../../worker';
import { getLivestreamId } from './scrape';
import { getSpecificDetails } from './api';


export const CHANNEL = "UCXuqSBlHAE6Xw-yeJA0Tunw"; // linus tech tips
// export const CHANNEL = "UCSJ4gkVC6NrvII8umztf0Ow" // lofi girl (for testing, since they're always live)

export async function getData(state: DurableObjectState, env: Env) {
	const videoId = await getLivestreamId(env);

	let isLive;
	let upcoming;
	let isWAN;
	let started;
	let snippet;
	let scheduledStart;

	let specificData = videoId ? await getSpecificDetails(state, env, videoId) : undefined;

	if(videoId && specificData) {

		const liveStatus = specificData.snippet.liveBroadcastContent;

		isWAN = specificData.snippet.title.includes("WAN");
		upcoming = liveStatus == "upcoming";
		isLive = liveStatus == "live";
		snippet = specificData.snippet;
		started = specificData.liveStreamingDetails.actualStartTime;
		scheduledStart = specificData.liveStreamingDetails.scheduledStartTime;

	} else {
		isLive = false;
		upcoming = false;
	}

	return {
		videoId,
		isLive,
		upcoming,
		isWAN,
		started,
		snippet,
		scheduledStart
	}
}






// this just exists to stop my IDE from complaining about the promises not being awaited
export function v(p: Promise<any>) {}
