import fetch from "isomorphic-fetch"
import { ManagerOptions } from "../types/types"
import { Revocation, ApiID } from "fagc-api-types"
import BaseManager from "./BaseManager"
import strictUriEncode from "strict-uri-encode"

export default class RevocationManager extends BaseManager<Revocation> {
	public apikey?: string
	private apiurl: string
	constructor(apiurl: string, apikey?: string, options: ManagerOptions = {}) {
		super(options)
		if (apikey) this.apikey = apikey
		this.apiurl = apiurl
	}
	resolveID(revocationid: ApiID): Revocation|null {
		const cached = this.cache.get(revocationid)
		if (cached) return cached
		return null
	}
	async fetchRevocations(playername: string, communityId: string, cache = true): Promise<Revocation[]> {
		const revocations = await fetch(`${this.apiurl}/revocations/community/${strictUriEncode(playername)}/${strictUriEncode(communityId)}`)
			.then(r=>r.json())
		if (!revocations || !revocations[0]) return null
		if (cache) revocations.forEach((revocation: Revocation) => this.add(revocation))
		return revocations
	}
	async fetchAllRevocations(playername: string, cache = true): Promise<Revocation[]> {
		const revocations = await fetch(`${this.apiurl}/revocations/player/${strictUriEncode(playername)}`)
			.then(r=>r.json())
		if (!revocations || !revocations[0]) return null
		if (cache) revocations.forEach((revocation: Revocation) => this.add(revocation))
		return revocations
	}
}