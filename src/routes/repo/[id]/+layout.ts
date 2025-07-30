import type { LayoutLoad } from './$types';
import { error, redirect, isRedirect } from '@sveltejs/kit';
import { getRepoById } from '$lib/services/repository';

export const load: LayoutLoad = async ({ params, url }) => {
	const repoId = params.id;

	if (!repoId) {
		throw error(404, 'Repository ID not found');
	}

	try {
		const repoData = await getRepoById(repoId);

		if (!repoData) {
			throw error(404, 'Repository not found');
		}

		return {
			repo: repoData,
			analysis : repoData.analysisData,
			repoId,
			currentPath: url.pathname
		};
	} catch (err) {
		if (isRedirect(err)) {
			// If it's a redirect error, return to prevent catching it
			return;
		}

		if (err instanceof Error && 'status' in err) {
			// Re-throw SvelteKit errors (redirect, error)
			throw err;
		}

		console.error('Failed to load repository:', err);

		throw error(500, 'Failed to load repository data');
	}
};