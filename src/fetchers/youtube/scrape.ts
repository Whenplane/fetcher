import { CHANNEL, v } from './index';
import { Env } from '../../worker';


let lastIdFetch = 0;
let lastId: string | undefined;

let wEnv: Env;

export async function getLivestreamId(env: Env) {
	wEnv = env;
	if(Date.now() - lastIdFetch < 10e3) {
		return lastId;
	}

	lastIdFetch = Date.now(); // do this here just in case something requests while below is executing
	lastId = await realGetLivestreamId();
	lastIdFetch = Date.now() + (10e3 * Math.random());

	return lastId;
}


async function realGetLivestreamId() {
	console.debug("Requesting livestream id for " + CHANNEL)
	const youtubeResponse = await fetch(`https://www.youtube.com/channel/${CHANNEL}/live?d=` + Date.now(), {
		headers: {
			"User-Agent": "Mozilla/5.0 (compatible; Whenplane-fetcher/0.0.0; +https://whenplane.com/fetcher-info)"
		}
	});
	const canonical = await getCanonical(youtubeResponse);

	console.debug("Got canonical", canonical, "for", CHANNEL)

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
