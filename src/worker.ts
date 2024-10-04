/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export { FetcherObject } from './FetcherObject'

export interface Env {
	WHENISWAN_FETCHER: DurableObjectNamespace,
	YOUTUBE_KEY?: string, // currently using the wheniswan4 project
	DISCORD_WEBHOOK?: string,

	DURABLE_STORAGE_ANALYTICS: AnalyticsEngineDataset,

	// set to bypass ip check in dev
	DEV?: string
}

const rateLimit: {
	[key: string]: number
} = {};

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		let connectingIp = request.headers.get('cf-connecting-ip');

		if(!connectingIp && env.DEV) {
			connectingIp = "DEV";
		}

		if(!connectingIp) {
			return Response.json({message: "Missing IP"}, {status: 400});
		}
		const lastRequest = rateLimit[connectingIp] || 0;

		if(Date.now() - lastRequest < 2e3) {
			return Response.json({message: "Too many requests! Slow down!"}, {status: 429});
		}

		const url = new URL(request.url);

		const youtube = url.searchParams.has("youtube") || url.pathname === "/youtube-callback";

		const id = env.WHENISWAN_FETCHER.idFromName(youtube ? "youtube" : "dev");
		const stub = env.WHENISWAN_FETCHER.get(id);
		return stub.fetch(request.url)
	},
	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
		if(event.cron === "0 0 */4 * *") {
			let form = new FormData();

			const formData: {[key: string]: string} = {
				"hub.callback": "https://wheniswan-fetcher.ajg.workers.dev/youtube-callback",
				"hub.topic": "https://www.youtube.com/feeds/videos.xml?channel_id=UCXuqSBlHAE6Xw-yeJA0Tunw",
				"hub.verify": "sync",
				"hub.mode": "subscribe",
				"hub.verify_token": "",
				"hub.secret": "",
				"hub.lease_numbers": "432000"
			}

			for (let formDataKey in formData) {
				form.set(formDataKey, formData[formDataKey]);
			}

			const response = await fetch("https://pubsubhubbub.appspot.com/subscribe", {
				method: "POST",
				body: form
			});

			if(response.ok) {
				console.log("Successfully subscribed!")
			} else {
				console.error("Failed to subscribe!", response.status, response.statusText, await response.text());
			}
		} else {
			console.error("Unknown cron " + event.cron + "!");
		}
	}
};
