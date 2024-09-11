import { Env } from './worker';
import { get, setWAEDataset } from './storageCacher';
import { getData } from './fetchers/youtube';

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
		return Response.json({message: "not found"}, {status: 404})
	}
}
