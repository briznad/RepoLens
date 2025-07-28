import type { Writable, Readable, Unsubscriber } from 'svelte/store';

import { writable, derived } from 'svelte/store';

import { error } from '@sveltejs/kit';


type Repo = {
	id: string;
};


class RepoStore {
	public url : Writable<string>;

	public repo  : Readable<null | Repo>;


	constructor() {
		this.url   = writable('');
		this.repo  = this.initRepo();
	}


	private initRepo() : Readable<null | Repo> {
		return derived(
			[
				this.url,
			],
			(
				[
					$url,
				],
				set : (value : any) => void,
			) : Unsubscriber => {
				let unsubscribe : undefined | (() => void);

				const unsubscriber = () => unsubscribe?.();

				if (!($userId && $code)) {
					set(null);

					return unsubscriber;
				}

				return unsubscriber;
			},
			null,
		);
	}
}

export const repoStore = new RepoStore();
