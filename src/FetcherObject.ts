import { Env } from './worker';
import { getLiveInfo, getLiveList } from './fetchers/youtube';
import { getLiveCount } from './fetchers/youtube/scrapeFetch';
import { get } from './storageCacher';

export class FetcherObject {
	state: DurableObjectState
	env: Env

	constructor(state: DurableObjectState, env: Env) {
		this.state = state
		this.env = env
	}

	async fetch(request: Request) {
		const url = new URL(request.url);
		if(url.pathname === "/youtube") {
			return Response.json(
				await getLiveInfo(this.state, this.env)
			)
		} else if(url.pathname === "/liveCount") {
			return Response.json(
				{
					liveCount: await getLiveCount(this.state, this.env),
					lastCount: await get(this.state, "lastcount")
				}
			)
		} else if(url.pathname === "/listList") {
			return Response.json({
				list: await getLiveList(this.state, this.env)
			});
		}
		return Response.json({message: "not found"}, {status: 404})
	}
}
