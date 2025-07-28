import multiAdapter from '@macfja/svelte-multi-adapter'
import staticAdapter from '@sveltejs/adapter-static';
import vercelAdapter from '@sveltejs/adapter-vercel';
import preprocess from 'svelte-preprocess';


/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess : preprocess(),
	kit        : {
		adapter : multiAdapter([
			staticAdapter({
				pages : 'dist',
				assets : 'dist',
				fallback : 'index.html',
			}),
			vercelAdapter({}),
		]),
		alias   : {
			// alias "firebase/analytics" to "firebase/ga" as workaround to strange bug
			'firebase/ga'   : './node_modules/firebase/analytics',

			// file path shortcuts
			'$actions'    : './src/lib/actions',
			'$components' : './src/lib/components',
			'$services'   : './src/lib/services',
			'$stores'     : './src/lib/stores',
			'$types'      : './src/lib/types',
			'$utilities'  : './src/lib/utilities',
			'$images'     : './src/lib/images',
		},
	},
};

export default config;
