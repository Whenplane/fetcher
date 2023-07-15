import { Env } from './worker';
import { getLiveInfo } from './fetchers/youtube';

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
		}
	}
}
