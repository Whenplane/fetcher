import { CHANNEL } from './index';


let lastIdFetch = 0;
let lastId: string | undefined;

export async function getLivestreamId() {
	if(Date.now() - lastIdFetch < 5e3) {
		return lastId;
	}

	lastIdFetch = Date.now(); // do this here just in case something requests while below is executing
	lastId = await realGetLivestreamId();
	lastIdFetch = Date.now();

	return lastId;
}


async function realGetLivestreamId() {
	const youtubeResponse = await fetch(`https://www.youtube.com/channel/${CHANNEL}/live`);
	const canonical = await getCanonical(youtubeResponse);

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

	if(matches == null) return null;
	if(matches.length < 2) return null;

	return matches[1];
}
