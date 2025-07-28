// "firebase/ga" is aliased to "firebase/analytics" in svelte.config.js
// because of a mysterious bug that seems prevent importing from any file or path called "analytics"
// I have no idea where this bug is coming from and have found no documentation on it
// or other descriptions online of this issue.
// This aliasing workaround appears to work, but I have no idea why.
import type { Analytics } from 'firebase/ga';

import { getAnalytics, logEvent as log } from 'firebase/ga';

import { firebase } from '$services/firebase';


class GA {
	private gaInstance! : Analytics;


	constructor() {
		//
	}


	init() : void {
		if (this.gaInstance) {
			return;
		}

		this.gaInstance = getAnalytics(firebase.app);
	}

	logEvent(event : string, parameters? : any) : void {
		if (!this.gaInstance) {
			this.init();
		}

		log(this.gaInstance, event, parameters ?? {});
	}
}

export const ga = new GA();
