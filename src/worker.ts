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
}

const rateLimit: {
	[key: string]: number
} = {};

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const connectingIp = request.headers.get('cf-connecting-ip');
		if(!connectingIp) {
			return Response.json({message: "Missing IP"}, {status: 400});
		}
		const lastRequest = rateLimit[connectingIp] || 0;

		if(Date.now() - lastRequest < 500) {
			return Response.json({message: "Too many requests! Slow down!"}, {status: 429});
		}

		const id = await env.WHENISWAN_FETCHER.idFromName("dev")
		const stub = env.WHENISWAN_FETCHER.get(id);
		return stub.fetch(request.url)
	},
};
