import { CHANNEL, v } from './index';
import { Env } from '../../worker';
import { isNearWan, isNight } from '../../utils';


let lastIdFetch = 0;
let lastId: string | undefined | null;

let lastHadId = 0;
let lastNullCanonical = 0;
let nullCount = 0;

let wEnv: Env;

export async function getLivestreamId(env: Env) {
	wEnv = env;
	const nearWan = isNearWan();
	let cacheTime = nearWan ? 10e3 : 60e3;

	if(!lastId && isNight()) cacheTime = 3 * 60 * 60e3; // only update once every 3 hours at night

	// If they have been live recently, don't update as often
	const wasLiveRecently = Date.now() - lastHadId < 60 * 60e3;
	if(nearWan && wasLiveRecently) {
		cacheTime = Math.max(cacheTime, 60e3);
	}

	if(Date.now() - lastIdFetch < cacheTime) {
		return lastId;
	}

	if(!wasLiveRecently && nearWan && Math.random() < 0.75) {
		// if they have not been live yet, but we are near wan, then 75% chance, check if floatplane is live. If it is, use proxy
		const isFpLive = await fetch("https://fp-proxy.ajg0702.us/channel/linustechtips")
			.then(r => r.json()).then(r => (r as {isLive: boolean}).isLive);
		if(isFpLive || env.DEV) {
			console.log("Fetching canonical from proxy!")
			lastIdFetch = Date.now();
			lastId = await fetch("https://fp-proxy.ajg0702.us/youtube-canonical")
				.then(r => r.json()).then(r => (r as {fetched: number, videoId: string | undefined}).videoId)
			lastIdFetch = Date.now();
			if(lastId) lastHadId = Date.now();
			return lastId;
		}
	}

	// if we've gotten a null canonical (caused by captcha) in the past 10 minutes, hold off on updating
	if(Date.now() - lastNullCanonical < Math.min((10 * 60e3) * nullCount, 3 * 60 * 60e3)) {
		return lastId;
	}



	lastIdFetch = Date.now(); // do this here just in case something requests while below is executing
	const fetchedId = await realGetLivestreamId();
	if(fetchedId !== null || !lastId) {
		lastId = await realGetLivestreamId()
	}
	lastIdFetch = Date.now() + (Math.min(cacheTime, 2 * 60 * 60e3) * Math.random());

	return lastId;
}


async function realGetLivestreamId() {
	console.debug("Requesting livestream id for " + CHANNEL);
	let url = `https://www.youtube.com/channel/${CHANNEL}/live`;
	if(CHANNEL === "UCXuqSBlHAE6Xw-yeJA0Tunw") {
		const random = Math.floor(3 * Math.random());
		// 0 means keep channel id url
		if(random === 1) {
			url = "https://www.youtube.com/@linustechtips/live"
		} else if(random === 2) {
			url = "https://www.youtube.com/linustechtips/live"
		} else if(random === 3) {
			url = "https://www.youtube.com/c/linustechtips/live"
		} else if(random === 4) {
			url = "https://www.youtube.com/user/linustechtips/live"
		}
	}
	const youtubeResponse = await fetch(url, {
		headers: {
			"User-Agent": "Mozilla/5.0 (compatible; Whenplane-fetcher/0.0.0; +https://whenplane.com/fetcher-info)"
		}
	});
	const canonical = await getCanonical(youtubeResponse);

	console.debug("Got canonical", canonical, "for", CHANNEL)

	if(canonical == null) {
		lastNullCanonical = Date.now();
		nullCount++;
		return null;
	} else {
		nullCount = 0;
	}

	// if the canonical for the `/live` page is the channel, then there is no livestream. if its a video link, then there is
	if(!canonical || canonical.includes("/channel/")) {
		return undefined;
	}

	const canonicalURL = new URL(canonical);
	const v = canonicalURL.searchParams.get("v")
	if(!v) {
		console.warn("Canonical is not the channel but doesnt have v!", canonical);
		return undefined;
	}

	lastHadId = Date.now();

	return v;
}


const canonicalRegex = /<link rel="canonical" href="(.*?)">/
async function getCanonical(res: Response) {
	const text = await res.text();

	const matches = canonicalRegex.exec(text);

	if(matches == null) {
		console.warn("matches is null!")
		sendBody(text)
		return null;
	}
	if(matches.length < 2) {
		console.log("Matches is too short!")
		sendBody(text)
		return null;
	}

	return matches[1];
}

function sendBody(body: string) {
	v((async () => {
		if(!wEnv.DISCORD_WEBHOOK) {
			console.warn("missing webhook!");
			return;
		}
		const response = await fetch("https://bytebin.ajg0702.us/post", {
			method: "POST",
			headers: {
				"Content-Type": "text/plain"
			},
			body: body
		});

		if(response.status != 201) {
			console.error("bytebin returned invalid response code!" + await response.text());
			return;
		}


		const json: any = await response.json();

		await fetch(wEnv.DISCORD_WEBHOOK, {
			method: "POST",
			body: JSON.stringify(
				{
					content: "Missing canonical! https://paste.ajg0702.us/" + json.key
				}
			),
			headers: {"content-type": "application/json"}
		})
	})());
}
