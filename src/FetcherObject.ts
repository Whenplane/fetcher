import { Env } from './worker';
import { get, setWAEDataset } from './storageCacher';
import { getData } from './fetchers/youtube';
import { lastYoutubeCallback } from './fetchers/youtube/scrape';

export class FetcherObject {
	state: DurableObjectState
	env: Env

	constructor(state: DurableObjectState, env: Env) {
		this.state = state;
		this.env = env;

		setWAEDataset(env.DURABLE_STORAGE_ANALYTICS);
	}

	async fetch(request: Request) {
		const url = new URL(request.url);

		if(this.env.DEV && url.pathname === "/testNew") {
			return Response.json(await getData(this.state, this.env))
		}

		if(url.pathname === "/youtube") {
			return Response.json(
				await getData(this.state, this.env)
			)
		}
		if(url.pathname === "/youtube-callback") {
			const body = request.method !== "GET" ? await request.text() : null;
			console.log("Got youtube callback with method of " + request.method + " and body", body);
			if(Date.now() - lastYoutubeCallback.date > 30e3) {
				lastYoutubeCallback.date = Date.now();
			} else {
				console.warn("Ignoring youtube callback due to antispam!");
			}
			return new Response("", {status: 204});
		}
		return Response.json({message: "not found"}, {status: 404})
	}
}
