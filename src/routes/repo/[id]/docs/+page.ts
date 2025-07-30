import type { PageLoad } from './$types';
import { getRepoById } from '$lib/services/repository';
import { error } from '@sveltejs/kit';

export const load: PageLoad = async ({ params }) => {
  const repoId = params.id;

  try {
    const repo = await getRepoById(repoId);
    
    if (!repo) {
      throw error(404, 'Repository not found');
    }

    return {
      repo,
      analysis: repo.analysisData || null,
      repoId
    };
  } catch (err) {
    if (err instanceof Error && err.message.includes('404')) {
      throw error(404, 'Repository not found');
    }
    throw error(500, 'Failed to load repository');
  }
};