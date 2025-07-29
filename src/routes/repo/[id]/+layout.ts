import type { LayoutLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
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

		// Check if we have analysis data and if it's fresh
		const analysis = repoData.analysisData;
		let analysisStale = false;
		
		if (analysis && repoData.lastAnalyzed && repoData.githubPushedAt) {
			const lastAnalyzed = new Date(repoData.lastAnalyzed);
			const githubUpdated = new Date(repoData.githubPushedAt);
			analysisStale = githubUpdated > lastAnalyzed;
		}

		// If no analysis or stale analysis, redirect to analyze page
		if (!analysis || (analysisStale && repoData.analysisStatus !== 'analyzing')) {
			throw redirect(302, '/analyze');
		}

		return {
			repo: repoData,
			analysis,
			analysisStale,
			repoId,
			currentPath: url.pathname
		};
	} catch (err) {
		if (err instanceof Error && 'status' in err) {
			// Re-throw SvelteKit errors (redirect, error)
			throw err;
		}
		
		console.error('Failed to load repository:', err);
		throw error(500, 'Failed to load repository data');
	}
};