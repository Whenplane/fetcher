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
	YOUTUBE_KEY: string
	YOUTUBE_KEY_2?: string
	YOUTUBE_KEY_3?: string
	YOUTUBE_KEY_DO?: string
	DISCORD_WEBHOOK?: string

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

		if(Date.now() - lastRequest < 500) {
			return Response.json({message: "Too many requests! Slow down!"}, {status: 429});
		}

		const youtube = new URL(request.url).searchParams.has("youtube")

		const id = env.WHENISWAN_FETCHER.idFromName(youtube ? "youtube" : "dev");
		const stub = env.WHENISWAN_FETCHER.get(id);
		return stub.fetch(request.url)
	},
};
