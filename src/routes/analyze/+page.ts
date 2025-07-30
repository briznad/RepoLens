import type { PageLoad } from './$types';
import { error } from '@sveltejs/kit';
import { parseGitHubUrl } from '$utilities/github-utils';
import { findOrCreateRepo, getRepoById } from '$services/repository';

export const load: PageLoad = async ({ url }) => {
	const urlParam = url.searchParams.get('url');
	const docIdParam = url.searchParams.get('docId');

	// Check if either url or docId parameter is provided
	if (!urlParam && !docIdParam) {
		throw error(400, 'Missing required parameters. Please provide either "url" or "docId" query parameter.');
	}

	try {
		let repoUrl = '';
		let repoDocId = '';

		if (docIdParam) {
			// If docId is provided, look up the repository document
			const firestoreRepo = await getRepoById(docIdParam);

			if (!firestoreRepo) {
				throw error(404, 'Repository not found in database.');
			}

			repoUrl = firestoreRepo.url;
			repoDocId = docIdParam;

			// Validate the URL from the database
			try {
				parseGitHubUrl(repoUrl);
			} catch (parseErr) {
				throw error(400, 'Invalid repository URL found in database.');
			}
		} else if (urlParam) {
			// If URL is provided, validate and find/create repository
			try {
				parseGitHubUrl(urlParam);
			} catch (parseErr) {
				throw error(400, parseErr instanceof Error ? parseErr.message : 'Invalid GitHub repository URL format.');
			}

			repoUrl = urlParam;

			// Find or create repository document
			try {
				repoDocId = await findOrCreateRepo(repoUrl);
			} catch (createErr) {
				if (createErr instanceof Error) {
					if (createErr.message.includes('Invalid GitHub URL')) {
						throw error(400, 'Invalid repository URL. Please check the URL format and try again.');
					} else if (createErr.message.includes('rate limit')) {
						throw error(429, 'GitHub API rate limit exceeded. Please try again later.');
					} else {
						throw error(500, `Failed to initialize repository: ${createErr.message}`);
					}
				} else {
					throw error(500, 'Failed to initialize repository. Please try again.');
				}
			}
		}

		// Verify the final repository document exists
		const finalRepo = await getRepoById(repoDocId);
		if (!finalRepo) {
			throw error(404, 'Repository document could not be found or created.');
		}

		return {
			repoUrl,
			repoDocId,
			repo: finalRepo
		};
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Handle unexpected errors
		console.error('Unexpected error in analyze page load:', err);
		if (err instanceof Error) {
			if (err.message.includes('network') || err.message.includes('fetch')) {
				throw error(503, 'Network error. Please check your connection and try again.');
			} else if (err.message.includes('permission') || err.message.includes('auth')) {
				throw error(503, 'Database access error. Please try again later.');
			} else {
				throw error(500, `Analysis initialization failed: ${err.message}`);
			}
		} else {
			throw error(500, 'Failed to initialize analysis. Please try again.');
		}
	}
};